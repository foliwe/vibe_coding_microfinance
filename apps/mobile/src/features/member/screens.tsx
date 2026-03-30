import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import {
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
import { useAppSession } from "@/lib/app-session";
import { mobileData } from "@/lib/mobile-data";
import { useResource } from "@/lib/use-resource";
import type { LoanCard, MemberDashboard } from "@/mocks/mobile-data";
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

export function MemberHomeScreen() {
  const { data, error, loading } = useResource(mobileData.getMemberDashboard);

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
    <Screen subtitle={`${data.memberCode} · ${data.branchName}`} title="Home">
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroTitle}>{data.memberName}</Text>
        <Text style={styles.heroCaption}>Clear balances, loan visibility, and pending state tracking.</Text>
        <View style={styles.inlineWrap}>
          <StatusPill label={data.syncState} />
          <StatusPill label="APPROVED" />
        </View>
      </SurfaceCard>

      <SectionHeader title="Balances" />
      <View style={styles.grid}>
        <StatCard label="Savings" value={formatCurrency(data.savingsBalance)} />
        <StatCard label="Deposit" value={formatCurrency(data.depositBalance)} />
        <StatCard label="Available" value={formatCurrency(data.availableBalance)} />
      </View>

      <SectionHeader title="Loan Snapshot" />
      <SurfaceCard>
        <InfoRow label="Outstanding" value={formatCurrency(data.outstandingLoan)} />
        <InfoRow label="Next due" value={data.nextDueLabel} />
        <InfoRow label="Branch contact" value={data.branchContact} />
      </SurfaceCard>

      <SectionHeader title="Trend" />
      <SurfaceCard>
        <Text style={styles.heroCaption}>Recent account activity pulled from approved transaction history.</Text>
        <MiniBarChart data={data.flowTrend} />
      </SurfaceCard>
    </Screen>
  );
}

export function MemberTransactionsScreen() {
  const { data: transactions, error, loading } = useResource(mobileData.getMemberTransactions);

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
        transactions.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            amount={transaction.amount}
            status={toStatusLabel(transaction.status)}
            subtitle={`${transaction.id} · ${transaction.createdAt.slice(0, 10)}`}
            title={transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
          />
        ))
      )}
    </Screen>
  );
}

export function MemberLoansScreen() {
  const { data: loans, error, loading } = useResource(mobileData.getLoans);

  return (
    <Screen subtitle="Stage changes remain visible even in a UI-only build." title="Loans">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !loans ? (
        <SkeletonCard />
      ) : (
        loans.map((loan) => (
          <LoanCardView key={loan.id} loan={loan} />
        ))
      )}
    </Screen>
  );
}

export function MemberMoreScreen() {
  const { signOut } = useAppSession();
  const { data, error, loading } = useResource(mobileData.getMemberDashboard);

  return (
    <Screen subtitle="Support, profile, and account controls for the read-only member shell." title="More">
      {error ? (
        <ResourceErrorCard message={error} />
      ) : loading || !data ? (
        <SkeletonCard />
      ) : (
        <SurfaceCard accent="#EEF4ED">
          <InfoRow label="Support" value={data.branchContact} />
          <InfoRow label="Branch" value={data.branchName} />
          <InfoRow label="Session" value="Signed-in member access" />
        </SurfaceCard>
      )}
      <PrimaryButton label="View Profile" onPress={() => router.push("/member/more/profile")} />
      <View style={{ marginTop: spacing.sm }}>
        <PrimaryButton label="Change Password" onPress={() => router.push("/member/change-password")} />
      </View>
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

  return (
    <Screen subtitle="Read-only identity card and support details." title="Profile">
      <SurfaceCard>
        <Text style={styles.heroTitle}>{profile.fullName}</Text>
        <Text style={styles.heroCaption}>{profile.code}</Text>
        <InfoRow label="Phone" value={profile.phone} />
        <InfoRow label="Village" value={profile.village} />
        <InfoRow label="Agent" value={profile.agentName} />
      </SurfaceCard>
      <SurfaceCard accent="#EEF4ED">
        <InfoRow label="Savings" value={formatCurrency(profile.savingsBalance)} />
        <InfoRow label="Deposit" value={formatCurrency(profile.depositBalance)} />
        <InfoRow label="Status" value={profile.status} />
      </SurfaceCard>
    </Screen>
  );
}

export function MemberChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pin, setPin] = useState("");

  return (
    <Screen subtitle="Password and PIN setup stays visible for the later auth pass." title="Change Password">
      <InputField label="Current Password" onChangeText={setCurrentPassword} placeholder="Enter current password" value={currentPassword} />
      <InputField label="New Password" onChangeText={setNewPassword} placeholder="Enter new password" secureTextEntry value={newPassword} />
      <InputField label="PIN / biometric fallback" onChangeText={setPin} placeholder="Choose your security code" secureTextEntry value={pin} />
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroCaption}>Member auth boot is now live. Password and PIN writes still stay on the next implementation pass.</Text>
      </SurfaceCard>
      <PrimaryButton label="Update Security Preview" onPress={() => router.back()} />
    </Screen>
  );
}

function LoanCardView({ loan }: { loan: LoanCard }) {
  return (
    <SurfaceCard>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{loan.loanCode}</Text>
          <Text style={styles.cardCaption}>{loan.repaymentModeLabel}</Text>
        </View>
        <StatusPill label={loan.status === "active" ? "APPROVED" : "PENDING APPROVAL"} />
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
    fontSize: 20,
  },
  heroCaption: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
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
});
