import { StatusBar } from "expo-status-bar";
import {
  activeLoan,
  formatCurrency,
  members,
  transactions,
} from "@credit-union/shared";
import { type ReactNode, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { StatusPill } from "./components/status-pill";
import { enqueue, queueSummary, type QueueItem } from "./lib/offline-queue";

type MobileRole = "agent" | "member";
type AgentTab = "today" | "members" | "queue" | "profile";
type MemberTab = "home" | "accounts" | "loans" | "profile";

const initialQueue: QueueItem[] = [
  {
    id: "txn-00045",
    kind: "transaction_request",
    status: "pending_approval",
    createdAt: "2026-03-27T08:53:00Z",
    payload: transactions[0],
  },
  {
    id: "draft-0001",
    kind: "member_draft",
    status: "unsynced",
    createdAt: "2026-03-27T08:20:00Z",
    payload: { name: "Grace F." },
  },
];

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
    >
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Card({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper?: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {helper ? <Text style={styles.cardHelper}>{helper}</Text> : null}
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function App() {
  const [role, setRole] = useState<MobileRole>("agent");
  const [agentTab, setAgentTab] = useState<AgentTab>("today");
  const [memberTab, setMemberTab] = useState<MemberTab>("home");
  const [isOffline, setIsOffline] = useState(true);
  const [queue, setQueue] = useState(initialQueue);
  const [depositAmount, setDepositAmount] = useState("5000");

  const queueStats = useMemo(() => queueSummary(queue), [queue]);

  const submitOfflineDeposit = () => {
    setQueue((current) =>
      enqueue(current, {
        id: `txn-local-${current.length + 1}`,
        kind: "transaction_request",
        status: isOffline ? "unsynced" : "pending_approval",
        createdAt: new Date().toISOString(),
        payload: {
          memberName: members[0].fullName,
          amount: Number(depositAmount || "0"),
        },
      }),
    );
    setDepositAmount("5000");
    setAgentTab("queue");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Expo + React Native shell</Text>
          <Text style={styles.title}>Credit Union Mobile</Text>
          <Text style={styles.subtitle}>
            One mobile app serving field agents and members with role-specific journeys.
          </Text>
        </View>

        <View style={styles.segment}>
          <SegmentButton active={role === "agent"} label="Agent" onPress={() => setRole("agent")} />
          <SegmentButton active={role === "member"} label="Member" onPress={() => setRole("member")} />
        </View>

        {role === "agent" ? (
          <>
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>Field mode</Text>
              <Text style={styles.bannerText}>
                {isOffline
                  ? "Offline queue enabled. Transactions are stored locally until sync."
                  : "Online. New transactions will be submitted for approval immediately."}
              </Text>
              <Pressable onPress={() => setIsOffline((value) => !value)} style={styles.linkButton}>
                <Text style={styles.linkButtonText}>{isOffline ? "Go Online" : "Go Offline"}</Text>
              </Pressable>
            </View>

            <View style={styles.tabRow}>
              {(["today", "members", "queue", "profile"] as AgentTab[]).map((tab) => (
                <SegmentButton
                  active={agentTab === tab}
                  key={tab}
                  label={tab}
                  onPress={() => setAgentTab(tab)}
                />
              ))}
            </View>

            {agentTab === "today" ? (
              <>
                <View style={styles.cardGrid}>
                  <Card title="Opening Float" value={formatCurrency(50000)} />
                  <Card title="Collected" value={formatCurrency(120000)} />
                  <Card title="Pending" value={String(queueStats.pendingApproval)} helper="Awaiting branch review" />
                  <Card title="Unsynced" value={String(queueStats.unsynced)} helper="Queued on device" />
                </View>
                <Section title="Quick Deposit">
                  <View style={styles.formCard}>
                    <Text style={styles.formLabel}>Member</Text>
                    <Text style={styles.formValue}>{members[0].fullName}</Text>
                    <Text style={styles.formLabel}>Account Type</Text>
                    <StatusPill label="savings" />
                    <Text style={styles.formLabel}>Amount</Text>
                    <TextInput
                      value={depositAmount}
                      keyboardType="numeric"
                      onChangeText={setDepositAmount}
                      style={styles.input}
                    />
                    <Pressable onPress={submitOfflineDeposit} style={styles.primaryButton}>
                      <Text style={styles.primaryButtonText}>Submit Deposit</Text>
                    </Pressable>
                  </View>
                </Section>
              </>
            ) : null}

            {agentTab === "members" ? (
              <Section title="Assigned Members">
                {members.map((member) => (
                  <View style={styles.listRow} key={member.id}>
                    <View>
                      <Text style={styles.listTitle}>{member.fullName}</Text>
                      <Text style={styles.listMeta}>
                        {member.occupation} · {member.address}
                      </Text>
                    </View>
                    <StatusPill label={member.status} />
                  </View>
                ))}
              </Section>
            ) : null}

            {agentTab === "queue" ? (
              <Section title="Offline Queue And Approval Status">
                {queue.map((item) => (
                  <View style={styles.listRow} key={item.id}>
                    <View>
                      <Text style={styles.listTitle}>{item.id.toUpperCase()}</Text>
                      <Text style={styles.listMeta}>
                        {item.kind === "transaction_request"
                          ? "Cash transaction"
                          : "Pending member draft"}
                      </Text>
                    </View>
                    <StatusPill label={item.status} />
                  </View>
                ))}
              </Section>
            ) : null}

            {agentTab === "profile" ? (
              <Section title="Agent Profile">
                <View style={styles.formCard}>
                  <Text style={styles.formValue}>Amina</Text>
                  <Text style={styles.listMeta}>Branch: Bamenda Central</Text>
                  <Text style={styles.listMeta}>Transaction PIN: set</Text>
                  <Text style={styles.listMeta}>Trusted device: Agent Phone #3</Text>
                </View>
              </Section>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.tabRow}>
              {(["home", "accounts", "loans", "profile"] as MemberTab[]).map((tab) => (
                <SegmentButton
                  active={memberTab === tab}
                  key={tab}
                  label={tab}
                  onPress={() => setMemberTab(tab)}
                />
              ))}
            </View>

            {memberTab === "home" ? (
              <>
                <View style={styles.cardGrid}>
                  <Card title="Savings" value={formatCurrency(45000)} />
                  <Card title="Deposit" value={formatCurrency(12000)} />
                  <Card title="Pending Transactions" value="1" helper="Awaiting branch approval" />
                  <Card title="Outstanding Principal" value={formatCurrency(activeLoan.remainingPrincipal)} />
                </View>
                <Section title="Recent Activity">
                  {transactions.map((transaction) => (
                    <View style={styles.listRow} key={transaction.id}>
                      <View>
                        <Text style={styles.listTitle}>
                          {transaction.type} · {formatCurrency(transaction.amount)}
                        </Text>
                        <Text style={styles.listMeta}>
                          {transaction.memberName} · handled by {transaction.agentName}
                        </Text>
                      </View>
                      <StatusPill label={transaction.status} />
                    </View>
                  ))}
                </Section>
              </>
            ) : null}

            {memberTab === "accounts" ? (
              <Section title="Accounts">
                <View style={styles.listRow}>
                  <View>
                    <Text style={styles.listTitle}>Savings Account</Text>
                    <Text style={styles.listMeta}>Pending transactions do not affect final balance yet.</Text>
                  </View>
                  <Text style={styles.accountValue}>{formatCurrency(45000)}</Text>
                </View>
                <View style={styles.listRow}>
                  <View>
                    <Text style={styles.listTitle}>Deposit Account</Text>
                    <Text style={styles.listMeta}>Read-only in v1.</Text>
                  </View>
                  <Text style={styles.accountValue}>{formatCurrency(12000)}</Text>
                </View>
              </Section>
            ) : null}

            {memberTab === "loans" ? (
              <Section title="Loan Timeline">
                <View style={styles.formCard}>
                  <Text style={styles.listTitle}>{activeLoan.id.toUpperCase()}</Text>
                  <Text style={styles.listMeta}>
                    Approved principal: {formatCurrency(activeLoan.approvedPrincipal)}
                  </Text>
                  <Text style={styles.listMeta}>
                    Remaining principal: {formatCurrency(activeLoan.remainingPrincipal)}
                  </Text>
                  <Text style={styles.listMeta}>
                    Next interest due: {formatCurrency(activeLoan.nextInterestDue)}
                  </Text>
                  <StatusPill label={activeLoan.status} />
                </View>
              </Section>
            ) : null}

            {memberTab === "profile" ? (
              <Section title="Profile">
                <View style={styles.formCard}>
                  <Text style={styles.formValue}>John Nkem</Text>
                  <Text style={styles.listMeta}>Branch: Bamenda Central</Text>
                  <Text style={styles.listMeta}>Assigned agent: Amina</Text>
                  <Text style={styles.listMeta}>App PIN / biometric: enabled</Text>
                </View>
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4eee4",
  },
  container: {
    padding: 20,
    gap: 18,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    color: "#6c5940",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#20160c",
  },
  subtitle: {
    color: "#5f4a31",
    lineHeight: 20,
  },
  segment: {
    flexDirection: "row",
    gap: 8,
  },
  segmentButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#e7dbc8",
  },
  segmentButtonActive: {
    backgroundColor: "#0f6b57",
  },
  segmentLabel: {
    color: "#4d3d28",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  segmentLabelActive: {
    color: "#fff",
  },
  banner: {
    backgroundColor: "#fffaf2",
    borderRadius: 20,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e4d4bb",
  },
  bannerTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#20160c",
  },
  bannerText: {
    color: "#5f4a31",
    lineHeight: 20,
  },
  linkButton: {
    paddingTop: 8,
  },
  linkButtonText: {
    color: "#0f6b57",
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  cardGrid: {
    gap: 12,
  },
  card: {
    backgroundColor: "#fffaf2",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e4d4bb",
    gap: 4,
  },
  cardLabel: {
    color: "#6c5940",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#20160c",
  },
  cardHelper: {
    color: "#5f4a31",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#20160c",
  },
  formCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e4d4bb",
  },
  formLabel: {
    color: "#6c5940",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  formValue: {
    color: "#20160c",
    fontWeight: "700",
    fontSize: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9c7aa",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  primaryButton: {
    backgroundColor: "#0f6b57",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  listRow: {
    backgroundColor: "#fffaf2",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e4d4bb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  listTitle: {
    color: "#20160c",
    fontWeight: "700",
    fontSize: 16,
  },
  listMeta: {
    color: "#5f4a31",
    lineHeight: 19,
  },
  accountValue: {
    fontWeight: "700",
    color: "#20160c",
  },
});
