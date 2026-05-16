import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";

import {
  ActionTile,
  InfoRow,
  InputField,
  MonthTabStrip,
  MiniBarChart,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
  SkeletonCard,
  StatusPill,
  SurfaceCard,
  TransactionDayHeader,
  TransactionRow,
} from "@/components/ui";
import { formatCurrency, formatMoneyValue } from "@/lib/format";
import { useAppSession } from "@/lib/app-session";
import { getErrorMessage } from "@/lib/errors";
import { mobileData, formatTransactionMonthLabel } from "@/lib/mobile-data";
import {
  buildTransactionDayGroups,
  buildTransactionMonthTabs,
  formatTransactionRowDate,
  getCurrentTransactionMonthKey,
} from "@/lib/transaction-history";
import { useResource } from "@/lib/use-resource";
import type { LoanCard, MobileAccountCard } from "@/lib/mobile-models";
import type { AppContentPageKey, TransactionRequest } from "@credit-union/shared";
import { colors, radii, spacing, typography } from "@/theme/tokens";

function ResourceErrorCard({ message }: { message: string }) {
  return (
    <SurfaceCard accent="#F7EEE0">
      <StatusPill label="REJECTED" />
      <Text style={[styles.heroCaption, { marginTop: spacing.sm }]}>{message}</Text>
    </SurfaceCard>
  );
}

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function MemberContentPageScreen({
  contentKey,
  fallbackTitle,
}: {
  contentKey: AppContentPageKey;
  fallbackTitle: string;
}) {
  const loader = useMemo(
    () => () => mobileData.getContentPage(contentKey),
    [contentKey],
  );
  const { data, error, loading } = useResource(loader);

  return (
    <Screen title={data?.title ?? fallbackTitle}>
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !data ? (
        <SkeletonCard />
      ) : (
        <SurfaceCard>
          <MarkdownContent content={data.content} />
          {data.updatedAt ? (
            <Text style={styles.markdownMeta}>
              Updated {formatTransactionRowDate(data.updatedAt)}
            </Text>
          ) : null}
        </SurfaceCard>
      )}
    </Screen>
  );
}

export function MemberHomeScreen() {
  const { data, error, loading } = useResource(mobileData.getMemberDashboard);
  const {
    data: transactions,
    error: transactionError,
    loading: transactionsLoading,
  } = useResource(mobileData.getMemberTransactions);

  if (error) {
    return (
      <Screen subtitle="We could not load your member dashboard." title="Home">
        <ResourceErrorCard message={error} />
      </Screen>
    );
  }

  if (loading || !data) {
    return (
      <Screen subtitle="Loading the member preview." title="Home">
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }

  return (
    <Screen
      right={
        <HeaderIconButton
          icon="notifications-outline"
          label="Notifications"
          onPress={() => router.push("/member/notifications" as Href)}
        />
      }
      title="Home"
    >
      <SurfaceCard tone="homeHero">
        <SurfaceCard accent={colors.foliwe} tone="hero">
          <View style={styles.balanceHeader}>
            <Text style={styles.heroCaption}>CFA</Text>
            <Ionicons color={colors.ink} name="eye-off-outline" size={22} />
          </View>
          <Text style={styles.heroCaption}>All Accounts</Text>
          <Text style={styles.moneyTitle}>{formatMoneyValue(data.savingsBalance + data.depositBalance)}</Text>
        </SurfaceCard>

        <View style={styles.accountActionRow}>
          <AccountActionButton
            icon="cash-outline"
            label="Deposit"
            onPress={() => router.push("/member/accounts/deposit" as Href)}
          />
          <AccountActionButton
            icon="settings-outline"
            label="Savings"
            onPress={() => router.push("/member/accounts/savings" as Href)}
          />
          <AccountActionButton
            icon="card-outline"
            label="Loan"
            onPress={() => router.push("/member/loans" as Href)}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <MiniBarChart data={data.flowTrend} />
      </SurfaceCard>

      <SectionHeader actionLabel="See All" href="/member/transactions" title="Latest Transactions" />
      {transactionError ? (
        <ResourceErrorCard message={transactionError} />
      ) : transactionsLoading || !transactions ? (
        <SkeletonCard />
      ) : (
        transactions.slice(0, 4).map((transaction) => (
          <TransactionRow
            key={transaction.id}
            amount={transaction.amount}
            dateLabel={formatTransactionRowDate(transaction.createdAt)}
            detailLabel={transaction.memberName || data.memberName}
            onPress={() => router.push(`/member/transactions/${transaction.id}` as Href)}
            status={toStatusLabel(transaction.status)}
            typeLabel={transaction.type === "deposit" ? titleCase(transaction.accountType) : "Withdrawal"}
          />
        ))
      )}
    </Screen>
  );
}

export function MemberAccountTypeScreen({ accountType }: { accountType: "deposit" | "savings" }) {
  const { data: dashboard, error: dashboardError, loading: dashboardLoading } = useResource(mobileData.getMemberDashboard);
  const { data: transactions, error: transactionError, loading: transactionsLoading } = useResource(mobileData.getMemberTransactions);
  const title = accountType === "deposit" ? "Deposit" : "Savings";
  const amount = accountType === "deposit" ? dashboard?.depositBalance ?? 0 : dashboard?.savingsBalance ?? 0;
  const accountTransactions = (transactions ?? []).filter((transaction) => transaction.accountType === accountType);

  return (
    <Screen title={title}>
      {dashboardError ? (
        <ResourceErrorCard message={dashboardError} />
      ) : dashboardLoading || !dashboard ? (
        <SkeletonCard />
      ) : (
        <>
          <SurfaceCard tone="homeHero">
            <SurfaceCard accent={colors.foliwe} tone="hero">
              <View style={styles.balanceHeader}>
                <Text style={styles.heroCaption}>CFA</Text>
                <Ionicons color={colors.ink} name="eye-off-outline" size={22} />
              </View>
              <Text style={styles.heroCaption}>{title} Account</Text>
              <Text style={styles.moneyTitle}>{formatMoneyValue(amount)}</Text>
            </SurfaceCard>
            <View style={styles.accountActionRow}>
              <AccountActionButton icon="cash-outline" label="Deposit" onPress={() => router.replace("/member/accounts/deposit" as Href)} />
              <AccountActionButton icon="settings-outline" label="Savings" onPress={() => router.replace("/member/accounts/savings" as Href)} />
              <AccountActionButton icon="card-outline" label="Loan" onPress={() => router.replace("/member/loans" as Href)} />
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <MiniBarChart data={dashboard.flowTrend} />
          </SurfaceCard>

          <SectionHeader actionLabel="See All" href="/member/transactions" title="Latest Transactions" />
          {transactionError ? (
            <ResourceErrorCard message={transactionError} />
          ) : transactionsLoading || !transactions ? (
            <SkeletonCard />
          ) : accountTransactions.length === 0 ? (
            <SurfaceCard accent="#EEF4ED">
              <Text style={styles.heroCaption}>No {title.toLowerCase()} transactions are ready yet.</Text>
            </SurfaceCard>
          ) : (
            accountTransactions.slice(0, 4).map((transaction) => (
              <TransactionRow
                key={transaction.id}
                amount={transaction.amount}
                dateLabel={formatTransactionRowDate(transaction.createdAt)}
                detailLabel={transaction.memberName || dashboard.memberName}
                onPress={() => router.push(`/member/transactions/${transaction.id}` as Href)}
                status={toStatusLabel(transaction.status)}
                typeLabel={transaction.type === "deposit" ? title : "Withdrawal"}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

export function MemberTransactionsScreen() {
  const { data: transactions, error, loading } = useResource(mobileData.getMemberTransactions);
  const currentMonthKey = useMemo(() => getCurrentTransactionMonthKey(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const monthTabs = useMemo(
    () => buildTransactionMonthTabs(transactions ?? [], currentMonthKey),
    [currentMonthKey, transactions],
  );
  const selectedMonthLabel = useMemo(
    () => monthTabs.find((tab) => tab.key === selectedMonthKey)?.label ?? formatTransactionMonthLabel(new Date()),
    [monthTabs, selectedMonthKey],
  );
  const dayGroups = useMemo(
    () => buildTransactionDayGroups(transactions ?? [], selectedMonthKey),
    [selectedMonthKey, transactions],
  );

  return (
    <Screen subtitle="Pending and approved activity stays easy to read." title="Transactions">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !transactions ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        <>
          <MonthTabStrip onSelect={setSelectedMonthKey} selectedKey={selectedMonthKey} tabs={monthTabs} />
          {dayGroups.length === 0 ? (
            <SurfaceCard accent="#EEF4ED">
              <Text style={styles.heroCaption}>No transactions recorded for {selectedMonthLabel} yet.</Text>
            </SurfaceCard>
          ) : (
            dayGroups.map((group) => (
              <View key={group.key}>
                <TransactionDayHeader label={group.label} />
                {group.transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    amount={transaction.amount}
                    dateLabel={formatTransactionRowDate(transaction.createdAt)}
                    onPress={() => router.push(`/member/transactions/${transaction.id}` as Href)}
                    status={toStatusLabel(transaction.status)}
                    typeLabel={transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
                  />
                ))}
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

export function MemberLoansScreen() {
  const { data: loans, error, loading } = useResource(mobileData.getLoans);
  const { data: dashboard, error: dashboardError, loading: dashboardLoading } = useResource(mobileData.getMemberDashboard);

  return (
    <Screen title="Loan">
      {dashboardError ? (
        <ResourceErrorCard message={dashboardError} />
      ) : dashboardLoading || !dashboard ? (
        <SkeletonCard />
      ) : (
        <>
          <SurfaceCard tone="homeHero">
            <SurfaceCard accent={colors.foliwe} tone="hero">
              <View style={styles.balanceHeader}>
                <Text style={styles.heroCaption}>CFA</Text>
                <Ionicons color={colors.ink} name="eye-off-outline" size={22} />
              </View>
              <Text style={styles.heroCaption}>Loan Account</Text>
              <Text style={styles.moneyTitle}>{formatMoneyValue(dashboard.outstandingLoan)}</Text>
            </SurfaceCard>
            <View style={styles.accountActionRow}>
              <AccountActionButton icon="cash-outline" label="Deposit" onPress={() => router.replace("/member/accounts/deposit" as Href)} />
              <AccountActionButton icon="settings-outline" label="Savings" onPress={() => router.replace("/member/accounts/savings" as Href)} />
              <AccountActionButton icon="card-outline" label="Loan" onPress={() => router.replace("/member/loans" as Href)} />
            </View>
          </SurfaceCard>
          <SurfaceCard>
            <MiniBarChart data={dashboard.flowTrend} />
          </SurfaceCard>
        </>
      )}

      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !loans ? (
        <SkeletonCard />
      ) : (
        loans.map((loan) => (
          <LoanCardView
            key={loan.id}
            loan={loan}
            onPress={() => router.push(`/member/loans/${loan.id}` as Href)}
          />
        ))
      )}
    </Screen>
  );
}

export function MemberAccountsScreen() {
  const { data: accounts, error, loading } = useResource(mobileData.getMemberAccounts);

  return (
    <Screen subtitle="Savings and deposit statements stay separated." title="Accounts">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !accounts ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : accounts.length === 0 ? (
        <SurfaceCard accent="#EEF4ED">
          <Text style={styles.heroCaption}>No active accounts are ready for this member yet.</Text>
        </SurfaceCard>
      ) : (
        accounts.map((account) => <AccountCard key={account.id} account={account} />)
      )}
    </Screen>
  );
}

export function MemberAccountStatementScreen() {
  const params = useLocalSearchParams<{ accountId?: string | string[] }>();
  const accountId = getSingleParam(params.accountId) ?? "";
  const loader = useMemo(
    () => () => mobileData.getMemberAccountStatement(accountId),
    [accountId],
  );
  const { data, error, loading } = useResource(loader);

  return (
    <Screen subtitle="Approved and pending movements for this account." title="Statement">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <SkeletonCard />
      ) : !data ? (
        <ResourceErrorCard message="No account statement matches this route." />
      ) : (
        <>
          <SurfaceCard accent={colors.foliwe} tone="hero">
            <Text style={styles.moneyTitle}>{formatCurrency(data.account.balance)}</Text>
            <Text style={styles.heroCaption}>
              {data.account.accountType.toUpperCase()} · {data.account.accountNumber}
            </Text>
            <StatusPill label={data.account.pendingTransactions > 0 ? "PENDING APPROVAL" : "APPROVED"} />
          </SurfaceCard>
          {data.transactions.length === 0 ? (
            <SurfaceCard accent="#EEF4ED">
              <Text style={styles.heroCaption}>No transactions have been posted to this account yet.</Text>
            </SurfaceCard>
          ) : (
            data.transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                amount={transaction.amount}
                dateLabel={formatTransactionRowDate(transaction.createdAt)}
                detailLabel={transaction.agentName}
                onPress={() => router.push(`/member/transactions/${transaction.id}` as Href)}
                status={toStatusLabel(transaction.status)}
                typeLabel={transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

export function MemberTransactionDetailScreen() {
  const params = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const transactionId = getSingleParam(params.transactionId) ?? "";
  const loader = useMemo(
    () => () => mobileData.getMemberTransactionDetail(transactionId),
    [transactionId],
  );
  const { data: transaction, error, loading } = useResource(loader);

  return (
    <Screen subtitle="Every account movement shows its approval state." title="Transaction">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <SkeletonCard />
      ) : !transaction ? (
        <ResourceErrorCard message="No transaction matches this route for the signed-in member." />
      ) : (
        <>
          <SurfaceCard accent={colors.foliwe} tone="hero">
            <Text style={styles.moneyTitle}>{formatCurrency(transaction.amount)}</Text>
            <Text style={styles.heroCaption}>
              {transaction.type === "deposit" ? "Deposit" : "Withdrawal"} · {transaction.accountType.toUpperCase()}
            </Text>
            <StatusPill label={toStatusLabel(transaction.status)} />
          </SurfaceCard>
          <SurfaceCard>
            <InfoRow label="Member" value={transaction.memberName} />
            <InfoRow label="Agent" value={transaction.agentName} />
            <InfoRow label="Branch" value={transaction.branchName} />
            <InfoRow label="Date" value={formatTransactionRowDate(transaction.createdAt)} />
            <InfoRow label="Reference" value={transaction.id.slice(0, 12).toUpperCase()} />
          </SurfaceCard>
          {transaction.note ? (
            <SurfaceCard accent="#EEF4ED">
              <Text style={styles.cardCaption}>{transaction.note}</Text>
            </SurfaceCard>
          ) : null}
        </>
      )}
    </Screen>
  );
}

export function MemberLoanDetailScreen() {
  const params = useLocalSearchParams<{ loanId?: string | string[] }>();
  const loanId = getSingleParam(params.loanId) ?? "";
  const loader = useMemo(
    () => () => mobileData.getMemberLoanDetail(loanId),
    [loanId],
  );
  const { data: loan, error, loading } = useResource(loader);

  return (
    <Screen subtitle="Loan principal, interest, timeline, and repayment history." title="Loan Detail">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <SkeletonCard />
      ) : !loan ? (
        <ResourceErrorCard message="No loan matches this route for the signed-in member." />
      ) : (
        <>
          <SurfaceCard accent={colors.foliwe} tone="hero">
            <Text style={styles.moneyTitle}>{formatCurrency(loan.remainingPrincipal)}</Text>
            <Text style={styles.heroCaption}>{loan.loanCode} · remaining principal</Text>
            <StatusPill label={toLoanStatusLabel(loan.status)} />
          </SurfaceCard>
          <LoanCardView loan={loan} />
        </>
      )}
    </Screen>
  );
}

export function MemberNotificationsScreen() {
  const { data: notifications, error, loading } = useResource(mobileData.getMemberNotifications);

  return (
    <Screen subtitle="Account, loan, and approval activity in one place." title="Notifications">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !notifications ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : notifications.length === 0 ? (
        <SurfaceCard accent="#EEF4ED">
          <Text style={styles.heroCaption}>No member notifications are waiting right now.</Text>
        </SurfaceCard>
      ) : (
        notifications.map((item) => (
          <SurfaceCard key={item.id}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardCaption}>{item.subtitle}</Text>
              </View>
              {item.amount ? <Text style={styles.cardValue}>{formatCurrency(item.amount)}</Text> : null}
            </View>
            <View style={styles.inlineWrap}>
              <StatusPill label={item.status} />
              <Text style={styles.cardCaption}>{formatTransactionRowDate(item.createdAt)}</Text>
            </View>
          </SurfaceCard>
        ))
      )}
    </Screen>
  );
}

export function MemberMoreScreen() {
  const { signOut } = useAppSession();
  const { data, error, loading } = useResource(mobileData.getMemberDashboard);

  return (
    <Screen title="Profile">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !data ? (
        <SkeletonCard />
      ) : (
        <>
          <View style={styles.profileHero}>
            <View style={styles.profileAvatar}>
              <Ionicons color={colors.white} name="person-outline" size={54} />
            </View>
            <Text style={styles.profileName}>{data.memberName}</Text>
            <Text style={styles.cardCaption}>{data.memberCode} · {data.branchName}</Text>
          </View>
          <View style={styles.profileGrid}>
            <ProfileTile icon="settings-outline" label="Settings" onPress={() => router.push("/member/more/profile")} />
            <ProfileTile icon="mail-unread-outline" label="Notifications" onPress={() => router.push("/member/notifications" as Href)} />
            <ProfileTile icon="shield-checkmark-outline" label="Verification" onPress={() => router.push("/member/more/profile")} />
            <ProfileTile icon="headset-outline" label="Support" onPress={() => router.push("/member/more/profile")} />
            <ProfileTile icon="people-outline" label="About Us" onPress={() => router.push("/member/more/about" as Href)} />
            <ProfileTile icon="scale-outline" label="Legal" onPress={() => router.push("/member/more/legal" as Href)} />
          </View>
        </>
      )}
      <ActionTile
        caption="Update password and account security."
        icon="key-outline"
        onPress={() => router.push("/member/change-password")}
        title="Change Password"
      />
      <View style={{ marginTop: spacing.sm }}>
        <SecondaryButton
          label="Sign Out"
          onPress={() => {
            void signOut();
          }}
        />
      </View>
    </Screen>
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
      <Screen subtitle="We could not load your member profile." title="Profile">
        <ResourceErrorCard message={error} />
      </Screen>
    );
  }

  if (loading || !profile) {
    return (
      <Screen subtitle="Loading member profile." title="Profile">
        <SkeletonCard />
      </Screen>
    );
  }

  const activeProfile = currentProfile ?? profile;

  return (
    <Screen subtitle="Complete the rest of your member record here after onboarding." title="Profile">
      <SurfaceCard>
        <Text style={styles.heroTitle}>{activeProfile.fullName}</Text>
        <Text style={styles.heroCaption}>{activeProfile.code}</Text>
        <InfoRow label="Phone" value={activeProfile.phone} />
        <InfoRow label="ID Card" value={activeProfile.idNumber ?? "Pending"} />
        <InfoRow label="Agent" value={activeProfile.agentName} />
      </SurfaceCard>
      <SurfaceCard accent="#EEF4ED">
        <InfoRow label="Savings" value={formatCurrency(activeProfile.savingsBalance)} />
        <InfoRow label="Deposit" value={formatCurrency(activeProfile.depositBalance)} />
        <InfoRow label="Status" value={activeProfile.status} />
      </SurfaceCard>
      <InputField label="Full Name" onChangeText={setFullName} placeholder="Enter your full name" value={fullName} />
      <InputField label="Phone" onChangeText={setPhone} placeholder="+2376..." value={phone} />
      <InputField label="Date Of Birth" onChangeText={setDateOfBirth} placeholder="1990-08-24" value={dateOfBirth} />
      <InputField label="Gender" onChangeText={setGender} placeholder="Female, Male, or other" value={gender} />
      <InputField label="Occupation" onChangeText={setOccupation} placeholder="Trader" value={occupation} />
      <InputField
        label="Residential Address"
        multiline
        onChangeText={setResidentialAddress}
        placeholder="Mile 4 Nkwen"
        value={residentialAddress}
      />
      <InputField label="Next Of Kin Name" onChangeText={setNextOfKinName} placeholder="Jane Nkem" value={nextOfKinName} />
      <InputField label="Next Of Kin Phone" onChangeText={setNextOfKinPhone} placeholder="+2376..." value={nextOfKinPhone} />
      <InputField
        label="Next Of Kin Address"
        multiline
        onChangeText={setNextOfKinAddress}
        placeholder="Mile 4 Nkwen"
        value={nextOfKinAddress}
      />
      {successMessage ? (
        <SurfaceCard accent="#EEF4ED">
          <StatusPill label="APPROVED" />
          <Text style={[styles.heroCaption, { marginTop: spacing.sm }]}>{successMessage}</Text>
        </SurfaceCard>
      ) : null}
      {submissionError ? <ResourceErrorCard message={submissionError} /> : null}
      <PrimaryButton
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
    </Screen>
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
    <Screen subtitle="Update the temporary password before entering the member workspace." title="Change Password">
      <InputField
        label="Current Password"
        onChangeText={setCurrentPassword}
        placeholder="Enter temporary password"
        secureTextEntry
        value={currentPassword}
      />
      <InputField
        label="New Password"
        onChangeText={setNewPassword}
        placeholder="Choose a new password"
        secureTextEntry
        value={newPassword}
      />
      <InputField
        label="Confirm New Password"
        onChangeText={setConfirmPassword}
        placeholder="Re-enter new password"
        secureTextEntry
        value={confirmPassword}
      />
      {submissionError ? <ResourceErrorCard message={submissionError} /> : null}
      {successMessage ? (
        <SurfaceCard accent="#EEF4ED">
          <StatusPill label="APPROVED" />
          <Text style={[styles.heroCaption, { marginTop: spacing.sm }]}>{successMessage}</Text>
        </SurfaceCard>
      ) : null}
      <PrimaryButton
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
    </Screen>
  );
}

function HeaderIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerIconButtonPressed]}
    >
      <Ionicons color={colors.brand} name={icon} size={24} />
    </Pressable>
  );
}

function AccountActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.accountAction, pressed && styles.cardPressed]}>
      <Ionicons color={colors.ink} name={icon} size={28} />
      <Text style={styles.accountActionLabel}>{label}</Text>
    </Pressable>
  );
}

function ProfileTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.profileTile, pressed && styles.cardPressed]}>
      <Ionicons color={colors.ink} name={icon} size={30} />
      <Text style={styles.profileTileLabel}>{label}</Text>
    </Pressable>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <View style={styles.markdownStack}>
      {content.split(/\r?\n/).map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) {
          return null;
        }

        const heading = line.match(/^(#{1,3})\s+(.+)$/);

        if (heading) {
          const level = heading[1].length;
          return (
            <Text
              key={`${line}-${index}`}
              style={level === 1 ? styles.markdownHeading : styles.markdownSubheading}
            >
              {renderInlineMarkdown(heading[2])}
            </Text>
          );
        }

        const bullet = line.match(/^[-*]\s+(.+)$/);

        if (bullet) {
          return (
            <View key={`${line}-${index}`} style={styles.markdownListRow}>
              <Text style={styles.markdownMarker}>{"\u2022"}</Text>
              <Text style={styles.markdownListText}>{renderInlineMarkdown(bullet[1])}</Text>
            </View>
          );
        }

        const numbered = line.match(/^(\d+)\.\s+(.+)$/);

        if (numbered) {
          return (
            <View key={`${line}-${index}`} style={styles.markdownListRow}>
              <Text style={styles.markdownMarker}>{numbered[1]}.</Text>
              <Text style={styles.markdownListText}>{renderInlineMarkdown(numbered[2])}</Text>
            </View>
          );
        }

        return (
          <Text key={`${line}-${index}`} style={styles.markdownParagraph}>
            {renderInlineMarkdown(line)}
          </Text>
        );
      })}
    </View>
  );
}

function renderInlineMarkdown(text: string) {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith("**")) {
      parts.push(
        <Text key={`${token}-${match.index}`} style={styles.markdownBold}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <Text key={`${token}-${match.index}`} style={styles.markdownItalic}>
          {token.slice(1, -1)}
        </Text>,
      );
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      parts.push(
        <Text key={`${token}-${match.index}`} style={styles.markdownLink}>
          {link?.[1] ?? token}
        </Text>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function AccountCard({ account }: { account: MobileAccountCard }) {
  return (
    <Pressable
      onPress={() => router.push(`/member/accounts/${account.id}` as Href)}
      style={({ pressed }) => pressed && styles.cardPressed}
    >
      <SurfaceCard accent={account.accountType === "deposit" ? colors.foliwe : colors.cardAlt} tone={account.accountType === "deposit" ? "hero" : "default"}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{account.accountType === "deposit" ? "Deposit" : "Savings"}</Text>
            <Text style={styles.cardCaption}>{account.accountNumber}</Text>
          </View>
          <StatusPill label={account.pendingTransactions > 0 ? "PENDING APPROVAL" : "APPROVED"} />
        </View>
        <Text style={styles.moneyTitle}>{formatCurrency(account.balance)}</Text>
        <Text style={styles.cardCaption}>{account.latestActivity}</Text>
      </SurfaceCard>
    </Pressable>
  );
}

function LoanCardView({ loan, onPress }: { loan: LoanCard; onPress?: () => void }) {
  const content = (
    <SurfaceCard>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{loan.loanCode}</Text>
          <Text style={styles.cardCaption}>{loan.repaymentModeLabel}</Text>
        </View>
        <StatusPill label={toLoanStatusLabel(loan.status)} />
      </View>
      <InfoRow label="Approved" value={formatCurrency(loan.approvedPrincipal)} />
      <InfoRow label="Remaining" value={formatCurrency(loan.remainingPrincipal)} />
      <InfoRow label="Next due" value={loan.nextDueLabel} />
      <SectionHeader title="Timeline" />
      {loan.stageTimeline.map((stage) => (
        <View key={stage.id} style={styles.timelineRow}>
          <Text style={styles.timelineLabel}>{stage.label}</Text>
          <Text style={styles.timelineDate}>{stage.date}</Text>
        </View>
      ))}
      <SectionHeader title="Recent payments" />
      {loan.recentPayments.length === 0 ? (
        <Text style={styles.cardCaption}>No repayments recorded yet.</Text>
      ) : (
        <View style={styles.paymentTable}>
          <View style={styles.paymentHeaderRow}>
            <View style={styles.paymentDateCell}>
              <Text style={styles.paymentHeaderText}>Date</Text>
            </View>
            <View style={styles.paymentAmountCell}>
              <Text style={styles.paymentHeaderText}>Principal</Text>
            </View>
            <View style={styles.paymentAmountCell}>
              <Text style={styles.paymentHeaderText}>Interest</Text>
            </View>
          </View>
          {loan.recentPayments.map((payment) => (
            <View key={payment.id} style={styles.paymentDataRow}>
              <View style={styles.paymentDateCell}>
                <Text style={styles.paymentDateText}>{payment.dateLabel}</Text>
              </View>
              <View style={styles.paymentAmountCell}>
                <Text style={styles.paymentAmountText}>{formatCurrency(payment.principalPaid)}</Text>
              </View>
              <View style={styles.paymentAmountCell}>
                <Text style={styles.paymentAmountText}>{formatCurrency(payment.interestPaid)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </SurfaceCard>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.cardPressed}>
      {content}
    </Pressable>
  );
}

function toLoanStatusLabel(status: LoanCard["status"]) {
  if (status === "rejected") {
    return "REJECTED";
  }

  if (status === "defaulted") {
    return "RECONCILIATION REQUIRED";
  }

  if (status === "application_submitted" || status === "under_review") {
    return "PENDING APPROVAL";
  }

  return "APPROVED";
}

function toStatusLabel(status: TransactionRequest["status"]) {
  const map: Record<TransactionRequest["status"], string> = {
    approved: "APPROVED",
    draft: "PENDING SYNC",
    pending_approval: "PENDING APPROVAL",
    rejected: "REJECTED",
    reversed: "REJECTED",
    sync_conflict: "FAILED TO SYNC",
    unsynced: "PENDING SYNC",
  };

  return map[status];
}

const styles = StyleSheet.create({
  headerIconButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 0,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  headerIconButtonPressed: {
    opacity: 0.8,
  },
  cardPressed: {
    opacity: 0.82,
  },
  heroTitle: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },
  heroCaption: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  moneyTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 40,
    lineHeight: 46,
    textAlign: "center",
  },
  balanceHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  accountActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: spacing.xs,
    paddingTop: spacing.sm,
  },
  accountAction: {
    alignItems: "center",
    gap: 2,
    justifyContent: "center",
    minWidth: 76,
  },
  accountActionLabel: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 11,
  },
  inlineWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  profileHero: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xxl,
    marginTop: spacing.md,
  },
  profileAvatar: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 4,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  profileName: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 24,
  },
  profileGrid: {
    backgroundColor: "rgba(210, 236, 205, 0.82)",
    borderRadius: radii.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.sm,
  },
  profileTile: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 9,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 104,
    padding: spacing.md,
  },
  profileTileLabel: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: "center",
  },
  markdownStack: {
    gap: spacing.sm,
  },
  markdownHeading: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 24,
    lineHeight: 30,
  },
  markdownSubheading: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 18,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  markdownParagraph: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  markdownListRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  markdownMarker: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 14,
    lineHeight: 21,
    minWidth: 22,
  },
  markdownListText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  markdownBold: {
    fontFamily: typography.medium,
  },
  markdownItalic: {
    fontStyle: "italic",
  },
  markdownLink: {
    color: colors.brand,
    fontFamily: typography.medium,
  },
  markdownMeta: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 11,
    marginTop: spacing.md,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 16,
  },
  cardCaption: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
  cardValue: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 14,
  },
  timelineRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  timelineLabel: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 14,
  },
  timelineDate: {
    color: colors.inkMuted,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  paymentTable: {
    marginTop: spacing.xs,
  },
  paymentHeaderRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  paymentDataRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  paymentDateCell: {
    flex: 1.1,
  },
  paymentAmountCell: {
    alignItems: "flex-end",
    flex: 1,
  },
  paymentHeaderText: {
    color: colors.inkMuted,
    fontFamily: typography.medium,
    fontSize: 12,
    textTransform: "uppercase",
  },
  paymentDateText: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 14,
  },
  paymentAmountText: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 13,
  },
});
