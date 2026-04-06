import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
import { getErrorMessage } from "@/lib/errors";
import { mobileData, formatTransactionMonthLabel } from "@/lib/mobile-data";
import type { AgentTransactionTarget } from "@/lib/mobile-data";
import {
  buildTransactionDayGroups,
  buildTransactionMonthTabs,
  formatTransactionRowDate,
  getCurrentTransactionMonthKey,
} from "@/lib/transaction-history";
import { useResource } from "@/lib/use-resource";
import type { SyncQueueItem } from "@/mocks/mobile-data";
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
  transactionPin?: string,
) {
  const amount = Number(amountValue);

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

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getTargetAccountType(value?: string | string[]) {
  const normalized = getSingleParam(value);

  return normalized === "savings" || normalized === "deposit" ? normalized : null;
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
        caption="Create a new member directly from the field workflow."
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
      right={
        <HeaderIconButton
          icon="add-circle-outline"
          label="Add member"
          onPress={() => router.push("/agent/members/add")}
        />
      }
      subtitle="Assigned member names with direct access to each member screen."
      title="Members"
    >
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !members ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : members.length === 0 ? (
        <SurfaceCard accent="#EEF4ED">
          <Text style={styles.heroCaption}>No assigned members are ready in this field shell yet.</Text>
        </SurfaceCard>
      ) : (
        members.map((member) => (
          <Pressable
            key={member.id}
            onPress={() => router.push(`/agent/members/${member.id}`)}
            style={({ pressed }) => [styles.memberListRow, pressed && styles.memberListRowPressed]}
          >
            <Text style={styles.memberListName}>{member.fullName}</Text>
            <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
          </Pressable>
        ))
      )}
    </Screen>
  );
}

export function AgentMemberDetailScreen() {
  const params = useLocalSearchParams<{ memberId?: string | string[] }>();
  const memberId = getSingleParam(params.memberId) ?? "";
  const loader = useMemo(
    () => () => mobileData.getAssignedMemberDetail(memberId),
    [memberId],
  );
  const { data, error, loading } = useResource(loader);
  const member = data?.member ?? null;
  const canTakeSavings = member?.status === "active" && !!data?.savingsTarget;
  const canTakeDeposit = member?.status === "active" && !!data?.depositTarget;

  if (!memberId) {
    return (
      <Screen subtitle="We could not identify which member to open." title="Member">
        <SubmissionErrorCard message="This route is missing a member identifier." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen subtitle="We could not load this member screen." title="Member">
        <ResourceErrorCard message={error} />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen subtitle="Loading member analytics and direct actions." title="Member">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }

  if (!data || !member) {
    return (
      <Screen subtitle="The member could not be found in your assigned list." title="Member">
        <SubmissionErrorCard message="No assigned member record matches this route." />
      </Screen>
    );
  }

  return (
    <Screen subtitle={`${member.code} · ${member.branchName}`} title={member.fullName}>
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroTitle}>{member.fullName}</Text>
        <Text style={styles.heroCaption}>{member.lastActivity}</Text>
        <View style={styles.inlineWrap}>
          <StatusPill label={member.status === "active" ? "APPROVED" : "PENDING APPROVAL"} />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <InfoRow label="Code" value={member.code} />
        <InfoRow label="Phone" value={member.phone} />
        <InfoRow label="Address" value={member.village} />
      </SurfaceCard>

      <SectionHeader title="Balances" />
      <View style={styles.grid}>
        <StatCard label="Savings" value={formatCurrency(member.savingsBalance)} />
        <StatCard label="Deposit" value={formatCurrency(member.depositBalance)} />
      </View>

      <SectionHeader title="Analytics" />
      <SurfaceCard>
        <Text style={styles.sectionCaption}>Savings and deposit balances for this member.</Text>
        <MiniBarChart data={data.analytics} formatValue />
      </SurfaceCard>

      <SectionHeader title="Direct Actions" />
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.sectionCaption}>
          Collect savings or deposit directly for this member using the existing approval flow.
        </Text>
        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              disabled={!canTakeSavings}
              label="Take Savings"
              onPress={() => {
                if (!canTakeSavings) {
                  return;
                }

                router.push({
                  pathname: "/agent/transactions/deposit",
                  params: { accountType: "savings", memberId: member.id },
                });
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton
              disabled={!canTakeDeposit}
              label="Take Deposit"
              onPress={() => {
                if (!canTakeDeposit) {
                  return;
                }

                router.push({
                  pathname: "/agent/transactions/deposit",
                  params: { accountType: "deposit", memberId: member.id },
                });
              }}
            />
          </View>
        </View>
        {!canTakeSavings || !canTakeDeposit ? (
          <Text style={styles.inlineNotice}>
            {member.status !== "active"
              ? "Direct collection is locked until this member becomes active."
              : !data.savingsTarget
                ? "Savings collection is unavailable because no active savings account was found."
                : "Deposit collection is unavailable because no active deposit account was found."}
          </Text>
        ) : null}
      </SurfaceCard>

      <SectionHeader title="Recent Activity" />
      {data.recentTransactions.length === 0 ? (
        <SurfaceCard accent="#EEF4ED">
          <Text style={styles.heroCaption}>No transaction activity has been recorded for this member yet.</Text>
        </SurfaceCard>
      ) : (
        data.recentTransactions.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            amount={transaction.amount}
            dateLabel={formatTransactionRowDate(transaction.createdAt)}
            detailLabel={`${transaction.accountType === "deposit" ? "Deposit" : "Savings"} · ${transaction.agentName}`}
            status={toStatusLabel(transaction.status)}
            typeLabel={transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
          />
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
        caption="Complete first-login security setup or revisit the secure-account screen."
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
  const [fullName, setFullName] = useState("");
  const [idCardNumber, setIdCardNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdAccess, setCreatedAccess] = useState<{
    signInIdentifier: string;
    temporaryPassword: string;
  } | null>(null);

  return (
    <Screen subtitle="Create the member with core identity details only, then let the member complete the rest later." title="Add Member">
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroTitle}>New members can be created directly by the signed-in agent.</Text>
        <Text style={styles.heroCaption}>This keeps the agent assignment and account setup, but leaves the rest of the profile for the member to complete later.</Text>
      </SurfaceCard>

      <InputField
        label="Full Name"
        onChangeText={setFullName}
        placeholder="Enter full legal name"
        value={fullName}
      />
      <InputField
        autoCapitalize="characters"
        label="ID Card Number"
        onChangeText={setIdCardNumber}
        placeholder="Enter ID card number"
        value={idCardNumber}
      />
      <InputField label="Phone" onChangeText={setPhone} placeholder="+233..." value={phone} />
      {createdAccess ? (
        <SurfaceCard accent="#EEF4ED">
          <StatusPill label="APPROVED" />
          <Text style={[styles.heroCaption, { marginTop: spacing.sm }]}>
            Member created. Share these first-login details with the member.
          </Text>
          <InfoRow label="Sign-in Code" value={createdAccess.signInIdentifier} />
          <InfoRow label="Temporary Password" value={createdAccess.temporaryPassword} />
          <View style={{ marginTop: spacing.sm }}>
            <SecondaryButton label="Back To Members" onPress={() => router.replace("/agent/members")} />
          </View>
        </SurfaceCard>
      ) : null}
      {submissionError ? <SubmissionErrorCard message={submissionError} /> : null}
      <PrimaryButton
        label={isSubmitting ? "Creating Member..." : "Create Member"}
        onPress={() => {
          if (isSubmitting || createdAccess) {
            return;
          }

          setSubmissionError(null);
          setCreatedAccess(null);
          setIsSubmitting(true);

          void mobileData
            .createMember({
              fullName,
              idCardNumber,
              phone,
            })
            .then((result) => {
              setCreatedAccess({
                signInIdentifier: result.signInIdentifier,
                temporaryPassword: result.temporaryPassword,
              });
            })
            .catch((nextError) => {
              setSubmissionError(getErrorMessage(nextError, "We could not create the member."));
            })
            .finally(() => {
              setIsSubmitting(false);
            });
        }}
      />
    </Screen>
  );
}

export function AgentDepositScreen() {
  const params = useLocalSearchParams<{
    accountType?: string | string[];
    memberId?: string | string[];
  }>();
  const memberId = getSingleParam(params.memberId);
  const targetAccountType = getTargetAccountType(params.accountType);
  const depositLoader = useMemo(
    () =>
      memberId && targetAccountType
        ? () => mobileData.getDepositTargetForMember(memberId, targetAccountType)
        : mobileData.getDepositTarget,
    [memberId, targetAccountType],
  );
  const { data: target, error, loading } = useResource(depositLoader);
  const [amount, setAmount] = useState("10000");
  const [note, setNote] = useState("Daily collections from market round");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    if (targetAccountType === "deposit") {
      setNote("Deposit collection taken directly for this member");
      return;
    }

    if (targetAccountType === "savings") {
      setNote("Savings collection taken directly for this member");
      return;
    }

    setNote("Daily collections from market round");
  }, [targetAccountType]);

  const screenTitle =
    targetAccountType === "deposit"
      ? "Take Deposit"
      : targetAccountType === "savings"
        ? "Take Savings"
        : "Deposit";
  const emptyStateMessage =
    targetAccountType && memberId
      ? `No active ${targetAccountType} account is ready for deposit capture for this member yet.`
      : "No assigned member with an active account is ready for deposit capture yet.";

  return (
    <Screen
      subtitle={
        targetAccountType && memberId
          ? "Collect directly into the selected member account."
          : "Step 3 of the guided cash capture flow."
      }
      title={screenTitle}
    >
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading ? (
        <SkeletonCard />
      ) : !target ? (
        <SubmissionErrorCard message={emptyStateMessage} />
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
                    if (memberId) {
                      router.replace(`/agent/members/${memberId}`);
                      return;
                    }

                    router.replace("/agent/transactions");
                  })
                  .catch((nextError) => {
                    setSubmissionError(getErrorMessage(nextError, "We could not submit the deposit."));
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
  const [transactionPin, setTransactionPin] = useState("");
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
          <InputField
            label="Transaction PIN"
            onChangeText={setTransactionPin}
            placeholder="Enter your 4-digit PIN"
            secureTextEntry
            value={transactionPin}
          />
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

                void submitTransaction(target, "withdrawal", amount, reason, transactionPin)
                  .then(() => {
                    router.replace("/agent/transactions");
                  })
                  .catch((nextError) => {
                    setSubmissionError(getErrorMessage(nextError, "We could not submit the withdrawal."));
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
  const { data: queue, error, loading, reload } = useResource(mobileData.getSyncQueue);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  async function runSync(action: "sync" | "retry") {
    if (isSyncing) {
      return;
    }

    setActionError(null);
    setIsSyncing(true);

    try {
      if (action === "retry") {
        await mobileData.retryFailedSyncQueue();
      } else {
        await mobileData.syncQueue();
      }

      await reload();
    } catch (nextError) {
      setActionError(getErrorMessage(nextError, "We could not sync the offline queue."));
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Screen subtitle="Everything waiting locally is visible before reconnecting persistence." title="Sync Queue">
      <StatusPill
        label={
          queue?.some((item) => item.status === "FAILED TO SYNC")
            ? "FAILED TO SYNC"
            : queue && queue.length > 0
              ? "PENDING SYNC"
              : "ONLINE"
        }
      />
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !queue ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : queue.length === 0 ? (
        <SurfaceCard accent="#EEF4ED">
          <Text style={styles.heroCaption}>No offline items are waiting to sync right now.</Text>
        </SurfaceCard>
      ) : (
        queue.map((item) => <QueueCard item={item} key={item.id} />)
      )}
      {actionError ? <SubmissionErrorCard message={actionError} /> : null}
      <PrimaryButton
        label={isSyncing ? "Syncing Queue..." : "Sync Now"}
        onPress={() => {
          void runSync("sync");
        }}
      />
      <View style={{ marginTop: spacing.sm }}>
        <SecondaryButton
          label={isSyncing ? "Working..." : "Retry Failed"}
          onPress={() => {
            void runSync("retry");
          }}
        />
      </View>
    </Screen>
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
    if (!data) {
      return;
    }

    setActualCash(String(data.actualCash));
    setVarianceReason(data.varianceReason ?? "");
  }, [data]);

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
  const needsVarianceReason = Math.abs(difference) > 0.001;

  return (
    <Screen subtitle="Submit counted cash for review and track the branch-manager decision here." title="Reconciliation">
      <SurfaceCard accent="#EEF4ED">
        <InfoRow label="Expected cash" value={formatCurrency(data.expectedCash)} />
        <InfoRow label="Status" value={data.statusLabel} />
        {data.submittedAt ? <InfoRow label="Submitted" value={data.submittedAt} /> : null}
        {data.reviewedAt ? <InfoRow label="Reviewed" value={data.reviewedAt} /> : null}
      </SurfaceCard>
      <InputField
        editable={data.canSubmit && !isSubmitting}
        label="Actual Cash"
        onChangeText={setActualCash}
        placeholder="Enter counted amount"
        value={actualCash}
      />
      {needsVarianceReason || data.varianceReason ? (
        <InputField
          editable={data.canSubmit && !isSubmitting}
          label="Variance Reason"
          multiline
          onChangeText={setVarianceReason}
          placeholder="Explain the variance for branch review"
          value={varianceReason}
        />
      ) : null}
      <SurfaceCard>
        <InfoRow label="Difference" value={formatCurrency(difference)} />
        <StatusPill label={data.statusLabel} />
        {data.reviewNote ? (
          <Text style={[styles.heroCaption, { marginTop: spacing.sm }]}>Review note: {data.reviewNote}</Text>
        ) : null}
      </SurfaceCard>
      {successMessage ? (
        <SurfaceCard accent="#EEF4ED">
          <StatusPill label="APPROVED" />
          <Text style={[styles.heroCaption, { marginTop: spacing.sm }]}>{successMessage}</Text>
        </SurfaceCard>
      ) : null}
      {submissionError ? <SubmissionErrorCard message={submissionError} /> : null}
      <PrimaryButton
        label={
          data.canSubmit
            ? isSubmitting
              ? "Submitting Reconciliation..."
              : "Submit Reconciliation"
            : "Refresh Status"
        }
        onPress={() => {
          if (!data.canSubmit) {
            void reload();
            return;
          }

          if (isSubmitting) {
            return;
          }

          setSubmissionError(null);
          setSuccessMessage(null);
          setIsSubmitting(true);

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
            .catch((nextError) => {
              setSubmissionError(getErrorMessage(nextError, "We could not submit the reconciliation."));
            })
            .finally(() => {
              setIsSubmitting(false);
            });
        }}
      />
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
      <Screen subtitle="Agent security setup is only available for signed-in agents." title="Secure Account">
        <SubmissionErrorCard message="Sign in with an agent account to complete secure setup." />
      </Screen>
    );
  }

  const needsPasswordChange = profile.mustChangePassword;
  const needsPinSetup = profile.requiresPinSetup;

  return (
    <Screen
      subtitle={
        needsPasswordChange || needsPinSetup
          ? "Finish first-login security before entering the field workspace."
          : "First-login security is already complete for this account."
      }
      title="Secure Account"
    >
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroCaption}>
          {needsPasswordChange || needsPinSetup
            ? "Set your permanent password and transaction PIN now. Withdrawals stay locked until this step is complete."
            : "Password reset and PIN rotation stay outside this pass. You can return to the field workspace now."}
        </Text>
      </SurfaceCard>
      {needsPasswordChange ? (
        <>
          <InputField
            label="Current Password"
            onChangeText={setOldPassword}
            placeholder="Enter current temporary password"
            secureTextEntry
            value={oldPassword}
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
            onChangeText={setConfirmNewPassword}
            placeholder="Re-enter new password"
            secureTextEntry
            value={confirmNewPassword}
          />
        </>
      ) : null}
      {needsPinSetup ? (
        <>
          <InputField
            label="Transaction PIN"
            onChangeText={setPin}
            placeholder="Create a 4-digit PIN"
            secureTextEntry
            value={pin}
          />
          <InputField
            label="Confirm Transaction PIN"
            onChangeText={setConfirmPin}
            placeholder="Re-enter your 4-digit PIN"
            secureTextEntry
            value={confirmPin}
          />
        </>
      ) : null}
      {submissionError ? <SubmissionErrorCard message={submissionError} /> : null}
      {successMessage ? (
        <SurfaceCard accent="#EEF4ED">
          <StatusPill label="APPROVED" />
          <Text style={[styles.heroCaption, { marginTop: spacing.sm }]}>{successMessage}</Text>
        </SurfaceCard>
      ) : null}
      <PrimaryButton
        label={
          needsPasswordChange || needsPinSetup
            ? isSubmitting
              ? "Securing Account..."
              : "Secure Account"
            : "Back To Agent Home"
        }
        onPress={() => {
          if (!needsPasswordChange && !needsPinSetup) {
            router.replace("/agent");
            return;
          }

          if (isSubmitting) {
            return;
          }

          setSubmissionError(null);
          setSuccessMessage(null);
          setIsSubmitting(true);

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
              setSuccessMessage("Security setup complete. Redirecting to your field workspace.");
              router.replace("/agent");
            })
            .catch((nextError) => {
              setSubmissionError(getErrorMessage(nextError, "We could not secure the account."));
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
  headerIconButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerIconButtonPressed: {
    opacity: 0.8,
  },
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
  memberListRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  memberListRowPressed: {
    opacity: 0.82,
  },
  memberListName: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 16,
  },
  inlineNotice: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
});
