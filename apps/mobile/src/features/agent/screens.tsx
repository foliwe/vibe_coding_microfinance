import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import {
  ActionTile,
  InfoRow,
  InputField,
  MiniBarChart,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
  SkeletonCard,
  StatCard,
  StatusPill,
  SurfaceCard,
  TransactionRow,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { mobileData } from "@/lib/mobile-data";
import type { AgentDashboard, AssignedMember, SyncQueueItem } from "@/mocks/mobile-data";
import type { TransactionRequest } from "@credit-union/shared";
import { colors, spacing, typography } from "@/theme/tokens";

function useDemoResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let active = true;

    loader().then((value) => {
      if (active) {
        setData(value);
      }
    });

    return () => {
      active = false;
    };
  }, [loader]);

  return data;
}

export function AgentHomeScreen() {
  const data = useDemoResource(mobileData.getAgentDashboard);

  if (!data) {
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
        <TransactionRow
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
  const members = useDemoResource(mobileData.getAssignedMembers);

  return (
    <Screen
      right={<StatusPill label="ONLINE" />}
      subtitle="Search-ready list for assigned members and onboarding follow-up."
      title="Members"
    >
      <InputField label="Search" onChangeText={() => undefined} placeholder="Alice K., MB-0001, village..." value="" />

      {!members ? (
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
  const transactions = useDemoResource(mobileData.getAgentTransactions);

  return (
    <Screen subtitle="Every money state stays explicit in the UI-first shell." title="Transactions">
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroTitle}>Transaction capture remains member-first.</Text>
        <Text style={styles.heroCaption}>Use the deposit and withdrawal forms to preview offline and approval states.</Text>
        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="New Deposit" onPress={() => router.push("/agent/transactions/deposit")} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="New Withdrawal" onPress={() => router.push("/agent/transactions/withdrawal")} />
          </View>
        </View>
      </SurfaceCard>

      {!transactions ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        transactions.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            amount={transaction.amount}
            status={toStatusLabel(transaction.status)}
            subtitle={`${transaction.memberName} · ${transaction.id}`}
            title={transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
          />
        ))
      )}
    </Screen>
  );
}

export function AgentMoreScreen() {
  const data = useDemoResource(mobileData.getAgentDashboard);

  return (
    <Screen subtitle="Utilities, support actions, and session controls for the demo shell." title="More">
      {!data ? <SkeletonCard /> : <StatusPill label={data.syncState} />}
      <ActionTile
        caption="Preview locally stored items that will move in phase 2 sync."
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
        caption="Keep the first-password-change flow visible in the new UI."
        icon="key-outline"
        onPress={() => router.push("/agent/change-password")}
        title="Change Password"
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
  const members = useDemoResource(mobileData.getAssignedMembers);
  const [amount, setAmount] = useState("10000");
  const [note, setNote] = useState("Daily collections from market round");

  const selected = members?.[0];

  return (
    <Screen subtitle="Step 3 of the guided cash capture flow." title="Deposit">
      {!selected ? (
        <SkeletonCard />
      ) : (
        <>
          <SurfaceCard>
            <InfoRow label="Member" value={selected.fullName} />
            <InfoRow label="Code" value={selected.code} />
            <InfoRow label="Status" value="Offline save will show as pending sync" />
          </SurfaceCard>
          <InputField label="Amount" onChangeText={setAmount} placeholder="0" value={amount} />
          <InputField label="Note" multiline onChangeText={setNote} placeholder="Add collection context" value={note} />
          <StatusPill label="PENDING SYNC" />
          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton label="Save Deposit Preview" onPress={() => router.back()} />
          </View>
        </>
      )}
    </Screen>
  );
}

export function AgentWithdrawalScreen() {
  const members = useDemoResource(mobileData.getAssignedMembers);
  const [amount, setAmount] = useState("5000");
  const [reason, setReason] = useState("Working capital withdrawal request");

  const selected = members?.[0];

  return (
    <Screen subtitle="Withdrawals stay explicit about approvals and available cash." title="Withdrawal">
      {!selected ? (
        <SkeletonCard />
      ) : (
        <>
          <SurfaceCard accent="#F7EEE0">
            <InfoRow label="Member" value={selected.fullName} />
            <InfoRow label="Available balance" value={formatCurrency(18500)} />
            <InfoRow label="Branch rule" value="Requires approval above teller threshold" />
          </SurfaceCard>
          <InputField label="Amount" onChangeText={setAmount} placeholder="0" value={amount} />
          <InputField label="Reason" multiline onChangeText={setReason} placeholder="Describe why the cash is needed" value={reason} />
          <StatusPill label="PENDING APPROVAL" />
          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton label="Save Withdrawal Preview" onPress={() => router.back()} />
          </View>
        </>
      )}
    </Screen>
  );
}

export function AgentSyncQueueScreen() {
  const queue = useDemoResource(mobileData.getSyncQueue);

  return (
    <Screen subtitle="Everything waiting locally is visible before reconnecting persistence." title="Sync Queue">
      <StatusPill label="OFFLINE" />
      {!queue ? (
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
  const data = useDemoResource(mobileData.getAgentDashboard);
  const [actualCash, setActualCash] = useState("33000");

  if (!data) {
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
  const data = useDemoResource(mobileData.getAgentDashboard);

  if (!data) {
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
        <InfoRow label="Support" value="Main Branch Ops Desk" />
        <InfoRow label="Contact" value="+233 20 555 0100" />
        <InfoRow label="Mode" value="Demo shell before auth wiring" />
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
      <InputField label="New Password" onChangeText={setNewPassword} placeholder="Enter new password" value={newPassword} />
      <InputField label="Transaction PIN" onChangeText={setPin} placeholder="Create a 4-digit PIN" value={pin} />
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroCaption}>This is a UI-only flow in phase 1. Supabase auth and secure PIN storage return in the next pass.</Text>
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
