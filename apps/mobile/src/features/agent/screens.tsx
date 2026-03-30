import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import {
  ActivityRow,
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
  StatCard,
  StatusPill,
  SurfaceCard,
  TransactionDayHeader,
  TransactionRow,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useAppSession } from "@/lib/app-session";
import { mobileData, formatTransactionMonthLabel } from "@/lib/mobile-data";
import type { AgentTransactionTarget } from "@/lib/mobile-data";
import {
  buildTransactionDayGroups,
  buildTransactionMonthTabs,
  formatTransactionRowDate,
  getCurrentTransactionMonthKey,
} from "@/lib/transaction-history";
import { useResource } from "@/lib/use-resource";
import type { AgentDashboard, SyncQueueItem } from "@/mocks/mobile-data";
import type { TransactionRequest } from "@credit-union/shared";
import { colors, spacing, typography } from "@/theme/tokens";

function ResourceErrorCard({ message }: { message: string }) {
  return (
    <SurfaceCard accent="#F7EEE0">
      <StatusPill label="REJECTED" />
      <Text style={[styles.heroCaption, { marginTop: spacing.sm }]}>{message}</Text>
    </SurfaceCard>
  );
}

function SubmissionErrorCard({ message }: { message: string }) {
  return (
    <SurfaceCard accent="#F7EEE0">
      <StatusPill label="REJECTED" />
      <Text style={[styles.heroCaption, { marginTop: spacing.sm }]}>{message}</Text>
    </SurfaceCard>
  );
}

async function submitTransaction(
  target: AgentTransactionTarget,
  transactionType: "deposit" | "withdrawal",
  amountValue: string,
  note: string,
) {
  const amount = Number(amountValue);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }

  if (transactionType === "withdrawal" && amount > target.availableBalance) {
    throw new Error("Withdrawal amount cannot exceed the selected account balance.");
  }

  await mobileData.createAgentTransactionRequest({
    amount,
    memberAccountId: target.accountId,
    note,
    transactionType,
  });
}

export function AgentHomeScreen() {
  const { data, error, loading } = useResource(mobileData.getAgentDashboard);

  if (error) {
    return (
      <Screen title="Home" subtitle="We could not load the field dashboard.">
        <ResourceErrorCard message={error} />
      </Screen>
    );
  }

  if (loading || !data) {
    return (
      <Screen title="Agent Home" subtitle="Loading the field dashboard preview.">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }

  return (
    <Screen title="Home" subtitle={`${data.agentName} · ${data.branchName}`}>
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroTitle}>{data.welcomeNote}</Text>
        <Text style={styles.heroCaption}>{data.lastSyncLabel}</Text>
        <View style={styles.inlineWrap}>
          <StatusPill label={data.syncState} />
          <StatusPill label={`${data.pendingSyncCount} Pending Sync`} />
        </View>
      </SurfaceCard>

      <SectionHeader title="Quick Actions" />
      <ActionTile
        caption="Open a new member draft and capture first-contact details."
        icon="person-add-outline"
        onPress={() => router.push("/agent/members/add")}
        title="Add Member"
      />
      <ActionTile
        caption="Record deposits and withdrawals from the field shell."
        icon="swap-horizontal-outline"
        onPress={() => router.push("/agent/transactions/deposit")}
        title="Record Transaction"
      />
      <ActionTile
        caption="See what is waiting locally before sync comes back."
        icon="cloud-upload-outline"
        onPress={() => router.push("/agent/more/sync-queue")}
        title="Sync Queue"
      />
      <ActionTile
        caption="Compare expected cash against what is on hand."
        icon="wallet-outline"
        onPress={() => router.push("/agent/more/reconciliation")}
        title="Reconcile Cash"
      />

      <SectionHeader title="Today Summary" />
      <View style={styles.grid}>
        <StatCard hint="Field collections" label="Collections" value={formatCurrency(data.collectionsToday)} />
        <StatCard hint="Cash requested" label="Withdrawals" value={formatCurrency(data.withdrawalsToday)} />
        <StatCard hint="Awaiting manager action" label="Pending approvals" value={String(data.pendingApprovals)} />
        <StatCard hint={`Expected ${formatCurrency(data.expectedCash)}`} label="Cash on hand" value={formatCurrency(data.cashOnHand)} />
      </View>

      <SectionHeader title="Flow Trend" />
      <SurfaceCard>
        <Text style={styles.sectionCaption}>Collections vs withdrawals volume across the work week.</Text>
        <MiniBarChart data={data.flowTrend} />
      </SurfaceCard>

      <SectionHeader title="Recent Activity" />
      {data.activity.map((item) => (
        <ActivityRow
          key={item.id}
          amount={item.amount}
          status={item.status}
          subtitle={`${item.memberName} · ${item.timeLabel}`}
          title={item.title}
        />
      ))}
    </Screen>
  );
}

export function AgentMembersScreen() {
  const { data: members, error, loading } = useResource(mobileData.getAssignedMembers);

  return (
    <Screen
      right={<StatusPill label="ONLINE" />}
      subtitle="Search-ready list for assigned members and onboarding follow-up."
      title="Members"
    >
      <InputField label="Search" onChangeText={() => undefined} placeholder="Alice K., MB-0001, village..." value="" />

      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !members ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        members.map((member) => (
          <SurfaceCard key={member.id}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{member.fullName}</Text>
                <Text style={styles.cardCaption}>
                  {member.code} · {member.village}
                </Text>
              </View>
              <StatusPill label={member.status === "active" ? "APPROVED" : "PENDING APPROVAL"} />
            </View>
            <InfoRow label="Savings" value={formatCurrency(member.savingsBalance)} />
            <InfoRow label="Deposit" value={formatCurrency(member.depositBalance)} />
            <InfoRow label="Last activity" value={member.lastActivity} />
          </SurfaceCard>
        ))
      )}
    </Screen>
  );
}

export function AgentTransactionsScreen() {
  const { data: transactions, error, loading } = useResource(mobileData.getAgentTransactions);
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
    <Screen subtitle="Every money state stays explicit in the live field shell." title="Transactions">
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroTitle}>Transaction capture remains member-first.</Text>
        <Text style={styles.heroCaption}>Use the deposit and withdrawal forms to preserve the write flow while read-only history now comes from Supabase.</Text>
        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="New Deposit" onPress={() => router.push("/agent/transactions/deposit")} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="New Withdrawal" onPress={() => router.push("/agent/transactions/withdrawal")} />
          </View>
        </View>
      </SurfaceCard>

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
                    detailLabel={transaction.memberName}
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

export function AgentMoreScreen() {
  const { signOut } = useAppSession();
  const { data, error, loading } = useResource(mobileData.getAgentDashboard);

  return (
    <Screen subtitle="Utilities, support actions, and session controls for the signed-in shell." title="More">
      {error ? <ResourceErrorCard message={error} /> : loading || !data ? <SkeletonCard /> : <StatusPill label={data.syncState} />}
      <ActionTile
        caption="Preview locally stored items until queue persistence returns."
        icon="cloud-upload-outline"
        onPress={() => router.push("/agent/more/sync-queue")}
        title="Sync Queue"
      />
      <ActionTile
        caption="Check expected vs actual cash and log differences."
        icon="wallet-outline"
        onPress={() => router.push("/agent/more/reconciliation")}
        title="Cash Reconciliation"
      />
      <ActionTile
        caption="See the agent profile card and branch contact details."
        icon="person-circle-outline"
        onPress={() => router.push("/agent/more/profile")}
        title="Profile"
      />
      <ActionTile
        caption="Keep the first-password-change flow visible while auth writes return."
        icon="key-outline"
        onPress={() => router.push("/agent/change-password")}
        title="Change Password"
      />
      <SecondaryButton
        label="Sign Out"
        onPress={() => {
          void signOut();
        }}
      />
    </Screen>
  );
}

export function AgentAddMemberScreen() {
  const [memberType, setMemberType] = useState("Individual");
  const [nationalId, setNationalId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <Screen subtitle="Demo capture form before draft persistence returns." title="Add Member">
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroTitle}>New member drafts remain visible even in the reset shell.</Text>
        <Text style={styles.heroCaption}>Phase 2 will reconnect photo capture, queue storage, and approval submission.</Text>
      </SurfaceCard>

      <InputField label="Type" onChangeText={setMemberType} placeholder="Individual or group" value={memberType} />
      <InputField label="National ID" onChangeText={setNationalId} placeholder="Enter government ID number" value={nationalId} />
      <InputField label="First Name" onChangeText={setFirstName} placeholder="Enter first name" value={firstName} />
      <InputField label="Last Name" onChangeText={setLastName} placeholder="Enter last name" value={lastName} />
      <InputField label="Phone" onChangeText={setPhone} placeholder="+233..." value={phone} />
      <PrimaryButton label="Save Member Draft" onPress={() => router.back()} />
    </Screen>
  );
}

export function AgentDepositScreen() {
  const { data: target, error, loading } = useResource(mobileData.getDepositTarget);
  const [amount, setAmount] = useState("10000");
  const [note, setNote] = useState("Daily collections from market round");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  return (
    <Screen subtitle="Step 3 of the guided cash capture flow." title="Deposit">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <SkeletonCard />
      ) : !target ? (
        <SubmissionErrorCard message="No assigned member with an active account is ready for deposit capture yet." />
      ) : (
        <>
          <SurfaceCard>
            <InfoRow label="Member" value={target.memberName} />
            <InfoRow label="Code" value={target.memberCode} />
            <InfoRow label="Account" value={`${target.accountNumber} · ${target.accountType.toUpperCase()}`} />
            <InfoRow label="Current balance" value={formatCurrency(target.availableBalance)} />
          </SurfaceCard>
          <InputField label="Amount" onChangeText={setAmount} placeholder="0" value={amount} />
          <InputField label="Note" multiline onChangeText={setNote} placeholder="Add collection context" value={note} />
          <StatusPill label="PENDING APPROVAL" />
          {submissionError ? <SubmissionErrorCard message={submissionError} /> : null}
          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              label={isSubmitting ? "Submitting Deposit..." : "Submit Deposit"}
              onPress={() => {
                if (isSubmitting) {
                  return;
                }

                setSubmissionError(null);
                setIsSubmitting(true);

                void submitTransaction(target, "deposit", amount, note)
                  .then(() => {
                    router.replace("/agent/(tabs)/transactions");
                  })
                  .catch((nextError) => {
                    setSubmissionError(
                      nextError instanceof Error
                        ? nextError.message
                        : "We could not submit the deposit.",
                    );
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
              }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

export function AgentWithdrawalScreen() {
  const { data: target, error, loading } = useResource(mobileData.getWithdrawalTarget);
  const [amount, setAmount] = useState("5000");
  const [reason, setReason] = useState("Working capital withdrawal request");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  return (
    <Screen subtitle="Withdrawals stay explicit about approvals and available cash." title="Withdrawal">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <SkeletonCard />
      ) : !target ? (
        <SubmissionErrorCard message="No assigned member with an active account is ready for withdrawal capture yet." />
      ) : (
        <>
          <SurfaceCard accent="#F7EEE0">
            <InfoRow label="Member" value={target.memberName} />
            <InfoRow label="Code" value={target.memberCode} />
            <InfoRow label="Account" value={`${target.accountNumber} · ${target.accountType.toUpperCase()}`} />
            <InfoRow label="Available balance" value={formatCurrency(target.availableBalance)} />
            <InfoRow label="Branch rule" value="Requires approval above teller threshold" />
          </SurfaceCard>
          <InputField label="Amount" onChangeText={setAmount} placeholder="0" value={amount} />
          <InputField label="Reason" multiline onChangeText={setReason} placeholder="Describe why the cash is needed" value={reason} />
          <StatusPill label="PENDING APPROVAL" />
          {submissionError ? <SubmissionErrorCard message={submissionError} /> : null}
          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              label={isSubmitting ? "Submitting Withdrawal..." : "Submit Withdrawal"}
              onPress={() => {
                if (isSubmitting) {
                  return;
                }

                setSubmissionError(null);
                setIsSubmitting(true);

                void submitTransaction(target, "withdrawal", amount, reason)
                  .then(() => {
                    router.replace("/agent/(tabs)/transactions");
                  })
                  .catch((nextError) => {
                    setSubmissionError(
                      nextError instanceof Error
                        ? nextError.message
                        : "We could not submit the withdrawal.",
                    );
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
              }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

export function AgentSyncQueueScreen() {
  const { data: queue, error, loading } = useResource(mobileData.getSyncQueue);

  return (
    <Screen subtitle="Everything waiting locally is visible before reconnecting persistence." title="Sync Queue">
      <StatusPill label="OFFLINE" />
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !queue ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        queue.map((item) => <QueueCard item={item} key={item.id} />)
      )}
      <PrimaryButton label="Sync Now" onPress={() => undefined} />
      <View style={{ marginTop: spacing.sm }}>
        <SecondaryButton label="Retry Failed" onPress={() => undefined} />
      </View>
    </Screen>
  );
}

export function AgentReconciliationScreen() {
  const { data, error, loading } = useResource(mobileData.getAgentDashboard);
  const [actualCash, setActualCash] = useState("33000");

  if (error) {
    return (
      <Screen subtitle="We could not load reconciliation data." title="Reconciliation">
        <ResourceErrorCard message={error} />
      </Screen>
    );
  }

  if (loading || !data) {
    return (
      <Screen subtitle="Loading reconciliation snapshot." title="Reconciliation">
        <SkeletonCard />
      </Screen>
    );
  }

  const difference = Number(actualCash || "0") - data.expectedCash;

  return (
    <Screen subtitle="Expected and actual cash stay obvious in the reset shell." title="Reconciliation">
      <SurfaceCard accent="#EEF4ED">
        <InfoRow label="Expected cash" value={formatCurrency(data.expectedCash)} />
        <InfoRow label="Cash on hand" value={formatCurrency(data.cashOnHand)} />
      </SurfaceCard>
      <InputField label="Actual Cash" onChangeText={setActualCash} placeholder="Enter counted amount" value={actualCash} />
      <SurfaceCard>
        <InfoRow label="Difference" value={formatCurrency(difference)} />
        <StatusPill label={difference === 0 ? "APPROVED" : "RECONCILIATION REQUIRED"} />
      </SurfaceCard>
      <PrimaryButton label="Submit Reconciliation Preview" onPress={() => router.back()} />
    </Screen>
  );
}

export function AgentProfileScreen() {
  const { data, error, loading } = useResource(mobileData.getAgentDashboard);

  if (error) {
    return (
      <Screen subtitle="We could not load the agent profile." title="Profile">
        <ResourceErrorCard message={error} />
      </Screen>
    );
  }

  if (loading || !data) {
    return (
      <Screen subtitle="Loading profile preview." title="Profile">
        <SkeletonCard />
      </Screen>
    );
  }

  return (
    <Screen subtitle="Operational profile card for the field agent shell." title="Profile">
      <SurfaceCard>
        <Text style={styles.heroTitle}>{data.agentName}</Text>
        <Text style={styles.heroCaption}>{data.agentCode}</Text>
        <View style={styles.inlineWrap}>
          <StatusPill label={data.syncState} />
          <StatusPill label="RECONCILIATION REQUIRED" />
        </View>
      </SurfaceCard>
      <SurfaceCard accent="#EEF4ED">
        <InfoRow label="Branch" value={data.branchName} />
        <InfoRow label="Support" value="Branch operations desk" />
        <InfoRow label="Contact" value="See the assigned branch record in Supabase" />
        <InfoRow label="Mode" value="Signed-in live read shell" />
      </SurfaceCard>
    </Screen>
  );
}

export function AgentChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pin, setPin] = useState("");

  return (
    <Screen subtitle="The first-password-change and PIN setup UI is preserved for later logic." title="Change Password">
      <InputField label="Current Password" onChangeText={setOldPassword} placeholder="Enter current password" value={oldPassword} />
      <InputField label="New Password" onChangeText={setNewPassword} placeholder="Enter new password" secureTextEntry value={newPassword} />
      <InputField label="Transaction PIN" onChangeText={setPin} placeholder="Create a 4-digit PIN" secureTextEntry value={pin} />
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroCaption}>Session boot is now live. Password change and secure PIN writes return in the next pass.</Text>
      </SurfaceCard>
      <PrimaryButton label="Update Credentials Preview" onPress={() => router.back()} />
    </Screen>
  );
}

function QueueCard({ item }: { item: SyncQueueItem }) {
  return (
    <SurfaceCard>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.type}</Text>
          <Text style={styles.cardCaption}>
            {item.memberName} · {item.id}
          </Text>
        </View>
        {item.amount > 0 ? <Text style={styles.cardValue}>{formatCurrency(item.amount)}</Text> : null}
      </View>
      <Text style={styles.cardCaption}>{item.note}</Text>
      <StatusPill label={item.status} />
    </SurfaceCard>
  );
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
  heroTitle: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 18,
    lineHeight: 24,
  },
  heroCaption: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionCaption: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  inlineWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
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
});
