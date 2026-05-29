import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  IconBubble,
  SectionTitle,
  StatusChip,
  TealSummaryCard,
  NotificationBell,
  UnityLogoLockup,
  UnityPage,
  UnitySimplePage,
  WhiteCard,
  unityStyles,
} from "@/components/unity-ui";
import { formatCurrency } from "@/lib/format";
import { useAppSession } from "@/lib/app-session";
import { getErrorMessage } from "@/lib/errors";
import { mobileData, formatDateLabel, formatTransactionMonthLabel } from "@/lib/mobile-data";
import {
  buildTransactionDayGroups,
  buildTransactionMonthTabs,
  formatTransactionRowDate,
  getCurrentTransactionMonthKey,
} from "@/lib/transaction-history";
import { useResource } from "@/lib/use-resource";
import type { LoanCard, MobileAccountCard } from "@/lib/mobile-models";
import type { AppContentPageKey, TransactionRequest } from "@credit-union/shared";
import { colors, typography } from "@/theme/tokens";

const memberProfileAvatar = require("../../../assets/images/member-profile-avatar.png");
const unityLogoMark = require("../../../assets/images/unity-credit-logo.png");

type TransactionStatusFilter = "all" | "pending" | "approved" | "rejected";
type TransactionTypeFilter = "all" | "deposit" | "saving" | "loanRepayment" | "withdrawal";

const transactionStatusFilters: { key: TransactionStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const transactionTypeFilters: { key: TransactionTypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposit" },
  { key: "saving", label: "Saving" },
  { key: "loanRepayment", label: "Loan" },
  { key: "withdrawal", label: "Withdrawal" },
];

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function currency(amount: number) {
  return formatCurrency(amount);
}

function firstName(name: string) {
  return name.split(" ")[0] || name;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string) {
  const [yearValue, monthValue, dayValue] = value.split("-").map(Number);
  const parsed = new Date(yearValue, monthValue - 1, dayValue);

  return Number.isNaN(parsed.getTime()) ? new Date(1990, 0, 1) : parsed;
}

function formatDateInputValue(value: string) {
  if (!value) {
    return "Select date of birth";
  }

  return formatDateLabel(parseDateInputValue(value), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toStatusLabel(status: TransactionRequest["status"]) {
  const map: Record<TransactionRequest["status"], string> = {
    approved: "Approved",
    draft: "Pending",
    pending_approval: "Pending",
    rejected: "Rejected",
    reversed: "Rejected",
    sync_conflict: "Pending",
    unsynced: "Pending",
  };

  return map[status];
}

function transactionTitle(transaction: Pick<TransactionRequest, "accountType" | "type">) {
  if (transaction.type === "withdrawal") {
    return "Withdrawal";
  }

  if (transaction.type === "loan_repayment") {
    return "Loan";
  }

  return transaction.accountType === "deposit" ? "Deposit" : "Saving";
}

function matchesTransactionTypeFilter(
  transaction: Pick<TransactionRequest, "accountType" | "type">,
  filter: TransactionTypeFilter,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "deposit") {
    return transaction.type === "deposit" && transaction.accountType === "deposit";
  }

  if (filter === "saving") {
    return transaction.type === "deposit" && transaction.accountType === "savings";
  }

  if (filter === "loanRepayment") {
    return transaction.type === "loan_repayment";
  }

  return transaction.type === "withdrawal";
}

function matchesTransactionStatusFilter(
  status: TransactionRequest["status"],
  filter: TransactionStatusFilter,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "pending") {
    return (
      status === "draft" ||
      status === "pending_approval" ||
      status === "sync_conflict" ||
      status === "unsynced"
    );
  }

  if (filter === "approved") {
    return status === "approved";
  }

  return status === "rejected" || status === "reversed";
}

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "muted" {
  const normalized = status.toLowerCase();

  if (normalized.includes("reject") || normalized.includes("failed")) {
    return "danger";
  }

  if (normalized.includes("pending") || normalized.includes("process")) {
    return "warning";
  }

  if (normalized.includes("upcoming")) {
    return "info";
  }

  return "success";
}

function ResourceErrorCard({ message }: { message: string }) {
  return (
    <WhiteCard className="p-5">
      <StatusChip label="Rejected" tone="danger" />
      <Text className="mt-3 text-unity-muted" style={styles.bodyText}>
        {message}
      </Text>
    </WhiteCard>
  );
}

function LoadingStack() {
  return (
    <>
      <WhiteCard className="h-28 p-5">
        <Text className="text-unity-muted" style={styles.bodyText}>Loading...</Text>
      </WhiteCard>
      <WhiteCard className="mt-4 h-28 p-5" />
    </>
  );
}

export function MemberContentPageScreen({
  contentKey,
  fallbackTitle,
}: {
  contentKey: AppContentPageKey;
  fallbackTitle: string;
}) {
  const loader = useMemo(() => () => mobileData.getContentPage(contentKey), [contentKey]);
  const { data, error, loading } = useResource(loader);

  return (
    <UnitySimplePage subtitle="Unity Credit member information." title={data?.title ?? fallbackTitle}>
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !data ? (
        <LoadingStack />
      ) : (
        <WhiteCard className="p-5">
          <MarkdownContent content={data.content} />
          {data.updatedAt ? (
            <Text className="mt-4 text-unity-muted" style={styles.smallText}>
              Updated {formatTransactionRowDate(data.updatedAt)}
            </Text>
          ) : null}
        </WhiteCard>
      )}
    </UnitySimplePage>
  );
}

export function MemberHomeScreen() {
  const { data, error, loading } = useResource(mobileData.getMemberDashboard);
  const {
    data: transactions,
    error: transactionError,
    loading: transactionsLoading,
  } = useResource(mobileData.getMemberTransactions);
  const { data: notifications } = useResource(mobileData.getMemberNotifications);

  if (error) {
    return (
      <UnitySimplePage showBack={false} subtitle="We could not load your dashboard." title="Home">
        <ResourceErrorCard message={error} />
      </UnitySimplePage>
    );
  }

  if (loading || !data) {
    return (
      <UnitySimplePage showBack={false} subtitle="Loading your dashboard." title="Home">
        <LoadingStack />
      </UnitySimplePage>
    );
  }

  const recent = transactions?.slice(0, 4) ?? [];
  const liveRows = recent.map((transaction, index) => ({
    amount: transaction.amount,
    icon: transaction.type === "deposit" ? "download-outline" as const : "arrow-up-outline" as const,
    id: transaction.id,
    meta: formatTransactionRowDate(transaction.createdAt),
    onPress: () => router.push(`/member/transactions/${transaction.id}` as Href),
    status: toStatusLabel(transaction.status),
    title: transactionTitle(transaction),
    tone: (index === 1 ? "blue" : index === 2 ? "purple" : "green") as "blue" | "green" | "purple",
  }));

  const homeRows = [...liveRows].slice(0, 4);

  return (
    <UnityPage
      headerContent={
        <>
          <View className="mt-2">
            <Text className="text-white" style={styles.homeGreetingLabel}>Good morning,</Text>
            <Text className="text-white" style={styles.homeGreetingName}>
              {firstName(data.memberName)} <Text>👋</Text>
            </Text>
            <Text className="mt-1 text-white/90" style={styles.homeGreetingSub}>
              Welcome back! We&apos;re glad to have you.
            </Text>
          </View>
        </>
      }
      headerHeight={248}
      notificationCount={notifications?.length ?? 0}
      onNotificationPress={() => router.push("/member/notifications" as Href)}
    >
      <View style={styles.homeBalanceOverlap}>
        <TealSummaryCard
          amount={currency(data.savingsBalance + data.depositBalance)}
          icon="wallet"
          subtitle={`Available Balance\n${currency(data.availableBalance)}`}
          title="Total Available income"
        />
      </View>

      <WhiteCard className="flex-row items-center justify-between px-3 py-2">
        <MiniMetric
          amount={currency(data.depositBalance)}
          icon="calendar-outline"
          label="Pending Deposits"
          sublabel="2 pending"
          tone="blue"
        />
        <View className="mx-2 h-10 w-px bg-unity-line" />
        <MiniMetric
          amount={currency(data.outstandingLoan)}
          icon="cash-outline"
          label="Active Loan Balance"
          sublabel={data.outstandingLoan > 0 ? data.nextDueLabel : "No active loan"}
          tone="green"
        />
      </WhiteCard>

      <View className="mt-3 flex-row justify-between gap-3">
        <ActionSquare icon="download-outline" label="Deposits" onPress={() => router.push("/member/accounts/deposit" as Href)} tone="blue" />
        <ActionSquare icon="wallet-outline" label="Savings" onPress={() => router.push("/member/accounts/savings" as Href)} tone="purple" />
        <ActionSquare icon="briefcase-outline" label="Loans" onPress={() => router.push("/member/loans" as Href)} tone="green" />
      </View>

      <SectionTitle
        action={
          <Pressable onPress={() => router.push("/member/transactions" as Href)}>
            <Text className="text-unity-blue" style={styles.linkText}>View all</Text>
          </Pressable>
        }
        title="Recent Transactions"
      />
      <WhiteCard>
        {transactionError ? (
          <View className="border-b border-unity-line p-4">
            <Text className="text-unity-muted" style={styles.smallText}>{transactionError}</Text>
          </View>
        ) : null}
        {transactionsLoading || !transactions ? (
          <View className="border-b border-unity-line p-4">
            <Text className="text-unity-muted" style={styles.smallText}>Loading live transactions...</Text>
          </View>
        ) : null}
        {homeRows.map((transaction, index) => (
            <TransactionListRow
              key={transaction.id}
              amount={transaction.amount}
              icon={transaction.icon}
              isLast={index === homeRows.length - 1}
              meta={transaction.meta}
              onPress={"onPress" in transaction ? transaction.onPress : undefined}
              status={transaction.status}
              title={transaction.title}
              tone={transaction.tone}
            />
        ))}
      </WhiteCard>
    </UnityPage>
  );
}

export function MemberAccountTypeScreen({ accountType }: { accountType: "deposit" | "savings" }) {
  const { data: dashboard, error: dashboardError, loading: dashboardLoading } = useResource(mobileData.getMemberDashboard);
  const { data: transactions, error: transactionError, loading: transactionsLoading } = useResource(mobileData.getMemberTransactions);
  const [statusFilter, setStatusFilter] = useState<TransactionStatusFilter>("all");
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [sortDirection, setSortDirection] = useState<"newest" | "oldest">("newest");
  const title = accountType === "deposit" ? "Deposits" : "Savings";
  const amount = accountType === "deposit" ? dashboard?.depositBalance ?? 0 : dashboard?.savingsBalance ?? 0;
  const accountTransactions = useMemo(
    () => (transactions ?? []).filter((transaction) => transaction.accountType === accountType),
    [accountType, transactions],
  );
  const rows = useMemo(
    () =>
      [...accountTransactions]
        .filter((transaction) => matchesTransactionStatusFilter(transaction.status, statusFilter))
        .sort((left, right) => {
          const leftTime = new Date(left.createdAt).getTime();
          const rightTime = new Date(right.createdAt).getTime();

          return sortDirection === "newest" ? rightTime - leftTime : leftTime - rightTime;
        }),
    [accountTransactions, sortDirection, statusFilter],
  );

  return (
    <UnityPage
      headerHeight={250}
      showBack
      subtitle={`Track all your ${accountType === "deposit" ? "savings deposits" : "savings"} and their status.`}
      title={title}
    >
      <View style={styles.accountSummaryOverlap}>
        <TealSummaryCard
          amount={currency(amount)}
          eyebrow={accountType === "deposit" ? "Deposit Summary" : "Saving Summary"}
          footer={
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-white/90" style={styles.balanceFooterLabel}>Total Approved</Text>
                <Text className="mt-1 text-white" style={styles.balanceFooterValue}>{currency(Math.max(amount - 25000, 0))}</Text>
              </View>
              <View className="mx-5 h-12 w-px bg-white/40" />
              <View className="flex-1">
                <Text className="text-white/90" style={styles.balanceFooterLabel}>Pending Approval</Text>
                <Text className="mt-1 text-white" style={styles.balanceFooterValue}>{currency(25000)}</Text>
              </View>
            </View>
          }
          size="large"
          title={accountType === "deposit" ? "Total Deposit" : "Total Saving"}
        />
      </View>

      {dashboardError ? <ResourceErrorCard message={dashboardError} /> : null}
      {dashboardLoading || !dashboard ? <LoadingStack /> : null}
      <View className="mb-4 flex-row flex-wrap gap-1.5">
        {transactionStatusFilters.map((filter) => (
          <FilterChip
            key={filter.key}
            active={filter.key === statusFilter}
            label={filter.label}
            onPress={() => setStatusFilter(filter.key)}
          />
        ))}
        <FilterChip
          active={showFilterOptions || sortDirection === "oldest"}
          icon="options-outline"
          label="Filter"
          onPress={() => setShowFilterOptions((current) => !current)}
        />
      </View>
      {showFilterOptions ? (
        <View className="mb-4 flex-row flex-wrap gap-1.5">
          <FilterChip
            active={sortDirection === "newest"}
            label="Newest First"
            onPress={() => setSortDirection("newest")}
          />
          <FilterChip
            active={sortDirection === "oldest"}
            label="Oldest First"
            onPress={() => setSortDirection("oldest")}
          />
        </View>
      ) : null}
      {transactionError ? (
        <ResourceErrorCard message={transactionError} />
      ) : transactionsLoading || !transactions ? (
        <LoadingStack />
      ) : rows.length === 0 ? (
        <WhiteCard className="p-5">
          <Text className="text-unity-muted" style={styles.bodyText}>
            No {statusFilter === "all" ? title.toLowerCase() : statusFilter} {title.toLowerCase()} are ready yet.
          </Text>
        </WhiteCard>
      ) : (
        rows.map((transaction) => (
          <DepositRow
            key={transaction.id}
            amount={transaction.amount}
            agent={transaction.agentName}
            date={formatTransactionRowDate(transaction.createdAt)}
            onPress={() => router.push(`/member/transactions/${transaction.id}` as Href)}
            status={toStatusLabel(transaction.status)}
            title={transactionTitle(transaction)}
          />
        ))
      )}
      <Text className="mt-4 text-center text-unity-muted" style={styles.bodyText}>
        Showing {rows.length} of {accountTransactions.length} {title.toLowerCase()}
      </Text>
    </UnityPage>
  );
}

export function MemberTransactionsScreen() {
  const { data: transactions, error, loading } = useResource(mobileData.getMemberTransactions);
  const currentMonthKey = useMemo(() => getCurrentTransactionMonthKey(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const filteredTransactions = useMemo(
    () => (transactions ?? []).filter((transaction) => matchesTransactionTypeFilter(transaction, typeFilter)),
    [transactions, typeFilter],
  );
  const monthTabs = useMemo(
    () => buildTransactionMonthTabs(filteredTransactions, currentMonthKey),
    [currentMonthKey, filteredTransactions],
  );
  const selectedMonthLabel = useMemo(
    () => monthTabs.find((tab) => tab.key === selectedMonthKey)?.label ?? formatTransactionMonthLabel(new Date()),
    [monthTabs, selectedMonthKey],
  );
  const dayGroups = useMemo(
    () => buildTransactionDayGroups(filteredTransactions, selectedMonthKey),
    [filteredTransactions, selectedMonthKey],
  );

  return (
    <UnitySimplePage subtitle="Pending and approved activity stays easy to read." title="Transactions">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !transactions ? (
        <LoadingStack />
      ) : (
        <>
          <View className="mb-4 flex-row flex-wrap gap-3">
            {transactionTypeFilters.map((filter) => (
              <FilterChip
                key={filter.key}
                active={filter.key === typeFilter}
                label={filter.label}
                onPress={() => setTypeFilter(filter.key)}
              />
            ))}
          </View>
          <View className="mb-5 flex-row flex-wrap gap-3">
            {monthTabs.map((tab) => (
              <FilterChip
                key={tab.key}
                active={tab.key === selectedMonthKey}
                label={tab.label}
                onPress={() => setSelectedMonthKey(tab.key)}
              />
            ))}
          </View>
          {dayGroups.length === 0 ? (
            <WhiteCard className="p-5">
              <Text className="text-unity-muted" style={styles.bodyText}>No transactions recorded for {selectedMonthLabel} yet.</Text>
            </WhiteCard>
          ) : (
            dayGroups.map((group) => (
              <View key={group.key}>
                <SectionTitle title={group.label} />
                {group.transactions.map((transaction) => (
                  <DepositRow
                    key={transaction.id}
                    amount={transaction.amount}
                    agent={transaction.agentName}
                    date={formatTransactionRowDate(transaction.createdAt)}
                    onPress={() => router.push(`/member/transactions/${transaction.id}` as Href)}
                    status={toStatusLabel(transaction.status)}
                    title={transactionTitle(transaction)}
                  />
                ))}
              </View>
            ))
          )}
        </>
      )}
    </UnitySimplePage>
  );
}

export function MemberLoansScreen() {
  const { data: loans, error, loading } = useResource(mobileData.getLoans);

  return (
    <UnityPage headerHeight={286} subtitle="Access, manage and repay your loans." title="Loans">
      <Text className="mb-3 text-unity-ink" style={styles.sectionHeading}>Your Active Loan</Text>
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !loans ? (
        <LoadingStack />
      ) : loans.length === 0 ? (
        <WhiteCard className="p-5">
          <Text className="text-unity-muted" style={styles.bodyText}>No active loans are ready yet.</Text>
        </WhiteCard>
      ) : (
        <LoanOverview loan={loans[0]} onPress={() => router.push(`/member/loans/${loans[0].id}` as Href)} />
      )}
    </UnityPage>
  );
}

export function MemberAccountsScreen() {
  const { data: accounts, error, loading } = useResource(mobileData.getMemberAccounts);

  return (
    <UnitySimplePage subtitle="Savings and deposit statements stay separated." title="Accounts">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !accounts ? (
        <LoadingStack />
      ) : accounts.length === 0 ? (
        <WhiteCard className="p-5">
          <Text className="text-unity-muted" style={styles.bodyText}>No active accounts are ready for this member yet.</Text>
        </WhiteCard>
      ) : (
        accounts.map((account) => <AccountCard key={account.id} account={account} />)
      )}
    </UnitySimplePage>
  );
}

export function MemberAccountStatementScreen() {
  const params = useLocalSearchParams<{ accountId?: string | string[] }>();
  const accountId = getSingleParam(params.accountId) ?? "";
  const loader = useMemo(() => () => mobileData.getMemberAccountStatement(accountId), [accountId]);
  const { data, error, loading } = useResource(loader);

  return (
    <UnitySimplePage subtitle="Approved and pending movements for this account." title="Statement">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <LoadingStack />
      ) : !data ? (
        <ResourceErrorCard message="No account statement matches this route." />
      ) : (
        <>
          <TealSummaryCard amount={currency(data.account.balance)} subtitle={data.account.accountNumber} title={`${data.account.accountType.toUpperCase()} Account`} />
          <View className="mt-5">
            {data.transactions.map((transaction) => (
              <DepositRow
                key={transaction.id}
                amount={transaction.amount}
                agent={transaction.agentName}
                date={formatTransactionRowDate(transaction.createdAt)}
                onPress={() => router.push(`/member/transactions/${transaction.id}` as Href)}
                status={toStatusLabel(transaction.status)}
                title={transactionTitle(transaction)}
              />
            ))}
          </View>
        </>
      )}
    </UnitySimplePage>
  );
}

export function MemberTransactionDetailScreen() {
  const params = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const transactionId = getSingleParam(params.transactionId) ?? "";
  const loader = useMemo(() => () => mobileData.getMemberTransactionDetail(transactionId), [transactionId]);
  const { data: transaction, error, loading } = useResource(loader);

  return (
    <UnitySimplePage subtitle="Every account movement shows its approval state." title="Transaction">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <LoadingStack />
      ) : !transaction ? (
        <ResourceErrorCard message="No transaction matches this route for the signed-in member." />
      ) : (
        <>
          <TealSummaryCard amount={currency(transaction.amount)} subtitle={transaction.accountType.toUpperCase()} title={transactionTitle(transaction)} />
          <WhiteCard className="mt-5 p-5">
            <DetailLine label="Member" value={transaction.memberName} />
            <DetailLine label="Agent" value={transaction.agentName} />
            <DetailLine label="Branch" value={transaction.branchName} />
            <DetailLine label="Date" value={formatTransactionRowDate(transaction.createdAt)} />
            <DetailLine label="Reference" value={transaction.id.slice(0, 12).toUpperCase()} />
          </WhiteCard>
          {transaction.note ? (
            <WhiteCard className="mt-4 p-5">
              <Text className="text-unity-muted" style={styles.bodyText}>{transaction.note}</Text>
            </WhiteCard>
          ) : null}
        </>
      )}
    </UnitySimplePage>
  );
}

export function MemberLoanDetailScreen() {
  const params = useLocalSearchParams<{ loanId?: string | string[] }>();
  const loanId = getSingleParam(params.loanId) ?? "";
  const loader = useMemo(() => () => mobileData.getMemberLoanDetail(loanId), [loanId]);
  const { data: loan, error, loading } = useResource(loader);

  return (
    <UnitySimplePage subtitle="Loan principal, timeline, and repayment history." title="Loan Detail">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <LoadingStack />
      ) : !loan ? (
        <ResourceErrorCard message="No loan matches this route for the signed-in member." />
      ) : (
        <LoanOverview loan={loan} />
      )}
    </UnitySimplePage>
  );
}

export function MemberNotificationsScreen() {
  const { data: notifications, error, loading } = useResource(mobileData.getMemberNotifications);

  useEffect(() => {
    if (!notifications?.length) {
      return;
    }

    void mobileData.markMemberNotificationsSeen(notifications.map((item) => item.id));
  }, [notifications]);

  return (
    <UnitySimplePage subtitle="Account, loan, and approval activity in one place." title="Notifications">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !notifications ? (
        <LoadingStack />
      ) : notifications.length === 0 ? (
        <WhiteCard className="p-5">
          <Text className="text-unity-muted" style={styles.bodyText}>No member notifications are waiting right now.</Text>
        </WhiteCard>
      ) : (
        notifications.map((item) => (
          <WhiteCard key={item.id} className="mb-4 p-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-unity-ink" style={styles.cardTitle}>{item.title}</Text>
                <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{item.subtitle}</Text>
              </View>
              {item.amount ? <Text className="text-unity-green" style={styles.amountSmall}>{currency(item.amount)}</Text> : null}
            </View>
            <View className="mt-4 flex-row items-center justify-between">
              <StatusChip label={item.status} tone={statusTone(item.status)} />
              <Text className="text-unity-muted" style={styles.smallText}>{formatTransactionRowDate(item.createdAt)}</Text>
            </View>
          </WhiteCard>
        ))
      )}
    </UnitySimplePage>
  );
}

export function MemberMoreScreen() {
  const { signOut } = useAppSession();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.memberProfileScreen}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0057D8", "#003586"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.memberProfileHeader}
      >
        <Image resizeMode="contain" source={unityLogoMark} style={styles.memberProfileWatermark} />
        <Image resizeMode="contain" source={unityLogoMark} style={styles.memberProfileWatermarkSmall} />
        <View style={[styles.memberProfileTopBar, { paddingTop: insets.top + 10 }]}>
          <View style={styles.memberProfileTopSlot} />
          <UnityLogoLockup compact />
          <View style={styles.memberProfileTopSlot}>
            <NotificationBell />
          </View>
        </View>
        <View style={styles.memberProfileTitleBlock}>
          <Text style={styles.memberProfileTitle}>My Profile</Text>
          <Text style={styles.memberProfileSubtitle}>Manage your account and preferences</Text>
        </View>
      </LinearGradient>

      <View style={styles.memberProfileWhitePanel} />

      <ScrollView
        contentContainerStyle={[
          styles.memberProfileScrollContent,
          { paddingBottom: 116 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.memberIdentityCard}>
          <View style={styles.memberIdentityRow}>
            <Image resizeMode="cover" source={memberProfileAvatar} style={styles.memberAvatar} />
            <View style={styles.memberIdentityCopy}>
              <Text style={styles.memberIdentityName}>Chidinma Okafor</Text>
              <View style={styles.memberIdRow}>
                <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.memberIdText}>Member ID: UCRD-00078593</Text>
                <Ionicons color={colors.brand} name="copy-outline" size={18} />
              </View>
              <ProfileMeta icon="home-outline" text="Main Branch, Lagos" />
              <ProfileMeta icon="call-outline" text="+234 810 234 5678" />
              <ProfileMeta icon="location-outline" text="23 Adeola Odeku St, Victoria Island, Lagos, Nigeria" />
            </View>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons color={colors.success} name="checkmark-circle" size={18} />
            <Text style={styles.verifiedBadgeText}>Verified Member</Text>
          </View>
        </View>

        <SettingsSection
          rows={[
            ["person-outline", "Personal Information", () => router.push("/member/more/profile" as Href), "blue"],
            ["card-outline", "Account Overview", () => router.push("/member/accounts" as Href), "blue"],
          ]}
          title="Account Details"
        />
        <SettingsSection
          rows={[
            ["people-outline", "Next of Kin Information", () => router.push("/member/more/profile" as Href), "green"],
            ["shield-checkmark-outline", "Dependents", () => router.push("/member/more/profile" as Href), "green"],
          ]}
          title="Next of Kin"
        />
        <SettingsSection
          rows={[
            ["lock-closed-outline", "Change PIN", () => router.push("/member/change-password" as Href), "purple"],
            ["finger-print-outline", "Biometric Login", undefined, "purple", true],
            ["desktop-outline", "Active Sessions", () => router.push("/member/change-password" as Href), "purple"],
          ]}
          title="Security Settings"
        />
        <SettingsSection
          rows={[
            ["notifications-outline", "Notification Settings", () => router.push("/member/notifications" as Href), "orange"],
            ["color-palette-outline", "Theme", () => router.push("/member/more/profile" as Href), "orange", false, "System Default"],
          ]}
          title="App Preferences"
        />
        <Pressable onPress={() => void signOut()} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          <Text className="text-unity-red" style={styles.buttonText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function MemberProfileScreen() {
  const { data: profile, error, loading } = useResource(mobileData.getMemberProfile);
  const [currentProfile, setCurrentProfile] = useState<typeof profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [nextOfKinAddress, setNextOfKinAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setCurrentProfile(profile);
    setFullName(profile.fullName);
    setPhone(profile.phone);
    setDateOfBirth(profile.dateOfBirth ?? "");
    setGender(profile.gender ?? "");
    setOccupation(profile.occupation ?? "");
    setResidentialAddress(profile.address ?? "");
    setNextOfKinName(profile.nextOfKinName ?? "");
    setNextOfKinPhone(profile.nextOfKinPhone ?? "");
    setNextOfKinAddress(profile.nextOfKinAddress ?? "");
  }, [profile]);

  if (error) {
    return (
      <UnitySimplePage subtitle="We could not load your member profile." title="Profile">
        <ResourceErrorCard message={error} />
      </UnitySimplePage>
    );
  }

  if (loading || !profile) {
    return (
      <UnitySimplePage subtitle="Loading member profile." title="Profile">
        <LoadingStack />
      </UnitySimplePage>
    );
  }

  const activeProfile = currentProfile ?? profile;

  return (
    <UnitySimplePage subtitle="Complete the rest of your member record here after onboarding." title="Personal Information">
      <WhiteCard className="p-5">
        <Text className="text-unity-ink" style={styles.cardTitle}>{activeProfile.fullName}</Text>
        <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{activeProfile.code}</Text>
        <DetailLine label="Phone" value={activeProfile.phone} />
        <DetailLine label="ID Card" value={activeProfile.idNumber ?? "Pending"} />
        <DetailLine label="Agent" value={activeProfile.agentName} />
      </WhiteCard>
      <View className="mt-5">
        <FormInput label="Full Name" onChangeText={setFullName} value={fullName} />
        <FormInput label="Phone" onChangeText={setPhone} value={phone} />
        <DateOfBirthPicker onChange={setDateOfBirth} value={dateOfBirth} />
        <FormInput label="Gender" onChangeText={setGender} value={gender} />
        <FormInput label="Occupation" onChangeText={setOccupation} value={occupation} />
        <FormInput label="Residential Address" multiline onChangeText={setResidentialAddress} value={residentialAddress} />
        <FormInput label="Next Of Kin Name" onChangeText={setNextOfKinName} value={nextOfKinName} />
        <FormInput label="Next Of Kin Phone" onChangeText={setNextOfKinPhone} value={nextOfKinPhone} />
        <FormInput label="Next Of Kin Address" multiline onChangeText={setNextOfKinAddress} value={nextOfKinAddress} />
      </View>
      {successMessage ? (
        <WhiteCard className="mb-4 p-5">
          <StatusChip label="Approved" tone="success" />
          <Text className="mt-3 text-unity-muted" style={styles.bodyText}>{successMessage}</Text>
        </WhiteCard>
      ) : null}
      {submissionError ? <ResourceErrorCard message={submissionError} /> : null}
      <PrimaryGradientButton
        label={isSubmitting ? "Saving Profile..." : "Save Profile"}
        onPress={() => {
          if (isSubmitting) {
            return;
          }

          setSubmissionError(null);
          setSuccessMessage(null);
          setIsSubmitting(true);

          void mobileData
            .updateMemberProfile({
              dateOfBirth,
              fullName,
              gender,
              nextOfKinAddress,
              nextOfKinName,
              nextOfKinPhone,
              occupation,
              phone,
              residentialAddress,
            })
            .then((updatedProfile) => {
              setCurrentProfile(updatedProfile);
              setSuccessMessage("Your profile details were saved.");
            })
            .catch((nextError) => {
              setSubmissionError(getErrorMessage(nextError, "We could not update your profile."));
            })
            .finally(() => {
              setIsSubmitting(false);
            });
        }}
      />
    </UnitySimplePage>
  );
}

export function MemberChangePasswordScreen() {
  const { refreshProfile } = useAppSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <UnitySimplePage subtitle="Update your secure PIN and password." title="Change PIN">
      <FormInput label="Current Password" onChangeText={setCurrentPassword} secureTextEntry value={currentPassword} />
      <FormInput label="New Password" onChangeText={setNewPassword} secureTextEntry value={newPassword} />
      <FormInput label="Confirm New Password" onChangeText={setConfirmPassword} secureTextEntry value={confirmPassword} />
      {submissionError ? <ResourceErrorCard message={submissionError} /> : null}
      {successMessage ? (
        <WhiteCard className="mb-4 p-5">
          <StatusChip label="Approved" tone="success" />
          <Text className="mt-3 text-unity-muted" style={styles.bodyText}>{successMessage}</Text>
        </WhiteCard>
      ) : null}
      <PrimaryGradientButton
        label={isSubmitting ? "Updating Password..." : "Update Password"}
        onPress={() => {
          if (isSubmitting) {
            return;
          }

          if (newPassword.trim() !== confirmPassword.trim()) {
            setSubmissionError("Your new password and confirmation must match.");
            return;
          }

          setIsSubmitting(true);
          setSubmissionError(null);
          setSuccessMessage(null);

          void mobileData
            .changeMemberPassword({
              currentPassword,
              newPassword,
            })
            .then(async () => {
              await refreshProfile();
              setSuccessMessage("Password updated. Redirecting to your member workspace.");
              router.replace("/member");
            })
            .catch((nextError) => {
              setSubmissionError(getErrorMessage(nextError, "We could not update your password."));
            })
            .finally(() => {
              setIsSubmitting(false);
            });
        }}
      />
    </UnitySimplePage>
  );
}

function MiniMetric({
  amount,
  icon,
  label,
  sublabel,
  tone,
}: {
  amount: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  tone: "blue" | "green";
}) {
  return (
    <View className="flex-1 flex-row items-center">
      <IconBubble icon={icon} size={32} tone={tone} />
      <View className="ml-2 flex-1">
        <Text className="text-unity-ink" numberOfLines={2} style={styles.metricLabel}>{label}</Text>
        <Text adjustsFontSizeToFit numberOfLines={1} className={tone === "blue" ? "text-unity-blue" : "text-unity-green"} style={styles.metricAmount}>
          {amount}
        </Text>
        <Text className="text-unity-muted" style={styles.bodyText}>{sublabel}</Text>
      </View>
    </View>
  );
}

function ActionSquare({
  icon,
  label,
  onPress,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: "blue" | "green" | "purple" | "orange";
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionSquare, unityStyles.cardShadow, pressed && styles.pressed]}>
      <IconBubble icon={icon} size={34} tone={tone === "orange" ? "orange" : tone} />
      <Text className="mt-2 text-center text-unity-ink" numberOfLines={1} adjustsFontSizeToFit style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function TransactionListRow({
  amount,
  icon,
  isLast,
  meta,
  onPress,
  status,
  title,
  tone,
}: {
  amount: number;
  icon: keyof typeof Ionicons.glyphMap;
  isLast?: boolean;
  meta: string;
  onPress?: () => void;
  status: string;
  title: string;
  tone: "blue" | "green" | "purple";
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <View className={`flex-row items-center px-4 py-2 ${isLast ? "" : "border-b border-unity-line"}`}>
        <IconBubble icon={icon} size={36} tone={tone} />
        <View className="ml-3 flex-1">
          <Text className="text-unity-ink" style={styles.rowTitle}>{title}</Text>
          <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{meta}</Text>
        </View>
        <View className="items-end">
          <Text className={amount >= 0 ? "text-unity-green" : "text-unity-ink"} style={styles.amountSmall}>
            {amount >= 0 ? "+ " : "- "}{currency(Math.abs(amount))}
          </Text>
          <View className="mt-1">
            <StatusChip label={status} tone={statusTone(status)} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function FilterChip({
  active = false,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Ionicons color={active ? colors.white : colors.ink} name={icon} size={14} /> : null}
      <Text className={active ? "text-white" : "text-unity-ink"} style={styles.filterText}>{label}</Text>
    </Pressable>
  );
}

function DepositRow({
  amount,
  agent,
  date,
  onPress,
  status,
  title,
}: {
  amount: number;
  agent?: string;
  date: string;
  onPress: () => void;
  status: string;
  title: string;
}) {
  const tone = statusTone(status);
  const icon = tone === "warning" ? "time-outline" : tone === "danger" ? "close-circle-outline" : "checkmark-outline";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.depositCard, unityStyles.cardShadow, pressed && styles.pressed]}>
      <IconBubble icon={icon} size={38} tone={tone === "danger" ? "red" : tone === "warning" ? "orange" : "green"} />
      <View className="ml-3 flex-1">
        <Text className="text-unity-ink" style={styles.rowTitle}>{title}</Text>
        <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{date}</Text>
        {agent ? (
          <Text className="mt-1 text-unity-muted" style={styles.bodyText}>
            Agent: <Text className="text-unity-blue" style={styles.mediumInline}>{agent}</Text>
          </Text>
        ) : null}
      </View>
      <View className="items-end">
        <Text className={tone === "danger" ? "text-unity-red" : tone === "warning" ? "text-unity-blue" : "text-unity-green"} style={styles.amountSmall}>
          + {currency(amount)}
        </Text>
        <View className="mt-2">
          <StatusChip label={status} tone={tone} />
        </View>
      </View>
      <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

function LoanOverview({ loan, onPress }: { loan: LoanCard; onPress?: () => void }) {
  const [showAllPayments, setShowAllPayments] = useState(false);
  const paid = Math.max(loan.approvedPrincipal - loan.remainingPrincipal, 0);
  const progress = loan.approvedPrincipal > 0 ? Math.min(paid / loan.approvedPrincipal, 1) : 0;
  const nextPaymentAmount = loan.nextInterestDue;
  const statusTone = loan.isOverdue ? "red" : "green";
  const statusTitle = loan.isOverdue ? "Payment Overdue" : "On Track";
  const statusCopy = loan.isOverdue
    ? `Your payment due ${loan.nextDueLabel} needs attention.`
    : "You're keeping up with your repayments.";
  const paymentHistoryRows = loan.recentPayments.map((payment, index) => ({
    id: payment.id,
    amount: payment.principalPaid || payment.interestPaid,
    dateLabel: payment.dateLabel,
    label: `Payment ${index + 1}`,
    tone: "success",
    status: "Paid",
  }));
  const visiblePaymentHistoryRows = showAllPayments
    ? paymentHistoryRows
    : paymentHistoryRows.slice(0, 4);
  const hiddenPaymentCount = Math.max(paymentHistoryRows.length - visiblePaymentHistoryRows.length, 0);
  const repaymentScheduleRows = [
    {
      id: `${loan.id}-next-payment`,
      amount: nextPaymentAmount,
      dateLabel: loan.nextDueLabel,
      label: loan.isOverdue ? "Overdue payment" : "Next payment",
      tone: loan.isOverdue ? "danger" : "info",
      status: loan.isOverdue ? "Overdue" : "Upcoming",
    },
    ...visiblePaymentHistoryRows,
  ];

  return (
    <>
      <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        <LinearGradient
          colors={["#10C7BE", "#00B99F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loanCard}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-white" style={styles.loanTitle}>Personal Loan</Text>
              <View className="ml-2 rounded-lg bg-white/20 px-2 py-1">
                <Text className="text-white" style={styles.bodyText}>{loan.statusLabel}</Text>
              </View>
            </View>
            <Text className="text-white/90" style={styles.bodyText}>Loan ID: {loan.loanCode}</Text>
          </View>
          <View className="mt-5 flex-row">
            <View className="flex-1">
              <Text className="text-white/85" style={styles.balanceFooterLabel}>Total Borrowed</Text>
              <Text className="mt-1 text-white" style={styles.loanAmount}>{currency(loan.approvedPrincipal)}</Text>
            </View>
            <View className="mx-4 w-px bg-white/35" />
            <View className="flex-1">
              <Text className="text-white/85" style={styles.balanceFooterLabel}>Outstanding Balance</Text>
              <Text className="mt-1 text-white" style={styles.loanAmount}>{currency(loan.remainingPrincipal)}</Text>
            </View>
          </View>
          <View className="my-4 h-px bg-white/30" />
          <View className="flex-row">
            <View className="flex-1 flex-row items-center">
              <Ionicons color={colors.white} name="calendar-outline" size={19} />
              <View className="ml-3">
                <Text className="text-white/85" style={styles.bodyText}>
                  {loan.isOverdue ? "Payment Overdue Since" : "Next Payment Due"}
                </Text>
                <Text className="mt-1 text-white" style={styles.loanTitle}>{loan.nextDueLabel}</Text>
              </View>
            </View>
            <View className="mx-4 w-px bg-white/30" />
            <View className="flex-1">
              <Text className="text-white/85" style={styles.bodyText}>Next Interest Due</Text>
              <Text className="mt-1 text-white" style={styles.loanTitle}>{currency(nextPaymentAmount)}</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
      <WhiteCard className="mt-4 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-unity-ink" style={styles.cardTitle}>Repayment Progress</Text>
          <Text className="text-unity-green" style={styles.cardTitle}>{Math.round(progress * 100)}% Paid</Text>
        </View>
        <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <View className="h-full rounded-full bg-unity-green" style={{ width: `${progress * 100}%` }} />
        </View>
        <View className="mt-3 flex-row justify-between">
          <Text className="text-unity-green" style={styles.bodyText}>{currency(paid)} Paid</Text>
          <Text className="text-unity-muted" style={styles.bodyText}>{currency(loan.approvedPrincipal)} Total</Text>
        </View>
      </WhiteCard>
      <WhiteCard className="mt-4 flex-row items-center p-4">
        <IconBubble icon={loan.isOverdue ? "alert-circle-outline" : "trending-up-outline"} size={58} tone={statusTone} />
        <View className="ml-4 flex-1">
          <Text className="text-unity-ink" style={styles.bodyText}>Loan Status</Text>
          <Text className={loan.isOverdue ? "mt-1 text-unity-red" : "mt-1 text-unity-green"} style={styles.statusTitle}>{statusTitle}</Text>
          <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{statusCopy}</Text>
        </View>
        <Ionicons color={colors.brand} name="chevron-forward" size={22} />
      </WhiteCard>
      <SectionTitle
        action={<Text className="text-unity-blue" style={styles.linkText}>View full schedule</Text>}
        title="Repayment Schedule"
      />
      <WhiteCard>
        {repaymentScheduleRows.map((payment, index) => (
          <View
            key={payment.id}
            className={`flex-row items-center px-4 py-3 ${
              index === repaymentScheduleRows.length - 1 && hiddenPaymentCount === 0 ? "" : "border-b border-unity-line"
            }`}
          >
            <IconBubble icon={payment.status === "Paid" ? "checkmark" : "calendar-outline"} size={36} tone={payment.tone === "danger" ? "red" : payment.tone === "success" ? "green" : "blue"} />
            <View className="ml-3 flex-1">
              <Text className="text-unity-ink" style={styles.rowTitle}>{payment.label}</Text>
              <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{payment.dateLabel}</Text>
            </View>
            <Text className="mr-3 text-unity-ink" style={styles.amountSmall}>{currency(payment.amount)}</Text>
            <StatusChip label={payment.status} tone={payment.tone as "success" | "danger" | "info"} />
          </View>
        ))}
        {hiddenPaymentCount > 0 || showAllPayments ? (
          <Pressable
            onPress={() => setShowAllPayments((current) => !current)}
            style={({ pressed }) => [styles.paymentToggle, pressed && styles.pressed]}
          >
            <Text className="text-unity-blue" style={styles.linkText}>
              {showAllPayments
                ? "Show less payments⌃"
                : `${hiddenPaymentCount} more payment${hiddenPaymentCount === 1 ? "" : "s"}⌄`}
            </Text>
          </Pressable>
        ) : null}
      </WhiteCard>
    </>
  );
}

function AccountCard({ account }: { account: MobileAccountCard }) {
  return (
    <Pressable onPress={() => router.push(`/member/accounts/${account.id}` as Href)} style={({ pressed }) => [pressed && styles.pressed]}>
      <WhiteCard className="mb-4 p-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-unity-ink" style={styles.cardTitle}>{account.accountType === "deposit" ? "Deposit" : "Savings"}</Text>
            <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{account.accountNumber}</Text>
          </View>
          <StatusChip label={account.pendingTransactions > 0 ? "Pending" : "Approved"} tone={account.pendingTransactions > 0 ? "warning" : "success"} />
        </View>
        <Text className="mt-5 text-unity-ink" style={styles.balanceAmount}>{currency(account.balance)}</Text>
        <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{account.latestActivity}</Text>
      </WhiteCard>
    </Pressable>
  );
}

function SettingsSection({
  rows,
  title,
}: {
  rows: [
    keyof typeof Ionicons.glyphMap,
    string,
    (() => void) | undefined,
    "blue" | "green" | "orange" | "purple",
    boolean?,
    string?,
  ][];
  title: string;
}) {
  return (
    <View style={styles.settingsCard}>
      <View style={styles.settingsHeader}>
        <Text style={styles.sectionHeading}>{title}</Text>
      </View>
      {rows.map(([icon, label, onPress, tone, toggle, trailing], index) => (
        <Pressable
          key={label}
          disabled={!onPress}
          onPress={onPress}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <View style={[styles.settingsRow, index !== rows.length - 1 && styles.settingsRowDivider]}>
            <IconBubble icon={icon} size={30} tone={tone} />
            <Text style={styles.settingsRowTitle}>{label}</Text>
            {toggle ? (
              <Switch
                accessibilityLabel={label}
                ios_backgroundColor="#DCE4F0"
                onValueChange={() => undefined}
                thumbColor={colors.white}
                trackColor={{ false: "#DCE4F0", true: "#12C189" }}
                value
              />
            ) : trailing ? (
              <Text style={styles.settingsTrailing}>{trailing}</Text>
            ) : null}
            {toggle ? null : <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function ProfileMeta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="mt-2 flex-row items-start">
      <Ionicons color={colors.brand} name={icon} size={16} />
      <Text className="ml-2 flex-1 text-unity-muted" style={styles.bodyText}>{text}</Text>
    </View>
  );
}

function DateOfBirthPicker({
  onChange,
  value,
}: {
  onChange: (next: string) => void;
  value: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const os = process.env.EXPO_OS;
  const selectedDate = parseDateInputValue(value);
  const maximumDate = new Date();

  const handleChange = (_event: DateTimePickerEvent, nextDate?: Date) => {
    if (os === "android") {
      setShowPicker(false);
    }

    if (nextDate) {
      onChange(toDateInputValue(nextDate));
    }
  };

  const openPicker = () => {
    if (os === "android") {
      DateTimePickerAndroid.open({
        display: "default",
        maximumDate,
        mode: "date",
        onChange: handleChange,
        value: selectedDate,
      });
      return;
    }

    setShowPicker((current) => !current);
  };

  return (
    <View className="mb-4">
      <Text className="mb-2 text-unity-ink" style={styles.formLabel}>Date Of Birth</Text>
      <Pressable onPress={openPicker} style={({ pressed }) => [styles.input, styles.datePickerInput, pressed && styles.pressed]}>
        <Text className={value ? "text-unity-ink" : "text-unity-muted"} style={styles.inputText}>
          {formatDateInputValue(value)}
        </Text>
        <Ionicons color={colors.inkMuted} name="calendar-outline" size={20} />
      </Pressable>
      {showPicker && os !== "android" ? (
        <View style={styles.inlineDatePicker}>
          <DateTimePicker
            display={os === "ios" ? "spinner" : "default"}
            maximumDate={maximumDate}
            mode="date"
            onChange={handleChange}
            value={selectedDate}
          />
        </View>
      ) : null}
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-4 flex-row justify-between border-t border-unity-line pt-4">
      <Text className="text-unity-muted" style={styles.bodyText}>{label}</Text>
      <Text className="max-w-[58%] text-right text-unity-ink" style={styles.mediumInline}>{value}</Text>
    </View>
  );
}

function FormInput({
  label,
  multiline = false,
  onChangeText,
  secureTextEntry = false,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (next: string) => void;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-unity-ink" style={styles.formLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.inkMuted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
      />
    </View>
  );
}

function PrimaryGradientButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <LinearGradient
        colors={["#0057D8", "#08BFA9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.primaryGradient}
      >
        <Text className="text-white" style={styles.primaryButtonText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <View>
      {content.split(/\r?\n/).map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) {
          return null;
        }

        if (line.startsWith("#")) {
          return (
            <Text key={`${line}-${index}`} className="mb-3 text-unity-ink" style={styles.sectionHeading}>
              {line.replace(/^#+\s*/, "")}
            </Text>
          );
        }

        return (
          <Text key={`${line}-${index}`} className="mb-3 text-unity-muted" style={styles.bodyText}>
            {line.replace(/^[-*]\s+/, "• ")}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  actionLabel: {
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 15,
  },
  actionSquare: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 78,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  accountSummaryOverlap: {
    marginBottom: 18,
    marginTop: -74,
    position: "relative",
    zIndex: 3,
  },
  amountSmall: {
    fontFamily: typography.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  balanceAmount: {
    fontFamily: typography.heading,
    fontSize: 32,
    lineHeight: 38,
  },
  balanceFooterLabel: {
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 16,
  },
  balanceFooterValue: {
    fontFamily: typography.heading,
    fontSize: 15,
    lineHeight: 20,
  },
  bodyText: {
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 17,
  },
  buttonText: {
    fontFamily: typography.medium,
    fontSize: 17,
  },
  cardTitle: {
    fontFamily: typography.heading,
    fontSize: 19,
    lineHeight: 24,
  },
  depositCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 8,
    padding: 10,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  filterChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  filterText: {
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  formLabel: {
    fontFamily: typography.medium,
    fontSize: 15,
  },
  greetingName: {
    fontFamily: typography.heading,
    fontSize: 39,
    lineHeight: 45,
  },
  greetingSub: {
    fontFamily: typography.body,
    fontSize: 18,
    lineHeight: 25,
  },
  greetingText: {
    fontFamily: typography.body,
    fontSize: 23,
    lineHeight: 29,
  },
  homeGreetingLabel: {
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 19,
  },
  homeBalanceOverlap: {
    marginBottom: 14,
    marginTop: -76,
    position: "relative",
    zIndex: 3,
  },
  homeGreetingName: {
    fontFamily: typography.heading,
    fontSize: 21,
    lineHeight: 26,
  },
  homeGreetingSub: {
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 17,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 16,
    minHeight: 58,
    paddingHorizontal: 16,
  },
  datePickerInput: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inlineDatePicker: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    overflow: "hidden",
  },
  inputText: {
    fontFamily: typography.body,
    fontSize: 16,
  },
  linkText: {
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  loanAmount: {
    fontFamily: typography.heading,
    fontSize: 18,
    lineHeight: 23,
  },
  loanCard: {
    borderRadius: 16,
    padding: 16,
  },
  loanTitle: {
    fontFamily: typography.heading,
    fontSize: 16,
    lineHeight: 20,
  },
  mediumInline: {
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  metricAmount: {
    fontFamily: typography.heading,
    fontSize: 14,
    lineHeight: 18,
  },
  metricLabel: {
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 15,
  },
  memberAvatar: {
    borderRadius: 40,
    height: 80,
    width: 80,
  },
  memberIdRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 5,
  },
  memberIdText: {
    color: colors.inkMuted,
    flexShrink: 1,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 17,
    minWidth: 0,
  },
  memberIdentityCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    marginBottom: 14,
    minHeight: 176,
    paddingHorizontal: 12,
    paddingVertical: 14,
    shadowColor: "#071229",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  memberIdentityCopy: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 10,
    paddingTop: 6,
  },
  memberIdentityName: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 18,
    lineHeight: 23,
  },
  memberIdentityRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  memberProfileHeader: {
    height: 430,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  memberProfileScreen: {
    backgroundColor: colors.panel,
    flex: 1,
  },
  memberProfileScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 282,
  },
  memberProfileSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 20,
  },
  memberProfileTitle: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 28,
    lineHeight: 34,
  },
  memberProfileTitleBlock: {
    left: 20,
    position: "absolute",
    right: 20,
    top: 152,
  },
  memberProfileTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  memberProfileTopSlot: {
    alignItems: "flex-end",
    minWidth: 54,
  },
  memberProfileWatermark: {
    bottom: 52,
    height: 178,
    opacity: 0.11,
    position: "absolute",
    right: -38,
    width: 178,
  },
  memberProfileWatermarkSmall: {
    bottom: 82,
    height: 92,
    opacity: 0.08,
    position: "absolute",
    right: 84,
    width: 92,
  },
  memberProfileWhitePanel: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 392,
  },
  multilineInput: {
    minHeight: 112,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  paymentToggle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.78,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  primaryButtonText: {
    fontFamily: typography.heading,
    fontSize: 20,
  },
  primaryGradient: {
    alignItems: "center",
    borderRadius: 16,
    minHeight: 62,
    justifyContent: "center",
  },
  rowTitle: {
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  sectionHeading: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 17,
    lineHeight: 22,
  },
  settingsCard: {
    backgroundColor: colors.white,
    borderColor: "#E4E9F2",
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#071229",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  settingsHeader: {
    borderBottomColor: "#E4E9F2",
    borderBottomWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  settingsRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 46,
    paddingHorizontal: 14,
  },
  settingsRowDivider: {
    borderBottomColor: "#E4E9F2",
    borderBottomWidth: 1,
  },
  settingsRowTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 14,
    lineHeight: 18,
    marginLeft: 12,
  },
  settingsTrailing: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 16,
    marginRight: 6,
  },
  signOutButton: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    padding: 16,
  },
  smallText: {
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  statusTitle: {
    fontFamily: typography.heading,
    fontSize: 20,
    lineHeight: 25,
  },
  verifiedBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E4F8ED",
    borderRadius: 5,
    flexDirection: "row",
    gap: 8,
    marginLeft: 6,
    marginTop: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  verifiedBadgeText: {
    color: colors.success,
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 16,
  },
});
