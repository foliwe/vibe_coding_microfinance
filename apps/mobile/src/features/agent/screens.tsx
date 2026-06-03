import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";

import {
  IconBubble,
  SectionTitle,
  StatusChip,
  TealSummaryCard,
  UnityPage,
  UnitySimplePage,
  WhiteCard,
  unityStyles,
} from "@/components/unity-ui";
import { formatCurrency } from "@/lib/format";
import { useAppSession } from "@/lib/app-session";
import { getErrorMessage } from "@/lib/errors";
import { formatDateLabel, mobileData } from "@/lib/mobile-data";
import type { AgentTransactionTarget } from "@/lib/mobile-data";
import { formatTransactionRowDate } from "@/lib/transaction-history";
import { useResource } from "@/lib/use-resource";
import type { AssignedMember, SyncQueueItem } from "@/lib/mobile-models";
import type { TransactionRequest } from "@credit-union/shared";
import { colors, typography } from "@/theme/tokens";

type AgentTransactionStatusFilter = "all" | "pending" | "approved" | "rejected";
type AgentMemberFilter = "all" | "active" | "overdue" | "dueToday" | "lastCollection";
type RegistrationDateField = "dateOfBirth" | "idIssueDate" | "idExpiryDate";

const agentTransactionStatusFilters: { key: AgentTransactionStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const agentMemberFilters: { key: AgentMemberFilter; label: string }[] = [
  { key: "all", label: "All Members" },
  { key: "active", label: "Active" },
  { key: "overdue", label: "Overdue" },
  { key: "dueToday", label: "Due Today" },
  { key: "lastCollection", label: "Last Collection" },
];

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getTargetAccountType(value?: string | string[]) {
  const normalized = getSingleParam(value);

  return normalized === "savings" || normalized === "deposit" ? normalized : null;
}

function currency(amount: number) {
  return formatCurrency(amount);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string, fallbackDate = new Date()) {
  const [yearValue, monthValue, dayValue] = value.split("-").map(Number);
  const parsed = new Date(yearValue, monthValue - 1, dayValue);

  return Number.isNaN(parsed.getTime()) ? fallbackDate : parsed;
}

function formatDateInputValue(value: string, placeholder: string) {
  if (!value) {
    return placeholder;
  }

  return formatDateLabel(parseDateInputValue(value), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function firstName(name: string) {
  return name.split(" ")[0] || name;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "muted" {
  const normalized = status.toLowerCase();

  if (normalized.includes("reject") || normalized.includes("failed") || normalized.includes("required")) {
    return "danger";
  }

  if (normalized.includes("pending") || normalized.includes("sync")) {
    return "warning";
  }

  return "success";
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

function matchesTransactionStatusFilter(
  status: TransactionRequest["status"],
  filter: AgentTransactionStatusFilter,
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

function matchesAgentMemberFilter(member: AssignedMember, filter: AgentMemberFilter) {
  if (filter === "all" || filter === "lastCollection") {
    return true;
  }

  if (filter === "active") {
    return member.status === "active";
  }

  const activity = member.lastActivity.toLowerCase();

  if (filter === "overdue") {
    return activity.includes("overdue");
  }

  return activity.includes("due today") || activity.includes("today");
}

function matchesAgentMemberSearch(member: AssignedMember, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [member.fullName, member.code, member.phone, member.village]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

async function submitTransaction(
  target: AgentTransactionTarget,
  transactionType: "deposit" | "withdrawal",
  amountValue: string,
  note: string,
  transactionPin?: string,
) {
  const amount = Number(amountValue.replace(/,/g, ""));

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }

  if (transactionType === "withdrawal" && amount > target.availableBalance) {
    throw new Error("Withdrawal amount cannot exceed the selected account balance.");
  }

  await mobileData.createAgentTransactionRequest({
    accountType: target.accountType,
    amount,
    memberAccountId: target.accountId,
    memberId: target.memberId,
    memberName: target.memberName,
    note,
    transactionPin,
    transactionType,
  });
}

function ResourceErrorCard({ message }: { message: string }) {
  return (
    <WhiteCard className="p-5">
      <StatusChip label="Rejected" tone="danger" />
      <Text className="mt-3 text-unity-muted" style={styles.bodyText}>{message}</Text>
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

export function AgentHomeScreen() {
  const { data, error, loading } = useResource(mobileData.getAgentDashboard);

  if (error) {
    return (
      <UnitySimplePage showBack={false} subtitle="We could not load the field dashboard." title="Home">
        <ResourceErrorCard message={error} />
      </UnitySimplePage>
    );
  }

  if (loading || !data) {
    return (
      <UnitySimplePage showBack={false} subtitle="Loading the field dashboard preview." title="Home">
        <LoadingStack />
      </UnitySimplePage>
    );
  }

  return (
    <UnityPage
      headerContent={
        <>
          <View className="mt-6 flex-row items-center">
            <View className="mr-4 h-14 w-14 items-center justify-center rounded-full border-2 border-unity-teal">
              <Ionicons color={colors.mint} name="person" size={28} />
            </View>
            <View className="flex-1">
              <Text className="text-white" style={styles.greetingText}>Good morning,</Text>
              <Text className="text-white" style={styles.greetingName}>Agent {firstName(data.agentName)} <Text>👋</Text></Text>
            </View>
          </View>
          <Text className="mt-5 text-white/90" style={styles.greetingSub}>Here&apos;s your dashboard for today.</Text>
        </>
      }
      contentTopInset={18}
      headerHeight={365}
      notificationCount={data.pendingApprovals}
    >
      <View style={styles.agentHomeSummaryOverlap}>
        <TealSummaryCard
          amount={currency(data.collectionsToday)}
          footer={
            <View className="border-t border-white/30 pt-5">
              <View className="flex-row">
                <HeroStat icon="time-outline" label="Pending Approvals" tone="orange" value={String(data.pendingApprovals)} />
                <View className="mx-3 h-12 w-px bg-white/30" />
                <HeroStat icon="people-outline" label="Assigned Members" tone="purple" value={String(data.assignedMemberCount)} />
                <View className="mx-3 h-12 w-px bg-white/30" />
                <HeroStat icon="person-add-outline" label="Active Members" tone="green" value={String(data.activeMemberCount)} />
              </View>
            </View>
          }
          icon="wallet"
          size="large"
          subtitle="Total Collected"
          title="Today's Collections"
        />
      </View>
      <SectionTitle title="Quick Actions" />
      <View className="flex-row justify-between gap-3">
        <ActionSquare icon="download-outline" label="Collect Deposit" onPress={() => router.push("/agent/transactions/deposit" as Href)} tone="blue" />
        <ActionSquare icon="person-add-outline" label="Register Member" onPress={() => router.push("/agent/members/add" as Href)} tone="green" />
        <ActionSquare icon="people-outline" label="View Members" onPress={() => router.push("/agent/members" as Href)} tone="purple" />
        <ActionSquare icon="clipboard-outline" label="Collection History" onPress={() => router.push("/agent/transactions" as Href)} tone="orange" />
      </View>
      <SectionTitle
        action={
          <Pressable onPress={() => router.push("/agent/transactions" as Href)}>
            <Text className="text-unity-blue" style={styles.linkText}>View all</Text>
          </Pressable>
        }
        title="Today's Recent Collections"
      />
      <WhiteCard>
        {data.activity.slice(0, 5).map((item, index) => (
          <CollectionRow
            key={item.id}
            amount={item.amount}
            initials={initials(item.memberName)}
            isLast={index === Math.min(data.activity.length, 5) - 1}
            memberCode={`Member ID: ${item.id.slice(0, 7).toUpperCase()}`}
            name={item.memberName}
            status={item.status}
            time={item.timeLabel}
          />
        ))}
      </WhiteCard>
    </UnityPage>
  );
}

export function AgentMembersScreen() {
  const { data: members, error, loading } = useResource(mobileData.getAssignedMembers);
  const [memberFilter, setMemberFilter] = useState<AgentMemberFilter>("all");
  const [memberQuery, setMemberQuery] = useState("");
  const filteredMembers = useMemo(
    () =>
      (members ?? [])
        .filter((member) => matchesAgentMemberFilter(member, memberFilter))
        .filter((member) => matchesAgentMemberSearch(member, memberQuery))
        .sort((left, right) => {
          if (memberFilter !== "lastCollection") {
            return left.fullName.localeCompare(right.fullName);
          }

          return right.lastActivity.localeCompare(left.lastActivity);
        }),
    [memberFilter, memberQuery, members],
  );

  return (
    <UnityPage
      contentOverlap={44}
      contentTopInset={50}
      headerHeight={300}
      showBack
      subtitle="Manage and support your assigned members."
      title="My Members"
    >
      <WhiteCard className="mb-4 p-4">
        <View className="flex-row items-center">
          <View className="h-16 flex-1 flex-row items-center rounded-xl border border-unity-line bg-white px-4">
            <Ionicons color={colors.inkMuted} name="search-outline" size={22} />
            <TextInput
              className="ml-3 flex-1 text-unity-ink"
              onChangeText={setMemberQuery}
              placeholder="Search members by name or ID..."
              placeholderTextColor={colors.inkMuted}
              style={styles.bodyText}
              value={memberQuery}
            />
          </View>
          <Pressable
            className="ml-4 h-16 w-16 items-center justify-center rounded-xl border border-unity-line bg-white"
            onPress={() => {
              setMemberQuery("");
              setMemberFilter("all");
            }}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Ionicons
              color={colors.ink}
              name={memberFilter === "all" && !memberQuery ? "filter-outline" : "close-outline"}
              size={22}
            />
          </Pressable>
        </View>
      </WhiteCard>
      <View className="mb-5 flex-row flex-wrap gap-3">
        {agentMemberFilters.map((filter) => (
          <FilterChip
            key={filter.key}
            active={filter.key === memberFilter}
            label={filter.label}
            onPress={() => setMemberFilter(filter.key)}
          />
        ))}
      </View>
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons color={colors.inkMuted} name="people-outline" size={18} />
          <Text className="ml-2 text-unity-muted" style={styles.bodyText}>Total Members</Text>
          <StatusChip label={String(filteredMembers.length)} tone="success" />
        </View>
        <Text className="text-unity-muted" style={styles.bodyText}>
          {memberFilter === "lastCollection" ? "Sorted by Collection" : "Sorted by Name"}
        </Text>
      </View>
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !members ? (
        <LoadingStack />
      ) : filteredMembers.length === 0 ? (
        <WhiteCard className="p-5">
          <Text className="text-unity-muted" style={styles.bodyText}>No assigned members are ready yet.</Text>
        </WhiteCard>
      ) : (
        filteredMembers.map((member) => <AgentMemberCard key={member.id} member={member} />)
      )}
      <Pressable onPress={() => router.push("/agent/members/add" as Href)} style={({ pressed }) => [styles.floatingAdd, pressed && styles.pressed]}>
        <Ionicons color={colors.white} name="person-add" size={18} />
        <Text className="ml-2 text-white" style={styles.floatingAddText}>Add Member</Text>
      </Pressable>
    </UnityPage>
  );
}

export function AgentMemberDetailScreen() {
  const params = useLocalSearchParams<{ memberId?: string | string[] }>();
  const memberId = getSingleParam(params.memberId) ?? "";
  const loader = useMemo(() => () => mobileData.getAssignedMemberDetail(memberId), [memberId]);
  const { data, error, loading } = useResource(loader);

  return (
    <UnitySimplePage subtitle="Member workspace and direct collection actions." title="Member">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <LoadingStack />
      ) : !data ? (
        <ResourceErrorCard message="No assigned member record matches this route." />
      ) : (
        <>
          <WhiteCard className="p-5">
            <View className="flex-row items-center">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                <Text className="text-unity-blue" style={styles.avatarText}>{initials(data.member.fullName)}</Text>
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-unity-ink" style={styles.cardTitle}>{data.member.fullName}</Text>
                <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{data.member.code} · {data.member.village}</Text>
                <View className="mt-2 self-start">
                  <StatusChip label={data.member.status === "active" ? "Active" : "Pending"} tone={data.member.status === "active" ? "success" : "warning"} />
                </View>
              </View>
            </View>
          </WhiteCard>
          <View className="mt-5 flex-row gap-4">
            <BalanceTile label="Savings Balance" value={currency(data.member.savingsBalance)} />
            <BalanceTile label="Deposit Balance" value={currency(data.member.depositBalance)} />
          </View>
          <SectionTitle title="Actions" />
          <View className="gap-3">
            {data.savingsTarget ? <ActionWide icon="download-outline" label="Collect Savings" onPress={() => router.push(`/agent/transactions/deposit?memberId=${data.member.id}&accountType=savings` as Href)} tone="blue" /> : null}
            {data.depositTarget ? <ActionWide icon="wallet-outline" label="Collect Deposit" onPress={() => router.push(`/agent/transactions/deposit?memberId=${data.member.id}&accountType=deposit` as Href)} tone="green" /> : null}
            {data.withdrawalTarget ? <ActionWide icon="arrow-up-outline" label="Withdrawal" onPress={() => router.push(`/agent/transactions/withdrawal?memberId=${data.member.id}` as Href)} tone="orange" /> : null}
          </View>
          <SectionTitle title="Recent Activity" />
          {data.recentTransactions.map((transaction) => (
            <DepositHistoryRow
              key={transaction.id}
              amount={transaction.amount}
              date={formatTransactionRowDate(transaction.createdAt)}
              memberName={transaction.memberName}
              onPress={() => router.push(`/agent/transactions/${transaction.id}` as Href)}
              status={toStatusLabel(transaction.status)}
            />
          ))}
        </>
      )}
    </UnitySimplePage>
  );
}

export function AgentTransactionsScreen() {
  const { data: transactions, error, loading } = useResource(mobileData.getAgentTransactions);
  const [statusFilter, setStatusFilter] = useState<AgentTransactionStatusFilter>("all");
  const filteredTransactions = useMemo(
    () =>
      (transactions ?? []).filter((transaction) =>
        matchesTransactionStatusFilter(transaction.status, statusFilter),
      ),
    [statusFilter, transactions],
  );

  return (
    <UnitySimplePage subtitle="Track all collections and approval status." title="Collection History">
      <View className="mb-5 flex-row flex-wrap gap-3">
        {agentTransactionStatusFilters.map((filter) => (
          <FilterChip
            key={filter.key}
            active={filter.key === statusFilter}
            label={filter.label}
            onPress={() => setStatusFilter(filter.key)}
          />
        ))}
      </View>
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !transactions ? (
        <LoadingStack />
      ) : filteredTransactions.length === 0 ? (
        <WhiteCard className="p-5">
          <Text className="text-unity-muted" style={styles.bodyText}>No collections are ready yet.</Text>
        </WhiteCard>
      ) : (
        filteredTransactions.map((transaction) => (
          <DepositHistoryRow
            key={transaction.id}
            amount={transaction.amount}
            date={formatTransactionRowDate(transaction.createdAt)}
            memberName={transaction.memberName}
            onPress={() => router.push(`/agent/transactions/${transaction.id}` as Href)}
            status={toStatusLabel(transaction.status)}
          />
        ))
      )}
    </UnitySimplePage>
  );
}

export function AgentTransactionDetailScreen() {
  const params = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const transactionId = getSingleParam(params.transactionId) ?? "";
  const loader = useMemo(() => () => mobileData.getAgentTransactionDetail(transactionId), [transactionId]);
  const { data, error, loading } = useResource(loader);

  return (
    <UnitySimplePage subtitle="Collection approval and sync status." title="Transaction">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <LoadingStack />
      ) : !data ? (
        <ResourceErrorCard message="No transaction matches this route." />
      ) : (
        <>
          <TealSummaryCard amount={currency(data.amount)} subtitle={data.memberName} title={data.type === "deposit" ? "Savings Deposit" : "Withdrawal"} />
          <WhiteCard className="mt-5 p-5">
            <DetailLine label="Member" value={data.memberName} />
            <DetailLine label="Agent" value={data.agentName} />
            <DetailLine label="Branch" value={data.branchName} />
            <DetailLine label="Date" value={formatTransactionRowDate(data.createdAt)} />
            <DetailLine label="Reference" value={data.id.slice(0, 12).toUpperCase()} />
          </WhiteCard>
          {data.note ? (
            <WhiteCard className="mt-4 p-5">
              <Text className="text-unity-muted" style={styles.bodyText}>{data.note}</Text>
            </WhiteCard>
          ) : null}
        </>
      )}
    </UnitySimplePage>
  );
}

export function AgentTransactionReceiptScreen() {
  return <AgentTransactionDetailScreen />;
}

export function AgentNotificationsScreen() {
  const { data: notifications, error, loading } = useResource(mobileData.getAgentNotifications);

  return (
    <UnitySimplePage subtitle="Manager approvals, sync state, and member activity." title="Notifications">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !notifications ? (
        <LoadingStack />
      ) : notifications.length === 0 ? (
        <WhiteCard className="p-5">
          <Text className="text-unity-muted" style={styles.bodyText}>No agent notifications are waiting right now.</Text>
        </WhiteCard>
      ) : (
        notifications.map((item) => (
          <WhiteCard key={item.id} className="mb-4 p-5">
            <Text className="text-unity-ink" style={styles.cardTitle}>{item.title}</Text>
            <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{item.subtitle}</Text>
            <View className="mt-4 flex-row items-center justify-between">
              <StatusChip label={item.status} tone={statusTone(item.status)} />
              {item.amount ? <Text className="text-unity-green" style={styles.amountSmall}>{currency(item.amount)}</Text> : null}
            </View>
          </WhiteCard>
        ))
      )}
    </UnitySimplePage>
  );
}

export function AgentAddMemberScreen() {
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [idCardNumber, setIdCardNumber] = useState("");
  const [idIssueDate, setIdIssueDate] = useState("");
  const [idExpiryDate, setIdExpiryDate] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdAccess, setCreatedAccess] = useState<{ signInIdentifier: string; temporaryPassword: string } | null>(null);
  const today = useMemo(() => new Date(), []);
  const idIssueDateValue = idIssueDate ? parseDateInputValue(idIssueDate) : undefined;

  const submitMember = () => {
    if (isSubmitting || createdAccess) {
      return;
    }

    const requiredFields = [
      [fullName, "Enter the member's full name."],
      [gender, "Select the member's gender."],
      [phone, "Enter the member's phone number."],
      [dateOfBirth, "Select the member's date of birth."],
      [idCardNumber, "Enter the national ID card number."],
      [idIssueDate, "Select the national ID issue date."],
      [idExpiryDate, "Select the national ID expiry date."],
    ] as const;
    const missingField = requiredFields.find(([value]) => !value.trim());

    if (missingField) {
      setSubmissionError(missingField[1]);
      return;
    }

    if (idExpiryDate <= idIssueDate) {
      setSubmissionError("National ID expiry date must be after the issue date.");
      return;
    }

    setSubmissionError(null);
    setCreatedAccess(null);
    setIsSubmitting(true);

    void mobileData
      .createMember({
        dateOfBirth,
        fullName,
        gender,
        idCardNumber,
        idExpiryDate,
        idIssueDate,
        phone,
      })
      .then((result) => setCreatedAccess(result))
      .catch((nextError) => setSubmissionError(getErrorMessage(nextError, "We could not create the member.")))
      .finally(() => setIsSubmitting(false));
  };

  return (
    <UnityPage
      headerContent={<RegistrationStepper />}
      headerHeight={420}
      showBack
      subtitle="Add a new member to the credit union"
      title="Register Member"
    >
      <WhiteCard className="p-4">
        <Text className="mb-3 text-unity-ink" style={styles.sectionHeading}>Personal Information</Text>
        <FormInput icon="person-outline" label="Full Name" onChangeText={setFullName} placeholder="Enter full name" value={fullName} />
        <GenderSelect value={gender} onChange={setGender} />
        <FormInput
          icon="call-outline"
          keyboardType="phone-pad"
          label="Phone Number"
          onChangeText={setPhone}
          placeholder="080 1234 5678"
          value={phone}
        />
        <RegistrationDatePicker
          field="dateOfBirth"
          label="Date of Birth"
          maximumDate={today}
          onChange={setDateOfBirth}
          placeholder="Select date of birth"
          value={dateOfBirth}
        />
        <Text className="mb-3 mt-2 text-unity-ink" style={styles.sectionHeading}>National ID Card</Text>
        <FormInput
          autoCapitalize="characters"
          icon="card-outline"
          label="National ID Card Number"
          onChangeText={setIdCardNumber}
          placeholder="Enter national ID number"
          value={idCardNumber}
        />
        <RegistrationDatePicker
          field="idIssueDate"
          label="Issue Date"
          maximumDate={today}
          onChange={setIdIssueDate}
          placeholder="Select issue date"
          value={idIssueDate}
        />
        <RegistrationDatePicker
          field="idExpiryDate"
          label="Expiry Date"
          minimumDate={idIssueDateValue}
          onChange={setIdExpiryDate}
          placeholder="Select expiry date"
          value={idExpiryDate}
        />
        <InfoNotice text="New members remain pending until approved by a manager. You will be notified once approval is completed." />
        {createdAccess ? (
          <WhiteCard className="mb-4 p-4">
            <StatusChip label="Completed" tone="success" />
            <DetailLine label="Sign-in Code" value={createdAccess.signInIdentifier} />
            <DetailLine label="Temporary Password" value={createdAccess.temporaryPassword} />
          </WhiteCard>
        ) : null}
        {submissionError ? <ResourceErrorCard message={submissionError} /> : null}
        <PrimaryGradientButton
          label={isSubmitting ? "Submitting..." : "Submit for Verification"}
          onPress={submitMember}
        />
      </WhiteCard>
    </UnityPage>
  );
}

export function AgentDepositScreen() {
  const params = useLocalSearchParams<{ accountType?: string | string[]; memberId?: string | string[] }>();
  const memberId = getSingleParam(params.memberId);
  const targetAccountType = getTargetAccountType(params.accountType);
  const memberListLoader = useMemo(
    () => (memberId ? async () => [] as AgentTransactionTarget[] : mobileData.getEligibleDepositMembers),
    [memberId],
  );
  const depositLoader = useMemo(
    () =>
      memberId && targetAccountType
        ? () => mobileData.getDepositTargetForMember(memberId, targetAccountType)
        : async () => null,
    [memberId, targetAccountType],
  );
  const { data: memberTargets, error: membersError, loading: membersLoading } = useResource(memberListLoader);
  const { data: target, error, loading } = useResource(depositLoader);
  const [amount, setAmount] = useState("15,000.00");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    setNote(targetAccountType ? `${targetAccountType} collection taken directly for this member` : "");
  }, [targetAccountType]);

  if (!memberId) {
    return (
      <UnitySimplePage subtitle="Choose a member before entering the deposit." title="Collect Deposit">
        <InfoNotice text="Select the member first, then enter the deposit amount on the next screen." />
        <Text className="mb-3 mt-6 text-unity-ink" style={styles.sectionHeading}>Select Member</Text>
        {membersError ? (
          <ResourceErrorCard message={membersError} />
        ) : membersLoading || !memberTargets ? (
          <LoadingStack />
        ) : memberTargets.length === 0 ? (
          <ResourceErrorCard message="No assigned member with an active account is ready for deposit capture yet." />
        ) : (
          memberTargets.map((memberTarget) => (
            <Pressable
              key={`${memberTarget.memberId}-${memberTarget.accountId}`}
              onPress={() =>
                router.push(
                  `/agent/transactions/deposit?memberId=${memberTarget.memberId}&accountType=${memberTarget.accountType}` as Href,
                )
              }
              style={({ pressed }) => [styles.depositCard, unityStyles.cardShadow, pressed && styles.pressed]}
            >
              <IconBubble icon="person-outline" size={38} tone="blue" />
              <View className="ml-3 flex-1">
                <Text className="text-unity-ink" style={styles.rowTitle}>{memberTarget.memberName}</Text>
                <Text className="mt-1 text-unity-muted" style={styles.bodyText}>
                  {memberTarget.memberCode} · {memberTarget.accountType === "deposit" ? "Deposit" : "Savings"}
                </Text>
                <Text className="mt-1 text-unity-muted" style={styles.bodyText}>
                  Savings {currency(memberTarget.savingsBalance)} · Deposit {currency(memberTarget.depositBalance)}
                </Text>
              </View>
              <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
            </Pressable>
          ))
        )}
      </UnitySimplePage>
    );
  }

  return (
    <CollectScreenFrame title="Collect Deposit">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <LoadingStack />
      ) : !target ? (
        <ResourceErrorCard message="No assigned member with an active account is ready for deposit capture yet." />
      ) : (
        <>
          <InfoNotice text="Deposits require manager approval before they are posted to the member's account." />
          <Text className="mb-3 mt-6 text-unity-ink" style={styles.sectionHeading}>Member</Text>
          <TargetMemberCard target={target} />
          <Text className="mb-3 mt-7 text-unity-ink" style={styles.sectionHeading}>Deposit Amount</Text>
          <AmountBox amount={amount} onChangeText={setAmount} />
          <Text className="mb-3 mt-7 text-unity-ink" style={styles.sectionHeading}>Payment Method</Text>
          <WhiteCard className="flex-row items-center p-4">
            <IconBubble icon="business-outline" size={38} tone="blue" />
            <View className="ml-3 flex-1">
              <Text className="text-unity-ink" style={styles.cardTitle}>Cash</Text>
              <Text className="mt-1 text-unity-muted" style={styles.bodyText}>Physical cash received</Text>
            </View>
            <Ionicons color={colors.inkMuted} name="chevron-down" size={18} />
          </WhiteCard>
          <Text className="mb-3 mt-7 text-unity-ink" style={styles.sectionHeading}>Notes <Text style={styles.bodyText}>(Optional)</Text></Text>
          <TextInput
            multiline
            onChangeText={setNote}
            placeholder="Add a note about this deposit..."
            placeholderTextColor={colors.inkMuted}
            style={styles.noteInput}
            value={note}
          />
          <View className="mt-5 flex-row gap-4">
            <MiniConfirm icon="location-outline" label="Location Captured" sublabel="Lagos, Nigeria" tone="green" />
            <MiniConfirm icon="wifi-outline" label="Will sync when online" sublabel="Saved locally" tone="blue" />
          </View>
          {submissionError ? <ResourceErrorCard message={submissionError} /> : null}
          <PrimaryGradientButton
            label={isSubmitting ? "Submitting Deposit..." : "Submit Deposit"}
            onPress={() => {
              if (isSubmitting) {
                return;
              }

              setSubmissionError(null);
              setIsSubmitting(true);

              void submitTransaction(target, "deposit", amount, note)
                .then(() => router.replace(memberId ? `/agent/members/${memberId}` : "/agent/transactions"))
                .catch((nextError) => setSubmissionError(getErrorMessage(nextError, "We could not submit the deposit.")))
                .finally(() => setIsSubmitting(false));
            }}
          />
        </>
      )}
    </CollectScreenFrame>
  );
}

export function AgentWithdrawalScreen() {
  const params = useLocalSearchParams<{ memberId?: string | string[]; returnTo?: string | string[] }>();
  const memberId = getSingleParam(params.memberId);
  const returnTo = getSingleParam(params.returnTo);
  const memberListLoader = useMemo(() => (memberId ? async () => [] as AgentTransactionTarget[] : mobileData.getEligibleWithdrawalMembers), [memberId]);
  const targetLoader = useMemo(() => (memberId ? () => mobileData.getWithdrawalTargetForMember(memberId) : async () => null), [memberId]);
  const { data: memberTargets, error: membersError, loading: membersLoading } = useResource(memberListLoader);
  const { data: target, error: targetError, loading: targetLoading } = useResource(targetLoader);
  const [amount, setAmount] = useState("10000");
  const [note, setNote] = useState("Member cash withdrawal");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  if (!memberId) {
    return (
      <UnitySimplePage subtitle="Choose a member before withdrawal." title="Withdrawal">
        {membersError ? (
          <ResourceErrorCard message={membersError} />
        ) : membersLoading || !memberTargets ? (
          <LoadingStack />
        ) : (
          memberTargets.map((memberTarget) => (
            <Pressable
              key={memberTarget.memberId}
              onPress={() => router.push(`/agent/transactions/withdrawal?memberId=${memberTarget.memberId}` as Href)}
              style={({ pressed }) => [styles.depositCard, unityStyles.cardShadow, pressed && styles.pressed]}
            >
              <IconBubble icon="person-outline" size={38} tone="blue" />
              <View className="ml-3 flex-1">
                <Text className="text-unity-ink" style={styles.rowTitle}>{memberTarget.memberName}</Text>
                <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{memberTarget.memberCode} · {currency(memberTarget.availableBalance)}</Text>
              </View>
              <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
            </Pressable>
          ))
        )}
      </UnitySimplePage>
    );
  }

  return (
    <CollectScreenFrame title="Withdrawal">
      {targetError ? (
        <ResourceErrorCard message={targetError} />
      ) : targetLoading ? (
        <LoadingStack />
      ) : !target ? (
        <ResourceErrorCard message="No withdrawal target is ready for this member." />
      ) : (
        <>
          <TargetMemberCard target={target} />
          <Text className="mb-3 mt-7 text-unity-ink" style={styles.sectionHeading}>Withdrawal Amount</Text>
          <AmountBox amount={amount} onChangeText={setAmount} />
          <FormInput icon="lock-closed-outline" label="Transaction PIN" onChangeText={setPin} placeholder="Enter PIN" secureTextEntry value={pin} />
          <TextInput
            multiline
            onChangeText={setNote}
            placeholder="Add withdrawal context"
            placeholderTextColor={colors.inkMuted}
            style={styles.noteInput}
            value={note}
          />
          {submissionError ? <ResourceErrorCard message={submissionError} /> : null}
          <PrimaryGradientButton
            label={isSubmitting ? "Submitting Withdrawal..." : "Submit Withdrawal"}
            onPress={() => {
              if (isSubmitting) {
                return;
              }

              setSubmissionError(null);
              setIsSubmitting(true);

              void submitTransaction(target, "withdrawal", amount, note, pin)
                .then(() => router.replace(returnTo === "member" ? `/agent/members/${memberId}` : "/agent/transactions"))
                .catch((nextError) => setSubmissionError(getErrorMessage(nextError, "We could not submit the withdrawal.")))
                .finally(() => setIsSubmitting(false));
            }}
          />
        </>
      )}
    </CollectScreenFrame>
  );
}

export function AgentSyncQueueScreen() {
  const { data: queue, error, loading, reload } = useResource(mobileData.getSyncQueue);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function runSync(mode: "all" | "failed") {
    setIsSyncing(true);
    setSyncError(null);

    try {
      if (mode === "failed") {
        await mobileData.retryFailedSyncQueue();
      } else {
        await mobileData.syncQueue();
      }
      await reload();
    } catch (nextError) {
      setSyncError(getErrorMessage(nextError, "We could not sync the queue."));
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <UnitySimplePage subtitle="Offline collections saved locally." title="Sync Queue">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !queue ? (
        <LoadingStack />
      ) : queue.length === 0 ? (
        <WhiteCard className="p-5">
          <Text className="text-unity-muted" style={styles.bodyText}>No offline items are waiting to sync right now.</Text>
        </WhiteCard>
      ) : (
        queue.map((item: SyncQueueItem) => <QueueRow item={item} key={item.id} />)
      )}
      {syncError ? <ResourceErrorCard message={syncError} /> : null}
      <View className="mt-4 flex-row gap-4">
        <View className="flex-1">
          <PrimaryGradientButton label={isSyncing ? "Syncing..." : "Sync All"} onPress={() => void runSync("all")} />
        </View>
        <View className="flex-1">
          <PrimaryGradientButton label="Retry Failed" onPress={() => void runSync("failed")} />
        </View>
      </View>
    </UnitySimplePage>
  );
}

export function AgentReconciliationScreen() {
  const { data, error, loading, reload } = useResource(mobileData.getAgentReconciliation);
  const [actualCash, setActualCash] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setActualCash(String(data.actualCash));
      setVarianceReason(data.varianceReason ?? "");
    }
  }, [data]);

  return (
    <UnitySimplePage subtitle="Compare expected cash against counted cash." title="Reconcile Cash">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !data ? (
        <LoadingStack />
      ) : (
        <>
          <TealSummaryCard amount={currency(data.expectedCash)} subtitle={`Difference ${currency(data.difference)}`} title="Expected Cash" />
          <FormInput icon="wallet-outline" label="Actual Cash" onChangeText={setActualCash} placeholder="0" value={actualCash} />
          <TextInput
            multiline
            onChangeText={setVarianceReason}
            placeholder="Explain any variance"
            placeholderTextColor={colors.inkMuted}
            style={styles.noteInput}
            value={varianceReason}
          />
          <StatusChip label={data.statusLabel} tone={statusTone(data.statusLabel)} />
          {data.reviewNote ? <Text className="mt-3 text-unity-muted" style={styles.bodyText}>Review note: {data.reviewNote}</Text> : null}
          {successMessage ? <Text className="mt-3 text-unity-green" style={styles.bodyText}>{successMessage}</Text> : null}
          {submissionError ? <ResourceErrorCard message={submissionError} /> : null}
          <View className="mt-5">
            <PrimaryGradientButton
              label={isSubmitting ? "Submitting..." : "Submit Reconciliation"}
              onPress={() => {
                if (isSubmitting || !data.canSubmit) {
                  return;
                }

                setIsSubmitting(true);
                setSubmissionError(null);
                setSuccessMessage(null);

                void mobileData
                  .submitAgentReconciliation({
                    actualCash,
                    varianceReason,
                  })
                  .then((nextData) => {
                    setActualCash(String(nextData.actualCash));
                    setVarianceReason(nextData.varianceReason ?? "");
                    setSuccessMessage("Reconciliation submitted. The branch manager can now review it.");
                    void reload();
                  })
                  .catch((nextError) => setSubmissionError(getErrorMessage(nextError, "We could not submit the reconciliation.")))
                  .finally(() => setIsSubmitting(false));
              }}
            />
          </View>
        </>
      )}
    </UnitySimplePage>
  );
}

export function AgentProfileScreen() {
  const { signOut } = useAppSession();
  const { data, error, loading } = useResource(mobileData.getAgentDashboard);

  return (
    <UnityPage headerHeight={350} subtitle="Operational profile and field settings" title="My Profile">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !data ? (
        <LoadingStack />
      ) : (
        <>
          <WhiteCard className="mb-5 p-4">
            <View className="flex-row items-center">
              <View className="h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-blue-100" style={unityStyles.cardShadow}>
                <Text className="text-unity-blue" style={styles.profileInitials}>{initials(data.agentName)}</Text>
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-unity-ink" style={styles.profileName}>{data.agentName}</Text>
                <Text className="mt-2 text-unity-muted" style={styles.bodyText}>{data.agentCode}</Text>
                <ProfileMeta icon="business-outline" text={data.branchName} />
                <ProfileMeta icon="cloud-done-outline" text={data.syncState} />
              </View>
            </View>
          </WhiteCard>
          <SettingsSection
            rows={[
              ["wallet-outline", "Reconcile Cash", () => router.push("/agent/more/reconciliation" as Href), "green"],
              ["cloud-upload-outline", "Sync Queue", () => router.push("/agent/more/sync-queue" as Href), "blue"],
              ["lock-closed-outline", "Secure Account", () => router.push("/agent/change-password" as Href), "purple"],
            ]}
            title="Field Operations"
          />
          <Pressable onPress={() => void signOut()} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
            <Text className="text-unity-red" style={styles.buttonText}>Sign Out</Text>
          </Pressable>
        </>
      )}
    </UnityPage>
  );
}

export function AgentChangePasswordScreen() {
  const { profile, refreshProfile } = useAppSession();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!profile || profile.role !== "agent") {
    return (
      <UnitySimplePage subtitle="Agent security setup is only available for signed-in agents." title="Secure Account">
        <ResourceErrorCard message="Sign in with an agent account to complete secure setup." />
      </UnitySimplePage>
    );
  }

  return (
    <UnitySimplePage subtitle="Finish first-login security before entering the field workspace." title="Secure Account">
      {profile.mustChangePassword ? (
        <>
          <FormInput icon="lock-closed-outline" label="Current Password" onChangeText={setOldPassword} placeholder="Enter current password" secureTextEntry value={oldPassword} />
          <FormInput icon="lock-open-outline" label="New Password" onChangeText={setNewPassword} placeholder="Choose a new password" secureTextEntry value={newPassword} />
          <FormInput icon="checkmark-circle-outline" label="Confirm New Password" onChangeText={setConfirmNewPassword} placeholder="Re-enter new password" secureTextEntry value={confirmNewPassword} />
        </>
      ) : null}
      {profile.requiresPinSetup ? (
        <>
          <FormInput icon="keypad-outline" label="Transaction PIN" onChangeText={setPin} placeholder="Enter PIN" secureTextEntry value={pin} />
          <FormInput icon="keypad-outline" label="Confirm Transaction PIN" onChangeText={setConfirmPin} placeholder="Confirm PIN" secureTextEntry value={confirmPin} />
        </>
      ) : null}
      {submissionError ? <ResourceErrorCard message={submissionError} /> : null}
      {successMessage ? <Text className="mb-4 text-unity-green" style={styles.bodyText}>{successMessage}</Text> : null}
      <PrimaryGradientButton
        label={isSubmitting ? "Saving..." : "Save Security Settings"}
        onPress={() => {
          if (isSubmitting) {
            return;
          }

          if (profile.mustChangePassword && newPassword.trim() !== confirmNewPassword.trim()) {
            setSubmissionError("Your new password and confirmation must match.");
            return;
          }

          if (profile.requiresPinSetup && pin.trim() !== confirmPin.trim()) {
            setSubmissionError("Your transaction PIN and confirmation must match.");
            return;
          }

          setIsSubmitting(true);
          setSubmissionError(null);
          setSuccessMessage(null);

          void mobileData
            .changeAgentCredentials({
              confirmNewPassword,
              confirmTransactionPin: confirmPin,
              currentPassword: oldPassword,
              newPassword,
              transactionPin: pin,
            })
            .then(async () => {
              await refreshProfile();
              setSuccessMessage("Security setup completed.");
              router.replace("/agent");
            })
            .catch((nextError) => setSubmissionError(getErrorMessage(nextError, "We could not save security setup.")))
            .finally(() => setIsSubmitting(false));
        }}
      />
    </UnitySimplePage>
  );
}

export function AgentMoreScreen() {
  return <AgentProfileScreen />;
}

export function AgentReceiptScreen() {
  return <AgentTransactionDetailScreen />;
}

function HeroStat({
  icon,
  label,
  tone,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: "green" | "orange" | "purple";
  value: string;
}) {
  const iconColor = tone === "orange" ? colors.warning : tone === "purple" ? colors.purple : colors.white;

  return (
    <View className="flex-1 flex-row items-center">
        <Ionicons color={iconColor} name={icon} size={20} />
      <View className="ml-2 flex-1">
        <Text className="text-white" style={styles.heroStatValue}>{value}</Text>
        <Text className="text-white" style={styles.heroStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

function RegistrationStepper() {
  return (
    <View className="mt-7 flex-row items-start justify-between px-1">
      {["Member Info", "Contact & Details", "KYC Documents", "Review"].map((label, index) => {
        const step = index + 1;
        const isActive = step === 1;

        return (
          <View key={label} className="flex-1 items-center">
            <View className="w-full flex-row items-center">
              <View className="h-px flex-1 bg-white/30" />
              <View
                className={isActive
                  ? "h-11 w-11 items-center justify-center rounded-full bg-unity-teal"
                  : "h-11 w-11 items-center justify-center rounded-full border border-white/55 bg-white/5"}
              >
                <Text className="text-white" style={styles.stepNumber}>{step}</Text>
              </View>
              <View className="h-px flex-1 bg-white/30" />
            </View>
            <Text className="mt-2 text-center text-white" numberOfLines={2} style={styles.stepLabel}>
              {label}
            </Text>
          </View>
        );
      })}
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
      <Text adjustsFontSizeToFit className="mt-2 text-center text-unity-ink" numberOfLines={1} style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function CollectionRow({
  amount,
  initials: avatarInitials,
  isLast,
  memberCode,
  name,
  status,
  time,
}: {
  amount: number;
  initials: string;
  isLast?: boolean;
  memberCode: string;
  name: string;
  status: string;
  time: string;
}) {
  return (
    <View className={`flex-row items-center px-4 py-2.5 ${isLast ? "" : "border-b border-unity-line"}`}>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-unity-green-soft">
        <Text className="text-unity-green" style={styles.avatarText}>{avatarInitials}</Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-unity-ink" style={styles.rowTitle}>{name}</Text>
        <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{memberCode}</Text>
      </View>
      <View className="items-end">
        <Text className="text-unity-green" style={styles.amountSmall}>+ {currency(amount)}</Text>
        <Text className="text-unity-muted" style={styles.bodyText}>{time}</Text>
      </View>
      <View className="ml-2">
        <StatusChip label={status} tone={statusTone(status)} />
      </View>
    </View>
  );
}

function FilterChip({
  active = false,
  label,
  onPress,
}: {
  active?: boolean;
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
      <Text className={active ? "text-white" : "text-unity-ink"} style={styles.filterText}>{label}</Text>
    </Pressable>
  );
}

function AgentMemberCard({ member }: { member: AssignedMember }) {
  const activity = member.lastActivity || (member.status === "active" ? "Collected today" : "Due soon");
  const activityTone = activity.toLowerCase().includes("overdue")
    ? "warning"
    : activity.toLowerCase().includes("due")
      ? "info"
      : "success";

  return (
    <Pressable
      onPress={() => router.push(`/agent/members/${member.id}` as Href)}
      style={({ pressed }) => [styles.memberCard, unityStyles.cardShadow, pressed && styles.pressed]}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100">
        <Text className="text-unity-blue" style={styles.avatarText}>{initials(member.fullName)}</Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-unity-ink" numberOfLines={1} style={styles.memberListName}>{member.fullName}</Text>
        <Text className="mt-1 text-unity-muted" style={styles.bodyText}>ID: {member.code}</Text>
        <Text className="mt-1 text-unity-muted" style={styles.bodyText}>☎ {member.phone}</Text>
      </View>
      <View className="items-end">
        <Text adjustsFontSizeToFit className="text-unity-green" numberOfLines={1} style={styles.memberListAmount}>{currency(member.savingsBalance)}</Text>
        <Text className="mt-1 text-unity-muted" style={styles.bodyText}>Savings Balance</Text>
        <View className="mt-2">
          <StatusChip label={activity} tone={activityTone} />
        </View>
      </View>
      <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

function BalanceTile({ label, value }: { label: string; value: string }) {
  return (
    <WhiteCard className="flex-1 p-4">
      <Text className="text-unity-muted" style={styles.bodyText}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} className="mt-2 text-unity-green" style={styles.cardTitle}>{value}</Text>
    </WhiteCard>
  );
}

function ActionWide({
  icon,
  label,
  onPress,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: "blue" | "green" | "orange";
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionWide, pressed && styles.pressed]}>
      <IconBubble icon={icon} size={38} tone={tone} />
      <Text className="ml-3 text-unity-ink" style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function DepositHistoryRow({
  amount,
  date,
  memberName,
  onPress,
  status,
}: {
  amount: number;
  date: string;
  memberName: string;
  onPress: () => void;
  status: string;
}) {
  const tone = statusTone(status);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.depositCard, unityStyles.cardShadow, pressed && styles.pressed]}>
      <IconBubble icon={tone === "warning" ? "time-outline" : tone === "danger" ? "close-circle-outline" : "checkmark-outline"} size={38} tone={tone === "danger" ? "red" : tone === "warning" ? "orange" : "green"} />
      <View className="ml-3 flex-1">
        <Text className="text-unity-ink" style={styles.rowTitle}>Savings Deposit</Text>
        <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{date}</Text>
        <Text className="mt-1 text-unity-muted" style={styles.bodyText}>Member: <Text className="text-unity-blue" style={styles.mediumInline}>{memberName}</Text></Text>
      </View>
      <View className="items-end">
        <Text className={tone === "danger" ? "text-unity-red" : tone === "warning" ? "text-unity-blue" : "text-unity-green"} style={styles.amountSmall}>+ {currency(amount)}</Text>
        <View className="mt-2">
          <StatusChip label={status} tone={tone} />
        </View>
      </View>
      <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

function CollectScreenFrame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <UnityPage headerHeight={180} showBack showBell={false} showLogo={false}>
      <View className="absolute left-0 right-0 top-[-170px] flex-row items-center justify-between px-1">
        <Pressable onPress={() => router.canGoBack() && router.back()}>
          <Ionicons color={colors.white} name="arrow-back" size={24} />
        </Pressable>
        <View className="items-center">
          <Text className="text-white" style={styles.collectTitle}>{title}</Text>
          <Text className="text-unity-teal" style={styles.bodyText}>Unity Credit</Text>
        </View>
        <View className="items-center">
          <Ionicons color={colors.white} name="cloud-outline" size={22} />
          <Text className="text-white" style={styles.bodyText}>Offline</Text>
        </View>
      </View>
      {children}
    </UnityPage>
  );
}

function InfoNotice({ text }: { text: string }) {
  return (
    <View className="flex-row items-center rounded-xl border border-blue-200 bg-blue-50 p-4">
      <Ionicons color={colors.brand} name="information-circle-outline" size={28} />
      <Text className="ml-3 flex-1 text-blue-900" style={styles.noticeText}>{text}</Text>
    </View>
  );
}

function TargetMemberCard({ target }: { target: AgentTransactionTarget }) {
  return (
    <WhiteCard className="flex-row items-center p-4">
      <IconBubble icon="person-outline" size={38} tone="blue" />
      <View className="ml-3 flex-1">
        <Text className="text-unity-ink" style={styles.cardTitle}>{target.memberName}</Text>
        <Text className="mt-1 text-unity-muted" style={styles.bodyText}>Member ID: {target.memberCode}</Text>
        <View className="mt-2 self-start">
          <StatusChip label="Active" tone="success" />
        </View>
      </View>
      <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
    </WhiteCard>
  );
}

function AmountBox({ amount, onChangeText }: { amount: string; onChangeText: (next: string) => void }) {
  return (
    <View className="rounded-xl border border-unity-line bg-white p-5" style={styles.amountBox}>
      <View className="flex-row items-center">
        <Text className="text-unity-ink" style={styles.bigCurrency}>CFA</Text>
        <TextInput
          keyboardType="numeric"
          onChangeText={onChangeText}
          style={styles.amountInput}
          value={amount}
        />
      </View>
      <Text className="mt-2 text-unity-muted" style={styles.bodyText}>Amount in CFA</Text>
    </View>
  );
}

function MiniConfirm({
  icon,
  label,
  sublabel,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  tone: "blue" | "green";
}) {
  return (
    <View className="flex-1 flex-row items-center rounded-xl border border-unity-line bg-white p-3">
      <Ionicons color={tone === "green" ? colors.success : colors.brand} name={icon} size={24} />
      <View className="ml-3 flex-1">
        <Text className="text-unity-ink" style={styles.smallText}>{label}</Text>
        <Text className="text-unity-muted" style={styles.smallText}>{sublabel}</Text>
      </View>
      <Ionicons color={tone === "green" ? colors.success : colors.brand} name="checkmark-circle" size={20} />
    </View>
  );
}

function QueueRow({ item }: { item: SyncQueueItem }) {
  return (
    <WhiteCard className="mb-4 p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-unity-ink" style={styles.cardTitle}>{item.type}</Text>
          <Text className="mt-1 text-unity-muted" style={styles.bodyText}>{item.memberName}</Text>
        </View>
        {item.amount > 0 ? <Text className="text-unity-green" style={styles.amountSmall}>{currency(item.amount)}</Text> : null}
      </View>
      <Text className="mt-3 text-unity-muted" style={styles.bodyText}>{item.note}</Text>
      <View className="mt-3 self-start">
        <StatusChip label={item.status} tone={statusTone(item.status)} />
      </View>
    </WhiteCard>
  );
}

function ProfileMeta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="mt-3 flex-row items-start">
      <Ionicons color={colors.brand} name={icon} size={16} />
      <Text className="ml-3 flex-1 text-unity-muted" style={styles.bodyText}>{text}</Text>
    </View>
  );
}

function SettingsSection({
  rows,
  title,
}: {
  rows: [keyof typeof Ionicons.glyphMap, string, () => void, "blue" | "green" | "orange" | "purple"][];
  title: string;
}) {
  return (
    <WhiteCard className="mb-5">
      <View className="border-b border-unity-line px-5 py-3">
        <Text className="text-unity-ink" style={styles.sectionHeading}>{title}</Text>
      </View>
      {rows.map(([icon, label, onPress, tone], index) => (
        <Pressable key={label} onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
          <View className={`flex-row items-center px-4 py-3 ${index === rows.length - 1 ? "" : "border-b border-unity-line"}`}>
            <IconBubble icon={icon} size={30} tone={tone} />
            <Text className="ml-3 flex-1 text-unity-ink" style={styles.rowTitle}>{label}</Text>
            <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
          </View>
        </Pressable>
      ))}
    </WhiteCard>
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
  autoCapitalize = "sentences",
  icon,
  keyboardType = "default",
  label,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: KeyboardTypeOptions;
  label: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View className="mb-4 flex-row items-center rounded-xl border border-unity-line bg-white px-4">
      <Ionicons color={colors.inkMuted} name={icon} size={20} />
      <View className="ml-3 flex-1 py-3">
        <Text className="text-unity-muted" style={styles.smallText}>{label}</Text>
        <TextInput
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          secureTextEntry={secureTextEntry}
          style={styles.formInput}
          value={value}
        />
      </View>
    </View>
  );
}

function GenderSelect({
  onChange,
  value,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const options = ["Female", "Male", "Other"];

  return (
    <View className="mb-4 rounded-xl border border-unity-line bg-white px-4 py-3">
      <View className="flex-row items-center">
        <Ionicons color={colors.inkMuted} name="people-outline" size={20} />
        <Text className="ml-3 text-unity-muted" style={styles.smallText}>Gender</Text>
      </View>
      <View className="mt-3 flex-row gap-2">
        {options.map((option) => {
          const isSelected = value === option;

          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.genderOption,
                isSelected && styles.genderOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                className={isSelected ? "text-white" : "text-unity-ink"}
                style={styles.genderOptionText}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function RegistrationDatePicker({
  field,
  label,
  maximumDate,
  minimumDate,
  onChange,
  placeholder,
  value,
}: {
  field: RegistrationDateField;
  label: string;
  maximumDate?: Date;
  minimumDate?: Date;
  onChange: (next: string) => void;
  placeholder: string;
  value: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const os = process.env.EXPO_OS;
  const fallbackDate =
    value || !minimumDate ? new Date(1990, 0, 1) : minimumDate;
  const selectedDate = parseDateInputValue(value, fallbackDate);

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
        minimumDate,
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
      <Pressable
        accessibilityLabel={`Select ${label.toLowerCase()}`}
        onPress={openPicker}
        style={({ pressed }) => [styles.dateField, pressed && styles.pressed]}
      >
        <Ionicons color={colors.inkMuted} name="calendar-outline" size={20} />
        <View className="ml-3 flex-1 py-3">
          <Text className="text-unity-muted" style={styles.smallText}>{label}</Text>
          <Text
            className={value ? "text-unity-ink" : "text-unity-muted"}
            style={styles.dateFieldValue}
          >
            {formatDateInputValue(value, placeholder)}
          </Text>
        </View>
        <Ionicons color={colors.inkMuted} name="chevron-down" size={18} />
      </Pressable>
      {showPicker && os !== "android" ? (
        <View style={styles.inlineDatePicker}>
          <DateTimePicker
            display={os === "ios" ? "spinner" : "default"}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            mode="date"
            onChange={handleChange}
            testID={`${field}-picker`}
            value={selectedDate}
          />
        </View>
      ) : null}
    </View>
  );
}

function PrimaryGradientButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <LinearGradient
        colors={["#08BFA9", "#00B99F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.primaryGradient}
      >
        <Text className="text-white" style={styles.primaryButtonText}>{label}</Text>
        <View className="absolute right-5 h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <Ionicons color={colors.white} name="arrow-forward" size={22} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  agentHomeSummaryOverlap: {
    marginBottom: 6,
    marginTop: -84,
    position: "relative",
    zIndex: 3,
  },
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
  actionWide: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    width: "100%",
    padding: 10,
  },
  amountBox: {
    borderBottomColor: colors.success,
    borderBottomWidth: 3,
  },
  amountInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 32,
    lineHeight: 38,
    marginLeft: 12,
  },
  amountSmall: {
    fontFamily: typography.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  avatarText: {
    fontFamily: typography.medium,
    fontSize: 16,
  },
  bigCurrency: {
    fontFamily: typography.body,
    fontSize: 28,
    lineHeight: 34,
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
  collectTitle: {
    fontFamily: typography.heading,
    fontSize: 21,
    lineHeight: 26,
  },
  dateField: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 16,
  },
  dateFieldValue: {
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  depositCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    padding: 10,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  filterChipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  filterText: {
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  floatingAdd: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: colors.teal,
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 11,
    position: "absolute",
    right: 20,
    top: -23,
    zIndex: 4,
  },
  floatingAddText: {
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  formInput: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 16,
    minHeight: 28,
    padding: 0,
  },
  genderOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 8,
  },
  genderOptionSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  genderOptionText: {
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  greetingName: {
    fontFamily: typography.heading,
    fontSize: 21,
    lineHeight: 26,
  },
  greetingSub: {
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 17,
  },
  greetingText: {
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 19,
  },
  heroStatLabel: {
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 16,
  },
  heroStatValue: {
    fontFamily: typography.heading,
    fontSize: 18,
    lineHeight: 23,
  },
  inlineDatePicker: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    overflow: "hidden",
  },
  linkText: {
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  mediumInline: {
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  memberCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    padding: 10,
  },
  memberListAmount: {
    fontFamily: typography.heading,
    fontSize: 13,
    lineHeight: 17,
  },
  memberListName: {
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  noteInput: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 16,
    minHeight: 112,
    padding: 16,
    textAlignVertical: "top",
  },
  noticeText: {
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.78,
  },
  primaryButton: {
    borderRadius: 16,
    marginTop: 22,
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
  profileInitials: {
    fontFamily: typography.heading,
    fontSize: 24,
  },
  profileName: {
    fontFamily: typography.heading,
    fontSize: 18,
    lineHeight: 23,
  },
  rowTitle: {
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  sectionHeading: {
    fontFamily: typography.heading,
    fontSize: 17,
    lineHeight: 22,
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
  stepLabel: {
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 16,
  },
  stepNumber: {
    fontFamily: typography.heading,
    fontSize: 17,
    lineHeight: 22,
  },
});
