import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import {
  InfoRow,
  InputField,
  MiniBarChart,
  PrimaryButton,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatCard,
  StatusPill,
  SurfaceCard,
  TransactionRow,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { mobileData } from "@/lib/mobile-data";
import type { LoanCard, MemberDashboard } from "@/mocks/mobile-data";
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

export function MemberHomeScreen() {
  const data = useDemoResource(mobileData.getMemberDashboard);

  if (!data) {
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
        <Text style={styles.heroCaption}>Read-only balance momentum from mock account data.</Text>
        <MiniBarChart data={data.flowTrend} />
      </SurfaceCard>
    </Screen>
  );
}

export function MemberTransactionsScreen() {
  const transactions = useDemoResource(mobileData.getMemberTransactions);

  return (
    <Screen subtitle="Pending and approved activity stays easy to read." title="Transactions">
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
            subtitle={`${transaction.id} · ${transaction.createdAt.slice(0, 10)}`}
            title={transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
          />
        ))
      )}
    </Screen>
  );
}

export function MemberLoansScreen() {
  const loans = useDemoResource(mobileData.getLoans);

  return (
    <Screen subtitle="Stage changes remain visible even in a UI-only build." title="Loans">
      {!loans ? (
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
  const data = useDemoResource(mobileData.getMemberDashboard);

  return (
    <Screen subtitle="Support, profile, and account controls for the read-only member shell." title="More">
      {!data ? (
        <SkeletonCard />
      ) : (
        <SurfaceCard accent="#EEF4ED">
          <InfoRow label="Support" value={data.branchContact} />
          <InfoRow label="Branch" value={data.branchName} />
          <InfoRow label="Session" value="Demo mode preview" />
        </SurfaceCard>
      )}
      <PrimaryButton label="View Profile" onPress={() => router.push("/member/more/profile")} />
      <View style={{ marginTop: spacing.sm }}>
        <PrimaryButton label="Change Password" onPress={() => router.push("/member/change-password")} />
      </View>
    </Screen>
  );
}

export function MemberProfileScreen() {
  const profile = useDemoResource(mobileData.getMemberProfile);

  if (!profile) {
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
      <InputField label="New Password" onChangeText={setNewPassword} placeholder="Enter new password" value={newPassword} />
      <InputField label="PIN / biometric fallback" onChangeText={setPin} placeholder="Choose your security code" value={pin} />
      <SurfaceCard accent="#EEF4ED">
        <Text style={styles.heroCaption}>No auth write happens yet. This screen exists to preserve the member shell and route contract.</Text>
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
