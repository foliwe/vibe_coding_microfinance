import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import {
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
import {
  buildTransactionDayGroups,
  buildTransactionMonthTabs,
  formatTransactionRowDate,
  getCurrentTransactionMonthKey,
} from "@/lib/transaction-history";
import { useResource } from "@/lib/use-resource";
import type { LoanCard } from "@/lib/mobile-models";
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
    <Screen subtitle="Support, profile, and account controls for the self-service member shell." title="More">
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
