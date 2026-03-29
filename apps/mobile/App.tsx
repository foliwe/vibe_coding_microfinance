import { StatusBar } from "expo-status-bar";
import * as FileSystem from "expo-file-system/legacy";
import {
  calculateMonthlyInterest,
  formatCurrency,
  type TransactionRequestStatus,
  type TransactionType,
} from "@credit-union/shared";
import { type ReactNode, useEffect, useMemo, useState } from "react";
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
import {
  fingerprintPin,
  loadDeviceUserSettings,
  saveDeviceUserSettings,
  type DeviceUserSettings,
} from "./lib/device-state";
import {
  enqueue,
  markQueueItem,
  queueSummary,
  type QueueItem,
  type QueueItemStatus,
} from "./lib/offline-queue";
import {
  formatLabel,
  getConnectivityDescriptor,
  getQueueStatusDescriptor,
  getReconciliationDescriptor,
  getTransactionStatusDescriptor,
} from "./lib/status";
import {
  getSupabaseClient,
  hasSupabaseEnv,
  type MobileProfile,
} from "./lib/supabase";

type MobileRole = "agent" | "member";
type AgentScreen =
  | "home"
  | "transactions"
  | "members"
  | "more"
  | "add-member"
  | "deposit"
  | "withdrawal"
  | "sync-queue"
  | "reconciliation"
  | "profile";
type MemberScreen = "home" | "transactions" | "loans" | "more" | "profile";
type MemberDraftType = "individual" | "group";

type LiveMemberAccount = {
  accountId: string;
  memberId: string;
  fullName: string;
  accountType: "savings" | "deposit";
  accountNumber: string;
  balance: number;
};

type MemberProfileRow = {
  profile_id: string;
  assigned_agent_id: string | null;
  status: string;
};

type MemberAccountRow = {
  id: string;
  member_profile_id: string;
  account_number: string;
  account_type: "savings" | "deposit";
  status: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
};

type CreatedTransactionRequest = {
  id: string;
  status: TransactionRequestStatus;
};

type LiveMemberBalanceAccount = LiveMemberAccount;

type LedgerAccountRow = {
  id: string;
  member_account_id: string | null;
};

type LiveMemberTransaction = {
  id: string;
  type: "deposit" | "withdrawal" | "loan_disbursement" | "loan_repayment" | "reversal";
  amount: number;
  status: TransactionRequestStatus;
  createdAt: string;
  agentName: string;
};

type TransactionHistoryRow = {
  id: string;
  transaction_type: LiveMemberTransaction["type"];
  amount: number | string | null;
  status: TransactionRequestStatus;
  created_at: string;
  agent_profile_id: string;
};

type LiveMemberLoan = {
  id: string;
  approvedPrincipal: number;
  remainingPrincipal: number;
  monthlyInterestRate: number;
  status: string;
  nextInterestDue: number;
};

type LoanRow = {
  id: string;
  approved_principal: number | string | null;
  remaining_principal: number | string | null;
  monthly_interest_rate: number | string | null;
  status: string;
};

type BranchRow = {
  id: string;
  name: string;
  phone: string | null;
};

type AssignedMemberSummary = {
  memberId: string;
  fullName: string;
  accounts: LiveMemberAccount[];
};

type TransactionQueuePayload = {
  memberName: string;
  memberAccountId?: string | null;
  amount: number;
  transactionType: Extract<TransactionType, "deposit" | "withdrawal">;
  mode?: string;
  accountType?: string;
  accountNumber?: string;
  branchName?: string | null;
  actorName?: string | null;
  serverRequestId?: string | null;
};

type MemberDraftQueuePayload = {
  memberType: MemberDraftType;
  nationalId: string | null;
  fullName: string;
  phone: string;
  notes: string | null;
  branchName: string | null;
  photoCaptured: boolean;
};

function toQueueStatus(status: TransactionRequestStatus): QueueItemStatus {
  if (
    status === "pending_approval" ||
    status === "approved" ||
    status === "rejected" ||
    status === "sync_conflict"
  ) {
    return status;
  }

  return "pending_approval";
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return 0;
}

function formatSyncTime(value: string | null) {
  if (!value) {
    return "Not synced yet";
  }

  return new Date(value).toLocaleString();
}

function formatClockTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAgentScreenTitle(screen: AgentScreen) {
  switch (screen) {
    case "home":
      return "Home";
    case "transactions":
      return "Transactions";
    case "members":
      return "Members";
    case "more":
      return "More";
    case "add-member":
      return "Add Member";
    case "deposit":
      return "Deposit";
    case "withdrawal":
      return "Withdrawal";
    case "sync-queue":
      return "Sync Queue";
    case "reconciliation":
      return "Cash Reconciliation";
    case "profile":
      return "Profile";
    default:
      return "Home";
  }
}

function getMemberScreenTitle(screen: MemberScreen) {
  switch (screen) {
    case "home":
      return "Home";
    case "transactions":
      return "Transactions";
    case "loans":
      return "Loans";
    case "more":
      return "More";
    case "profile":
      return "Profile";
    default:
      return "Home";
  }
}

function isAgentPrimaryScreen(screen: AgentScreen) {
  return screen === "home" || screen === "transactions" || screen === "members" || screen === "more";
}

function isMemberPrimaryScreen(screen: MemberScreen) {
  return screen === "home" || screen === "transactions" || screen === "loans" || screen === "more";
}

const initialQueue: QueueItem[] = [];
const queueStorageUri = `${FileSystem.documentDirectory ?? ""}credit-union-mobile-queue.json`;

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success";
}) {
  return (
    <View
      style={[
        styles.notice,
        tone === "error"
          ? styles.noticeError
          : tone === "success"
            ? styles.noticeSuccess
            : styles.noticeInfo,
      ]}
    >
      <Text
        style={[
          styles.noticeText,
          tone === "error"
            ? styles.noticeTextError
            : tone === "success"
              ? styles.noticeTextSuccess
              : styles.noticeTextInfo,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

function MetricCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        variant === "primary"
          ? styles.primaryButton
          : variant === "secondary"
            ? styles.secondaryButton
            : styles.ghostButton,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={
          variant === "primary"
            ? styles.primaryButtonText
            : variant === "secondary"
              ? styles.secondaryButtonText
              : styles.ghostButtonText
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ActionTile({
  title,
  helper,
  onPress,
}: {
  title: string;
  helper: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionTile}>
      <Text style={styles.actionTileTitle}>{title}</Text>
      <Text style={styles.actionTileHelper}>{helper}</Text>
    </Pressable>
  );
}

function AppShell({
  title,
  canGoBack,
  onBack,
  onMenu,
  statusDescriptor,
  pendingSyncCount,
  lastSyncAt,
  bottomItems,
  activeBottomItem,
  onSelectBottomItem,
  children,
}: {
  title: string;
  canGoBack: boolean;
  onBack?: () => void;
  onMenu: () => void;
  statusDescriptor: ReturnType<typeof getConnectivityDescriptor>;
  pendingSyncCount: number;
  lastSyncAt: string | null;
  bottomItems: { key: string; label: string }[];
  activeBottomItem: string;
  onSelectBottomItem: (key: string) => void;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <View style={styles.statusStrip}>
          <StatusPill
            label={statusDescriptor.label}
            tone={statusDescriptor.tone}
          />
          <Text style={styles.statusMeta}>Sync Count: {pendingSyncCount}</Text>
          <Text style={styles.statusMeta}>
            {lastSyncAt ? formatSyncTime(lastSyncAt) : formatClockTime()}
          </Text>
        </View>

        <View style={styles.topBar}>
          <Pressable
            disabled={!canGoBack}
            onPress={onBack}
            style={[styles.topBarButton, !canGoBack && styles.topBarButtonDisabled]}
          >
            <Text style={[styles.topBarButtonText, !canGoBack && styles.topBarButtonTextMuted]}>
              {canGoBack ? "Back" : ""}
            </Text>
          </Pressable>
          <Text style={styles.topBarTitle}>{title}</Text>
          <Pressable onPress={onMenu} style={styles.topBarButton}>
            <Text style={styles.topBarButtonText}>Menu</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>

        <View style={styles.bottomNav}>
          {bottomItems.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => onSelectBottomItem(item.key)}
              style={[
                styles.bottomNavItem,
                activeBottomItem === item.key && styles.bottomNavItemActive,
              ]}
            >
              <Text
                style={[
                  styles.bottomNavLabel,
                  activeBottomItem === item.key && styles.bottomNavLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [role, setRole] = useState<MobileRole>("agent");
  const [agentScreen, setAgentScreen] = useState<AgentScreen>("home");
  const [memberScreen, setMemberScreen] = useState<MemberScreen>("home");
  const [isOffline, setIsOffline] = useState(true);
  const [queue, setQueue] = useState(initialQueue);
  const [hasLoadedQueue, setHasLoadedQueue] = useState(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal">("deposit");
  const [withdrawalPin, setWithdrawalPin] = useState("");
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [agentDeviceSettings, setAgentDeviceSettings] = useState<DeviceUserSettings>({});
  const [agentPinSetup, setAgentPinSetup] = useState("");
  const [agentPinConfirm, setAgentPinConfirm] = useState("");
  const [isSavingAgentPin, setIsSavingAgentPin] = useState(false);
  const [agentNewPassword, setAgentNewPassword] = useState("");
  const [agentConfirmPassword, setAgentConfirmPassword] = useState("");
  const [isChangingAgentPassword, setIsChangingAgentPassword] = useState(false);
  const [agentEmail, setAgentEmail] = useState("");
  const [agentPassword, setAgentPassword] = useState("");
  const [agentProfile, setAgentProfile] = useState<MobileProfile | null>(null);
  const [agentBranchName, setAgentBranchName] = useState<string | null>(null);
  const [agentBranchPhone, setAgentBranchPhone] = useState<string | null>(null);
  const [agentLastSyncAt, setAgentLastSyncAt] = useState<string | null>(null);
  const [liveMemberAccounts, setLiveMemberAccounts] = useState<LiveMemberAccount[]>([]);
  const [selectedLiveAccountId, setSelectedLiveAccountId] = useState<string | null>(null);
  const [selectedAgentMemberId, setSelectedAgentMemberId] = useState<string | null>(null);
  const [memberDraftType, setMemberDraftType] = useState<MemberDraftType>("individual");
  const [draftMemberNationalId, setDraftMemberNationalId] = useState("");
  const [draftMemberFirstName, setDraftMemberFirstName] = useState("");
  const [draftMemberLastName, setDraftMemberLastName] = useState("");
  const [draftMemberPhone, setDraftMemberPhone] = useState("");
  const [draftMemberNotes, setDraftMemberNotes] = useState("");
  const [draftMemberPhotoCaptured, setDraftMemberPhotoCaptured] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [reconciliationActualCash, setReconciliationActualCash] = useState("");
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentMessage, setAgentMessage] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberProfile, setMemberProfile] = useState<MobileProfile | null>(null);
  const [memberBranchName, setMemberBranchName] = useState<string | null>(null);
  const [memberBranchPhone, setMemberBranchPhone] = useState<string | null>(null);
  const [memberLastSyncAt, setMemberLastSyncAt] = useState<string | null>(null);
  const [memberAccounts, setMemberAccounts] = useState<LiveMemberBalanceAccount[]>([]);
  const [memberTransactions, setMemberTransactions] = useState<LiveMemberTransaction[]>([]);
  const [memberLoans, setMemberLoans] = useState<LiveMemberLoan[]>([]);
  const [selectedMemberTransactionId, setSelectedMemberTransactionId] = useState<string | null>(
    null,
  );
  const [selectedMemberLoanId, setSelectedMemberLoanId] = useState<string | null>(null);
  const [memberDeviceSettings, setMemberDeviceSettings] = useState<DeviceUserSettings>({});
  const [memberPinSetup, setMemberPinSetup] = useState("");
  const [memberPinConfirm, setMemberPinConfirm] = useState("");
  const [isSavingMemberPin, setIsSavingMemberPin] = useState(false);
  const [memberNewPassword, setMemberNewPassword] = useState("");
  const [memberConfirmPassword, setMemberConfirmPassword] = useState("");
  const [isChangingMemberPassword, setIsChangingMemberPassword] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberMessage, setMemberMessage] = useState<string | null>(null);
  const [isMemberAuthLoading, setIsMemberAuthLoading] = useState(false);

  const queueStats = useMemo(() => queueSummary(queue), [queue]);
  const liveConfigured = hasSupabaseEnv();
  const selectedLiveAccount = useMemo(
    () =>
      liveMemberAccounts.find((account) => account.accountId === selectedLiveAccountId) ?? null,
    [liveMemberAccounts, selectedLiveAccountId],
  );
  const assignedMembers = useMemo(() => {
    const memberMap = new Map<string, AssignedMemberSummary>();

    for (const account of liveMemberAccounts) {
      const existing = memberMap.get(account.memberId);

      if (existing) {
        existing.accounts.push(account);
        continue;
      }

      memberMap.set(account.memberId, {
        memberId: account.memberId,
        fullName: account.fullName,
        accounts: [account],
      });
    }

    return Array.from(memberMap.values()).sort((left, right) =>
      left.fullName.localeCompare(right.fullName),
    );
  }, [liveMemberAccounts]);
  const filteredAssignedMembers = useMemo(
    () =>
      assignedMembers.filter((member) =>
        member.fullName.toLowerCase().includes(memberSearch.trim().toLowerCase()),
      ),
    [assignedMembers, memberSearch],
  );
  const selectedAssignedMember = useMemo(
    () =>
      assignedMembers.find((member) => member.memberId === selectedAgentMemberId) ??
      (selectedLiveAccount
        ? assignedMembers.find((member) => member.memberId === selectedLiveAccount.memberId) ?? null
        : null),
    [assignedMembers, selectedAgentMemberId, selectedLiveAccount],
  );
  const selectedReceiptItem = useMemo(
    () =>
      queue.find(
        (item) => item.kind === "transaction_request" && item.id === selectedReceiptId,
      ) ??
      queue.find((item) => item.kind === "transaction_request") ??
      null,
    [queue, selectedReceiptId],
  );
  const selectedReceiptPayload =
    selectedReceiptItem?.kind === "transaction_request"
      ? (selectedReceiptItem.payload as TransactionQueuePayload)
      : null;
  const selectedMemberTransaction = useMemo(
    () =>
      memberTransactions.find((transaction) => transaction.id === selectedMemberTransactionId) ??
      memberTransactions[0] ??
      null,
    [memberTransactions, selectedMemberTransactionId],
  );
  const selectedMemberLoan = useMemo(
    () => memberLoans.find((loan) => loan.id === selectedMemberLoanId) ?? memberLoans[0] ?? null,
    [memberLoans, selectedMemberLoanId],
  );
  const liveSavingsBalance = memberAccounts
    .filter((account) => account.accountType === "savings")
    .reduce((sum, account) => sum + account.balance, 0);
  const liveDepositBalance = memberAccounts
    .filter((account) => account.accountType === "deposit")
    .reduce((sum, account) => sum + account.balance, 0);
  const livePendingTransactions = memberTransactions.filter(
    (transaction) => transaction.status === "pending_approval",
  ).length;
  const liveOutstandingPrincipal = memberLoans.reduce(
    (sum, loan) => sum + loan.remainingPrincipal,
    0,
  );
  const memberHasAppPin = Boolean(memberDeviceSettings.pinFingerprint);
  const agentHasTransactionPin = Boolean(agentDeviceSettings.pinFingerprint);
  const agentNeedsPasswordChange = Boolean(agentProfile?.must_change_password);
  const memberNeedsPasswordChange = Boolean(memberProfile?.must_change_password);
  const isAgentSignedIn = Boolean(agentProfile);
  const isMemberSignedIn = Boolean(memberProfile);
  const agentTransactionQueue = queue.filter(
    (item): item is QueueItem<TransactionQueuePayload> => item.kind === "transaction_request",
  );
  const agentRecentActivity = agentTransactionQueue.slice(0, 5);
  const totalQueuedCollections = agentTransactionQueue.reduce((sum, item) => {
    const payload = item.payload;
    return payload.transactionType === "deposit" ? sum + payload.amount : sum;
  }, 0);
  const totalQueuedWithdrawals = agentTransactionQueue.reduce((sum, item) => {
    const payload = item.payload;
    return payload.transactionType === "withdrawal" ? sum + payload.amount : sum;
  }, 0);
  const pendingSyncCount = queueStats.unsynced + queueStats.syncing + queueStats.conflicts;
  const agentStatusDescriptor = getConnectivityDescriptor(
    isOffline,
    isSyncingQueue || queueStats.syncing > 0,
    queueStats.conflicts > 0,
    queueStats.unsynced > 0,
  );
  const memberStatusDescriptor = getConnectivityDescriptor(
    false,
    false,
    false,
    false,
  );
  const reconciliationExpected = totalQueuedCollections - totalQueuedWithdrawals;
  const reconciliationActual = Number(reconciliationActualCash || "0");
  const reconciliationDifference = Number.isFinite(reconciliationActual)
    ? reconciliationActual - reconciliationExpected
    : 0;
  const reconciliationDescriptor = getReconciliationDescriptor(reconciliationDifference);
  const agentBottomItems = [
    { key: "home", label: "Home" },
    { key: "transactions", label: "Transactions" },
    { key: "members", label: "Members" },
    { key: "more", label: "More" },
  ];
  const memberBottomItems = [
    { key: "home", label: "Home" },
    { key: "transactions", label: "Transactions" },
    { key: "loans", label: "Loans" },
    { key: "more", label: "More" },
  ];

  useEffect(() => {
    let isActive = true;

    async function loadPersistedQueue() {
      try {
        if (!queueStorageUri) {
          if (isActive) {
            setHasLoadedQueue(true);
          }

          return;
        }

        const fileInfo = await FileSystem.getInfoAsync(queueStorageUri);

        if (!fileInfo.exists) {
          if (isActive) {
            setHasLoadedQueue(true);
          }

          return;
        }

        const raw = await FileSystem.readAsStringAsync(queueStorageUri);
        const parsed = raw.trim() ? (JSON.parse(raw) as QueueItem[]) : [];

        if (!isActive) {
          return;
        }

        setQueue(Array.isArray(parsed) ? parsed : []);

        if (Array.isArray(parsed) && parsed.length > 0) {
          setAgentMessage(
            `Recovered ${parsed.length} queued item${parsed.length === 1 ? "" : "s"} from device storage.`,
          );
        }
      } catch (error) {
        if (isActive) {
          setAgentError(
            error instanceof Error
              ? `Unable to restore saved queue: ${error.message}`
              : "Unable to restore saved queue.",
          );
        }
      } finally {
        if (isActive) {
          setHasLoadedQueue(true);
        }
      }
    }

    void loadPersistedQueue();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedQueue) {
      return;
    }

    let isActive = true;

    async function persistQueue() {
      try {
        if (!queueStorageUri || !FileSystem.documentDirectory) {
          return;
        }

        await FileSystem.writeAsStringAsync(queueStorageUri, JSON.stringify(queue));

        if (isActive && agentError?.startsWith("Unable to save queue on device")) {
          setAgentError(null);
        }
      } catch (error) {
        if (isActive) {
          setAgentError(
            error instanceof Error
              ? `Unable to save queue on device: ${error.message}`
              : "Unable to save queue on device.",
          );
        }
      }
    }

    void persistQueue();

    return () => {
      isActive = false;
    };
  }, [agentError, hasLoadedQueue, queue]);

  function resetMemberDraftForm() {
    setMemberDraftType("individual");
    setDraftMemberNationalId("");
    setDraftMemberFirstName("");
    setDraftMemberLastName("");
    setDraftMemberPhone("");
    setDraftMemberNotes("");
    setDraftMemberPhotoCaptured(false);
  }

  function selectAssignedMember(memberId: string) {
    setSelectedAgentMemberId(memberId);

    const preferredAccount =
      liveMemberAccounts.find(
        (account) => account.memberId === memberId && account.accountType === "savings",
      ) ?? liveMemberAccounts.find((account) => account.memberId === memberId);

    setSelectedLiveAccountId(preferredAccount?.accountId ?? null);
  }

  async function loadAssignedMemberAccounts(profile: MobileProfile) {
    if (profile.role !== "agent" || !profile.branch_id) {
      setLiveMemberAccounts([]);
      setSelectedLiveAccountId(null);
      setAgentBranchName(null);
      setAgentBranchPhone(null);
      return;
    }

    const supabase = getSupabaseClient();
    const [
      { data: memberProfiles, error: memberProfilesError },
      { data: branchData, error: branchError },
    ] = await Promise.all([
      supabase
        .from("member_profiles")
        .select("profile_id, assigned_agent_id, status")
        .eq("branch_id", profile.branch_id)
        .eq("status", "active")
        .eq("assigned_agent_id", profile.id),
      supabase.from("branches").select("id, name, phone").eq("id", profile.branch_id).maybeSingle(),
    ]);

    if (memberProfilesError) {
      throw new Error(memberProfilesError.message);
    }

    if (branchError) {
      throw new Error(branchError.message);
    }

    const branch = (branchData as BranchRow | null) ?? null;
    setAgentBranchName(branch?.name ?? null);
    setAgentBranchPhone(branch?.phone ?? null);

    const memberIds = ((memberProfiles as MemberProfileRow[] | null) ?? []).map(
      (memberProfile) => memberProfile.profile_id,
    );

    if (!memberIds.length) {
      setLiveMemberAccounts([]);
      setSelectedLiveAccountId(null);
      setSelectedAgentMemberId(null);
      return;
    }

    const [
      { data: accountRows, error: accountError },
      { data: profileRows, error: profileError },
    ] = await Promise.all([
      supabase
        .from("member_accounts")
        .select("id, member_profile_id, account_number, account_type, status")
        .in("member_profile_id", memberIds)
        .eq("status", "active"),
      supabase.from("profiles").select("id, full_name").in("id", memberIds),
    ]);

    if (accountError) {
      throw new Error(accountError.message);
    }

    if (profileError) {
      throw new Error(profileError.message);
    }

    const accountData = ((accountRows as MemberAccountRow[] | null) ?? []).filter(
      (account) => account.account_type === "savings" || account.account_type === "deposit",
    );
    const accountIds = accountData.map((account) => account.id);
    const { data: ledgerAccountRows, error: ledgerAccountError } = accountIds.length
      ? await supabase
          .from("ledger_accounts")
          .select("id, member_account_id")
          .in("member_account_id", accountIds)
      : { data: [] as LedgerAccountRow[], error: null };

    if (ledgerAccountError) {
      throw new Error(ledgerAccountError.message);
    }

    const ledgerAccountMap = new Map(
      ((ledgerAccountRows as LedgerAccountRow[] | null) ?? [])
        .filter((row) => typeof row.member_account_id === "string")
        .map((row) => [row.member_account_id as string, row.id]),
    );
    const balances = new Map<string, number>();

    await Promise.all(
      accountData.map(async (account) => {
        const ledgerAccountId = ledgerAccountMap.get(account.id);

        if (!ledgerAccountId) {
          balances.set(account.id, 0);
          return;
        }

        const { data, error } = await supabase.rpc("get_ledger_account_balance", {
          p_ledger_account_id: ledgerAccountId,
        });

        if (error) {
          throw new Error(error.message);
        }

        balances.set(account.id, toNumber(data as number | string | null));
      }),
    );

    const nameById = new Map(
      ((profileRows as ProfileRow[] | null) ?? []).map((row) => [row.id, row.full_name]),
    );

    const liveAccounts = accountData
      .map((account) => ({
        accountId: account.id,
        memberId: account.member_profile_id,
        fullName: nameById.get(account.member_profile_id) ?? account.member_profile_id,
        accountType: account.account_type,
        accountNumber: account.account_number,
        balance: balances.get(account.id) ?? 0,
      }))
      .sort((left, right) => left.fullName.localeCompare(right.fullName));

    setLiveMemberAccounts(liveAccounts);
    const nextSelectedAccount =
      selectedLiveAccountId &&
      liveAccounts.some((account) => account.accountId === selectedLiveAccountId)
        ? selectedLiveAccountId
        : (liveAccounts[0]?.accountId ?? null);

    setSelectedLiveAccountId(nextSelectedAccount);
    setSelectedAgentMemberId(
      nextSelectedAccount
        ? (liveAccounts.find((account) => account.accountId === nextSelectedAccount)?.memberId ??
            null)
        : null,
    );
    setAgentLastSyncAt(new Date().toISOString());
  }

  function clearMemberSession() {
    setMemberProfile(null);
    setMemberDeviceSettings({});
    setMemberNewPassword("");
    setMemberConfirmPassword("");
    setMemberPinSetup("");
    setMemberPinConfirm("");
    setMemberBranchName(null);
    setMemberBranchPhone(null);
    setMemberLastSyncAt(null);
    setMemberAccounts([]);
    setMemberTransactions([]);
    setMemberLoans([]);
    setSelectedMemberTransactionId(null);
    setSelectedMemberLoanId(null);
    setMemberError(null);
    setMemberMessage(null);
    setMemberPassword("");
    setMemberScreen("home");
  }

  function clearAgentSession() {
    setAgentProfile(null);
    setAgentDeviceSettings({});
    setAgentNewPassword("");
    setAgentConfirmPassword("");
    setAgentPinSetup("");
    setAgentPinConfirm("");
    setAgentBranchName(null);
    setAgentBranchPhone(null);
    setAgentLastSyncAt(null);
    setLiveMemberAccounts([]);
    setSelectedLiveAccountId(null);
    setSelectedAgentMemberId(null);
    setSelectedReceiptId(null);
    resetMemberDraftForm();
    setReconciliationActualCash("");
    setAgentError(null);
    setAgentMessage(null);
    setDepositAmount("");
    setTransactionType("deposit");
    setWithdrawalPin("");
    setAgentPassword("");
    setAgentScreen("home");
  }

  async function loadMemberSnapshot(profile: MobileProfile) {
    const supabase = getSupabaseClient();
    const [
      { data: accountRows, error: accountError },
      { data: transactionRows, error: transactionError },
      { data: loanRows, error: loanError },
      { data: branchData, error: branchError },
    ] = await Promise.all([
      supabase
        .from("member_accounts")
        .select("id, member_profile_id, account_number, account_type, status")
        .eq("member_profile_id", profile.id)
        .eq("status", "active"),
      supabase
        .from("transaction_requests")
        .select("id, transaction_type, amount, status, created_at, agent_profile_id")
        .eq("member_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("loans")
        .select("id, approved_principal, remaining_principal, monthly_interest_rate, status")
        .eq("member_profile_id", profile.id)
        .order("created_at", { ascending: false }),
      profile.branch_id
        ? supabase.from("branches").select("id, name, phone").eq("id", profile.branch_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (accountError) {
      throw new Error(accountError.message);
    }

    if (transactionError) {
      throw new Error(transactionError.message);
    }

    if (loanError) {
      throw new Error(loanError.message);
    }

    if (branchError) {
      throw new Error(branchError.message);
    }

    const branch = (branchData as BranchRow | null) ?? null;
    setMemberBranchName(branch?.name ?? null);
    setMemberBranchPhone(branch?.phone ?? null);

    const accounts = ((accountRows as MemberAccountRow[] | null) ?? []).filter(
      (account) => account.account_type === "savings" || account.account_type === "deposit",
    );
    const accountIds = accounts.map((account) => account.id);

    const { data: ledgerAccountRows, error: ledgerAccountError } = accountIds.length
      ? await supabase
          .from("ledger_accounts")
          .select("id, member_account_id")
          .in("member_account_id", accountIds)
      : { data: [] as LedgerAccountRow[], error: null };

    if (ledgerAccountError) {
      throw new Error(ledgerAccountError.message);
    }

    const ledgerAccountMap = new Map(
      ((ledgerAccountRows as LedgerAccountRow[] | null) ?? [])
        .filter((row) => typeof row.member_account_id === "string")
        .map((row) => [row.member_account_id as string, row.id]),
    );

    const balances = new Map<string, number>();
    await Promise.all(
      accounts.map(async (account) => {
        const ledgerAccountId = ledgerAccountMap.get(account.id);

        if (!ledgerAccountId) {
          balances.set(account.id, 0);
          return;
        }

        const { data, error } = await supabase.rpc("get_ledger_account_balance", {
          p_ledger_account_id: ledgerAccountId,
        });

        if (error) {
          throw new Error(error.message);
        }

        balances.set(account.id, toNumber(data as number | string | null));
      }),
    );

    setMemberAccounts(
      accounts.map((account) => ({
        accountId: account.id,
        memberId: account.member_profile_id,
        fullName: profile.full_name,
        accountType: account.account_type,
        accountNumber: account.account_number,
        balance: balances.get(account.id) ?? 0,
      })),
    );

    const transactionsData = (transactionRows as TransactionHistoryRow[] | null) ?? [];
    const agentIds = Array.from(new Set(transactionsData.map((row) => row.agent_profile_id)));
    const { data: agentProfiles, error: agentProfilesError } = agentIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", agentIds)
      : { data: [] as ProfileRow[], error: null };

    if (agentProfilesError) {
      throw new Error(agentProfilesError.message);
    }

    const agentMap = new Map(
      ((agentProfiles as ProfileRow[] | null) ?? []).map((row) => [row.id, row.full_name]),
    );

    setMemberTransactions(
      transactionsData.map((transaction) => ({
        id: transaction.id,
        type: transaction.transaction_type,
        amount: toNumber(transaction.amount),
        status: transaction.status,
        createdAt: transaction.created_at,
        agentName: agentMap.get(transaction.agent_profile_id) ?? transaction.agent_profile_id,
      })),
    );
    setSelectedMemberTransactionId(transactionsData[0]?.id ?? null);

    const liveLoans = ((loanRows as LoanRow[] | null) ?? []).map((loan) => {
      const remainingPrincipal = toNumber(loan.remaining_principal);
      const monthlyInterestRate = toNumber(loan.monthly_interest_rate);

      return {
        id: loan.id,
        approvedPrincipal: toNumber(loan.approved_principal),
        remainingPrincipal,
        monthlyInterestRate,
        status: loan.status,
        nextInterestDue: calculateMonthlyInterest(remainingPrincipal, monthlyInterestRate),
      };
    });

    setMemberLoans(liveLoans);
    setSelectedMemberLoanId(liveLoans[0]?.id ?? null);
    setMemberLastSyncAt(new Date().toISOString());
  }

  async function handleAgentSignIn() {
    if (!liveConfigured) {
      setAgentError("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }

    setIsAuthLoading(true);
    setAgentError(null);
    setAgentMessage(null);

    try {
      const supabase = getSupabaseClient();
      clearMemberSession();
      const { error } = await supabase.auth.signInWithPassword({
        email: agentEmail.trim(),
        password: agentPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      const { data: profileRows, error: profileError } = await supabase.rpc("get_my_profile");

      if (profileError) {
        throw new Error(profileError.message);
      }

      const profile = Array.isArray(profileRows)
        ? ((profileRows[0] as MobileProfile | null) ?? null)
        : null;

      if (!profile) {
        throw new Error("No matching profile row was found for this user.");
      }

      if (profile.role !== "agent") {
        throw new Error("Only agent accounts should use the live mobile submission flow.");
      }

      setAgentProfile(profile);
      setAgentDeviceSettings(await loadDeviceUserSettings(profile.id));
      await loadAssignedMemberAccounts(profile);
      setAgentMessage("Agent session connected. Mobile field mode is ready.");
      setAgentPassword("");
      setRole("agent");
      setAgentScreen("home");
    } catch (error) {
      clearAgentSession();
      setAgentError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleAgentSignOut() {
    if (!liveConfigured) {
      clearAgentSession();
      return;
    }

    setIsAuthLoading(true);
    setAgentError(null);
    setAgentMessage(null);

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      clearAgentSession();
      setAgentMessage("Agent session cleared.");
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Unable to sign out.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleMemberSignIn() {
    if (!liveConfigured) {
      setMemberError("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }

    setIsMemberAuthLoading(true);
    setMemberError(null);
    setMemberMessage(null);

    try {
      const supabase = getSupabaseClient();
      clearAgentSession();
      const { error } = await supabase.auth.signInWithPassword({
        email: memberEmail.trim(),
        password: memberPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      const { data: profileRows, error: profileError } = await supabase.rpc("get_my_profile");

      if (profileError) {
        throw new Error(profileError.message);
      }

      const profile = Array.isArray(profileRows)
        ? ((profileRows[0] as MobileProfile | null) ?? null)
        : null;

      if (!profile) {
        throw new Error("No matching profile row was found for this user.");
      }

      if (profile.role !== "member") {
        throw new Error("Only member accounts should use the live member view.");
      }

      setMemberProfile(profile);
      setMemberDeviceSettings(await loadDeviceUserSettings(profile.id));
      await loadMemberSnapshot(profile);
      setMemberMessage("Member session connected. Balances and history are loaded.");
      setMemberPassword("");
      setRole("member");
      setMemberScreen("home");
    } catch (error) {
      clearMemberSession();
      setMemberError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsMemberAuthLoading(false);
    }
  }

  async function handleMemberSignOut() {
    if (!liveConfigured) {
      clearMemberSession();
      return;
    }

    setIsMemberAuthLoading(true);
    setMemberError(null);
    setMemberMessage(null);

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      clearMemberSession();
      setMemberMessage("Member session cleared.");
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Unable to sign out.");
    } finally {
      setIsMemberAuthLoading(false);
    }
  }

  async function handleRefreshMemberSnapshot() {
    if (!memberProfile) {
      setMemberError("Sign in first to load live member data.");
      return;
    }

    setIsMemberAuthLoading(true);
    setMemberError(null);

    try {
      await loadMemberSnapshot(memberProfile);
      setMemberMessage("Member balances and history refreshed from Supabase.");
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Unable to refresh member data.");
    } finally {
      setIsMemberAuthLoading(false);
    }
  }

  async function handleRefreshAssignedMembers() {
    if (!agentProfile) {
      setAgentError("Sign in first to load assigned member accounts.");
      return;
    }

    setIsAuthLoading(true);
    setAgentError(null);

    try {
      await loadAssignedMemberAccounts(agentProfile);
      setAgentMessage("Assigned member accounts refreshed from Supabase.");
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Unable to refresh members.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  function queueLocalTransaction() {
    const amount = Number(depositAmount || "0");

    if (!selectedLiveAccount) {
      setAgentError("Select a member account before saving a transaction.");
      return;
    }

    const queueId = `txn-local-${Date.now()}`;

    if (transactionType === "withdrawal" && !agentHasTransactionPin) {
      setAgentError("Set your transaction PIN on the Profile screen before recording withdrawals.");
      setAgentScreen("profile");
      return;
    }

    if (transactionType === "withdrawal" && withdrawalPin.trim().length < 4) {
      setAgentError("Enter the transaction PIN before saving a withdrawal.");
      return;
    }

    if (
      transactionType === "withdrawal" &&
      fingerprintPin(withdrawalPin.trim()) !== agentDeviceSettings.pinFingerprint
    ) {
      setAgentError("Transaction PIN does not match the PIN configured on this device.");
      return;
    }

    setQueue((current) =>
      enqueue(current, {
        id: queueId,
        kind: "transaction_request",
        status: "unsynced",
        createdAt: new Date().toISOString(),
        payload: {
          memberName: selectedLiveAccount.fullName,
          memberAccountId: selectedLiveAccount.accountId,
          amount,
          transactionType,
          mode: "offline",
          accountType: selectedLiveAccount.accountType,
          accountNumber: selectedLiveAccount.accountNumber,
          branchName: agentBranchName,
          actorName: agentProfile?.full_name ?? null,
          serverRequestId: null,
        } satisfies TransactionQueuePayload,
      }),
    );
    setDepositAmount("");
    setWithdrawalPin("");
    setSelectedReceiptId(queueId);
    setAgentMessage(
      `${transactionType === "withdrawal" ? "Withdrawal" : "Deposit"} saved locally with PENDING SYNC status.`,
    );
    setAgentError(null);
    setAgentScreen("sync-queue");
  }

  function queueMemberDraft() {
    if (!agentProfile) {
      setAgentError("Sign in first to create a member draft.");
      setAgentScreen("profile");
      return;
    }

    const fullName =
      memberDraftType === "group"
        ? draftMemberFirstName.trim()
        : `${draftMemberFirstName.trim()} ${draftMemberLastName.trim()}`.trim();

    if (!fullName || !draftMemberPhone.trim()) {
      setAgentError("Enter the member name and phone number before saving.");
      return;
    }

    if (memberDraftType === "individual" && !draftMemberNationalId.trim()) {
      setAgentError("National ID is required for individual member drafts.");
      return;
    }

    const nextId = `draft-local-${Date.now()}`;

    setQueue((current) =>
      enqueue(current, {
        id: nextId,
        kind: "member_draft",
        status: "unsynced",
        createdAt: new Date().toISOString(),
        payload: {
          memberType: memberDraftType,
          nationalId: draftMemberNationalId.trim() || null,
          fullName,
          phone: draftMemberPhone.trim(),
          notes: draftMemberNotes.trim() || null,
          branchName: agentBranchName,
          photoCaptured: draftMemberPhotoCaptured,
        } satisfies MemberDraftQueuePayload,
      }),
    );

    resetMemberDraftForm();
    setAgentError(null);
    setAgentMessage("Member draft saved locally with PENDING SYNC status.");
    setAgentScreen("sync-queue");
  }

  async function handleSubmitTransaction() {
    const amount = Number(depositAmount || "0");

    if (!Number.isFinite(amount) || amount <= 0) {
      setAgentError("Enter a valid transaction amount greater than zero.");
      return;
    }

    if (!selectedLiveAccount) {
      setAgentError("Select a member account before saving a transaction.");
      return;
    }

    if (isOffline || !liveConfigured) {
      queueLocalTransaction();
      return;
    }

    if (!agentProfile) {
      setAgentError("Sign in before submitting live transactions.");
      setAgentScreen("profile");
      return;
    }

    if (transactionType === "withdrawal" && !agentHasTransactionPin) {
      setAgentError("Set your transaction PIN on the Profile screen before recording withdrawals.");
      setAgentScreen("profile");
      return;
    }

    if (transactionType === "withdrawal" && withdrawalPin.trim().length < 4) {
      setAgentError("Enter the transaction PIN before submitting a withdrawal.");
      return;
    }

    if (
      transactionType === "withdrawal" &&
      fingerprintPin(withdrawalPin.trim()) !== agentDeviceSettings.pinFingerprint
    ) {
      setAgentError("Transaction PIN does not match the PIN configured on this device.");
      return;
    }

    setIsSubmittingDeposit(true);
    setAgentError(null);
    setAgentMessage(null);

    try {
      const supabase = getSupabaseClient();
      const idempotencyKey = `mobile-${agentProfile.id}-${Date.now()}`;
      const { data, error } = await supabase.rpc("create_transaction_request", {
        p_actor_id: agentProfile.id,
        p_member_account_id: selectedLiveAccount.accountId,
        p_transaction_type: transactionType,
        p_amount: amount,
        p_note:
          transactionType === "withdrawal"
            ? "Withdrawal submitted from mobile app"
            : "Deposit submitted from mobile app",
        p_idempotency_key: idempotencyKey,
        p_submitted_offline: false,
        p_device_id: "expo-mobile-shell",
        p_payload_hash: `${selectedLiveAccount.accountId}:${amount}:${idempotencyKey}`,
      });

      if (error) {
        throw new Error(error.message);
      }

      const request = data as CreatedTransactionRequest;
      const createdAt = new Date().toISOString();

      setQueue((current) =>
        enqueue(current, {
          id: request.id,
          kind: "transaction_request",
          status: toQueueStatus(request.status),
          createdAt,
          payload: {
            memberName: selectedLiveAccount.fullName,
            memberAccountId: selectedLiveAccount.accountId,
            amount,
            transactionType,
            mode: "live",
            accountType: selectedLiveAccount.accountType,
            accountNumber: selectedLiveAccount.accountNumber,
            branchName: agentBranchName,
            actorName: agentProfile.full_name,
            serverRequestId: request.id,
          } satisfies TransactionQueuePayload,
        }),
      );

      setDepositAmount("");
      setWithdrawalPin("");
      setSelectedReceiptId(request.id);
      setAgentMessage(
        `${transactionType === "withdrawal" ? "Withdrawal" : "Deposit"} request submitted with PENDING APPROVAL status.`,
      );
      setAgentScreen("sync-queue");
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Unable to submit transaction.");
    } finally {
      setIsSubmittingDeposit(false);
    }
  }

  async function handleSyncQueue(mode: "all" | "failed") {
    if (isOffline) {
      setAgentError("Go online before syncing queued transactions.");
      return;
    }

    if (!liveConfigured) {
      setAgentError("Live sync requires Supabase environment variables.");
      return;
    }

    if (!agentProfile) {
      setAgentError("Sign in first to sync queued transactions.");
      setAgentScreen("profile");
      return;
    }

    const itemsToSync = queue.filter(
      (item) =>
        item.kind === "transaction_request" &&
        (mode === "failed"
          ? item.status === "sync_conflict"
          : item.status === "unsynced" || item.status === "sync_conflict"),
    ) as QueueItem<TransactionQueuePayload>[];

    if (!itemsToSync.length) {
      setAgentMessage(
        mode === "failed" ? "No failed transaction items are waiting for retry." : "Nothing is waiting to sync.",
      );
      return;
    }

    setIsSyncingQueue(true);
    setAgentError(null);
    setAgentMessage(null);

    const supabase = getSupabaseClient();
    let nextQueue = [...queue];
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of itemsToSync) {
      nextQueue = markQueueItem(nextQueue, item.id, "syncing");
      setQueue(nextQueue);

      try {
        const payload = item.payload;

        if (!payload.memberAccountId) {
          throw new Error("The queued item is missing a member account reference.");
        }

        const idempotencyKey = `mobile-sync-${agentProfile.id}-${item.id}-${Date.now()}`;
        const { data, error } = await supabase.rpc("create_transaction_request", {
          p_actor_id: agentProfile.id,
          p_member_account_id: payload.memberAccountId,
          p_transaction_type: payload.transactionType,
          p_amount: payload.amount,
          p_note: "Queued transaction synced from mobile device",
          p_idempotency_key: idempotencyKey,
          p_submitted_offline: true,
          p_device_id: "expo-mobile-shell",
          p_payload_hash: `${payload.memberAccountId}:${payload.amount}:${idempotencyKey}`,
        });

        if (error) {
          throw new Error(error.message);
        }

        const request = data as CreatedTransactionRequest;
        nextQueue = nextQueue.map((queueItem) =>
          queueItem.id === item.id
            ? {
                ...queueItem,
                status: toQueueStatus(request.status),
                payload: {
                  ...(queueItem.payload as TransactionQueuePayload),
                  mode: "synced",
                  serverRequestId: request.id,
                },
              }
            : queueItem,
        );
        syncedCount += 1;
      } catch {
        nextQueue = markQueueItem(nextQueue, item.id, "sync_conflict");
        failedCount += 1;
      }

      setQueue(nextQueue);
    }

    setIsSyncingQueue(false);
    if (syncedCount > 0) {
      setAgentLastSyncAt(new Date().toISOString());
    }

    const unsyncedDraftCount = nextQueue.filter(
      (item) => item.kind === "member_draft" && item.status === "unsynced",
    ).length;

    setAgentMessage(
      `Sync complete. ${syncedCount} transaction${syncedCount === 1 ? "" : "s"} synced, ${failedCount} failed.${unsyncedDraftCount ? ` ${unsyncedDraftCount} member draft${unsyncedDraftCount === 1 ? "" : "s"} still require manual backend create flow.` : ""}`,
    );
  }

  async function handleSaveAgentPin() {
    if (!agentProfile) {
      setAgentError("Sign in first to set the transaction PIN.");
      return;
    }

    if (agentPinSetup.trim().length < 4) {
      setAgentError("Use at least 4 digits for the transaction PIN.");
      return;
    }

    if (agentPinSetup !== agentPinConfirm) {
      setAgentError("The transaction PIN confirmation does not match.");
      return;
    }

    setIsSavingAgentPin(true);
    setAgentError(null);

    try {
      const nextSettings = await saveDeviceUserSettings(agentProfile.id, {
        pinFingerprint: fingerprintPin(agentPinSetup.trim()),
        pinUpdatedAt: new Date().toISOString(),
      });

      setAgentDeviceSettings(nextSettings);
      setAgentPinSetup("");
      setAgentPinConfirm("");
      setAgentMessage("Transaction PIN saved on this device.");
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Unable to save the transaction PIN.");
    } finally {
      setIsSavingAgentPin(false);
    }
  }

  async function handleToggleMemberBiometric() {
    if (!memberProfile) {
      setMemberError("Sign in first to update device security settings.");
      return;
    }

    if (!memberHasAppPin) {
      setMemberError("Save an app PIN before enabling biometric unlock.");
      return;
    }

    try {
      const nextSettings = await saveDeviceUserSettings(memberProfile.id, {
        biometricEnabled: !memberDeviceSettings.biometricEnabled,
      });

      setMemberDeviceSettings(nextSettings);
      setMemberMessage(
        nextSettings.biometricEnabled
          ? "Biometric unlock enabled for this device."
          : "Biometric unlock disabled for this device.",
      );
    } catch (error) {
      setMemberError(
        error instanceof Error ? error.message : "Unable to update biometric settings.",
      );
    }
  }

  async function handleSaveMemberPin() {
    if (!memberProfile) {
      setMemberError("Sign in first to set the app PIN.");
      return;
    }

    if (memberPinSetup.trim().length < 4) {
      setMemberError("Use at least 4 digits for the app PIN.");
      return;
    }

    if (memberPinSetup !== memberPinConfirm) {
      setMemberError("The app PIN confirmation does not match.");
      return;
    }

    setIsSavingMemberPin(true);
    setMemberError(null);

    try {
      const nextSettings = await saveDeviceUserSettings(memberProfile.id, {
        pinFingerprint: fingerprintPin(memberPinSetup.trim()),
        pinUpdatedAt: new Date().toISOString(),
      });

      setMemberDeviceSettings(nextSettings);
      setMemberPinSetup("");
      setMemberPinConfirm("");
      setMemberMessage("App PIN saved on this device.");
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Unable to save the app PIN.");
    } finally {
      setIsSavingMemberPin(false);
    }
  }

  async function handleAgentPasswordChange() {
    if (!agentProfile) {
      setAgentError("Sign in first to change the password.");
      return;
    }

    if (agentNewPassword.length < 8) {
      setAgentError("Use at least 8 characters for the new password.");
      return;
    }

    if (agentNewPassword !== agentConfirmPassword) {
      setAgentError("The password confirmation does not match.");
      return;
    }

    setIsChangingAgentPassword(true);
    setAgentError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: agentNewPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: completeError } = await supabase.rpc("complete_password_change");

      if (completeError) {
        throw new Error(completeError.message);
      }

      setAgentProfile({
        ...agentProfile,
        must_change_password: false,
      });
      setAgentNewPassword("");
      setAgentConfirmPassword("");
      setAgentScreen("home");
      setAgentMessage("Password updated. The mobile app is now unlocked.");
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Unable to update the password.");
    } finally {
      setIsChangingAgentPassword(false);
    }
  }

  async function handleMemberPasswordChange() {
    if (!memberProfile) {
      setMemberError("Sign in first to change the password.");
      return;
    }

    if (memberNewPassword.length < 8) {
      setMemberError("Use at least 8 characters for the new password.");
      return;
    }

    if (memberNewPassword !== memberConfirmPassword) {
      setMemberError("The password confirmation does not match.");
      return;
    }

    setIsChangingMemberPassword(true);
    setMemberError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: memberNewPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: completeError } = await supabase.rpc("complete_password_change");

      if (completeError) {
        throw new Error(completeError.message);
      }

      setMemberProfile({
        ...memberProfile,
        must_change_password: false,
      });
      setMemberNewPassword("");
      setMemberConfirmPassword("");
      setMemberScreen("home");
      setMemberMessage("Password updated. The member shell is now unlocked.");
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Unable to update the password.");
    } finally {
      setIsChangingMemberPassword(false);
    }
  }

  function handleTakePhotoPlaceholder() {
    setDraftMemberPhotoCaptured(true);
    setAgentMessage("Photo placeholder captured. Camera integration is not wired yet.");
  }

  function handleSubmitReconciliation() {
    if (!Number.isFinite(reconciliationActual)) {
      setAgentError("Enter a valid actual cash amount.");
      return;
    }

    if (reconciliationDifference === 0) {
      setAgentMessage("Cash reconciliation recorded locally. Status: APPROVED.");
    } else {
      setAgentMessage(
        `Cash reconciliation recorded locally. Difference ${formatCurrency(reconciliationDifference)} requires review.`,
      );
    }
  }

  function handleAgentBack() {
    switch (agentScreen) {
      case "add-member":
        setAgentScreen("members");
        return;
      case "deposit":
      case "withdrawal":
        setAgentScreen("transactions");
        return;
      case "sync-queue":
      case "reconciliation":
      case "profile":
        setAgentScreen("more");
        return;
      default:
        setAgentScreen("home");
    }
  }

  function renderRolePicker() {
    return (
      <View style={styles.rolePicker}>
        <Pressable
          onPress={() => setRole("agent")}
          style={[styles.roleCard, role === "agent" && styles.roleCardActive]}
        >
          <Text style={[styles.roleTitle, role === "agent" && styles.roleTitleActive]}>
            Agent
          </Text>
          <Text style={[styles.roleMeta, role === "agent" && styles.roleMetaActive]}>
            Field collection, members, sync queue, and reconciliation.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setRole("member")}
          style={[styles.roleCard, role === "member" && styles.roleCardActive]}
        >
          <Text style={[styles.roleTitle, role === "member" && styles.roleTitleActive]}>
            Member
          </Text>
          <Text style={[styles.roleMeta, role === "member" && styles.roleMetaActive]}>
            Balances, transactions, loans, and support information.
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderLoginShell(content: ReactNode) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <Text style={styles.loginEyebrow}>Credit Union Mobile</Text>
          <Text style={styles.loginTitle}>Production mobile shell</Text>
          <Text style={styles.loginSubtitle}>
            Offline-first field operations for agents and clear account visibility for members.
          </Text>
          {renderRolePicker()}
          <View style={styles.loginStatusRow}>
            <StatusPill
              label={isOffline ? "OFFLINE" : "ONLINE"}
              tone={isOffline ? "offline" : "online"}
            />
            <Text style={styles.loginStatusText}>Sync Count: {pendingSyncCount}</Text>
            <Text style={styles.loginStatusText}>{formatClockTime()}</Text>
          </View>
          {content}
        </ScrollView>
      </SafeAreaView>
    );
  }

  function renderAgentLogin() {
    return renderLoginShell(
      <>
        {agentError ? <Notice tone="error">{agentError}</Notice> : null}
        {agentMessage ? <Notice tone="success">{agentMessage}</Notice> : null}
        {!liveConfigured ? (
          <Notice>
            Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to enable live login and sync.
          </Notice>
        ) : null}
        <Section title="Login">
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Role</Text>
            <View style={styles.inlineField}>
              <Text style={styles.formValue}>Agent</Text>
            </View>
            <Text style={styles.formLabel}>Email / Code</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setAgentEmail}
              placeholder="agent@creditunion.com"
              style={styles.input}
              value={agentEmail}
            />
            <Text style={styles.formLabel}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setAgentPassword}
              placeholder="Enter your password"
              secureTextEntry
              style={styles.input}
              value={agentPassword}
            />
            <ActionButton
              label={isAuthLoading ? "Logging In..." : "Login"}
              disabled={isAuthLoading || !liveConfigured}
              onPress={handleAgentSignIn}
            />
          </View>
        </Section>
      </>,
    );
  }

  function renderMemberLogin() {
    return renderLoginShell(
      <>
        {memberError ? <Notice tone="error">{memberError}</Notice> : null}
        {memberMessage ? <Notice tone="success">{memberMessage}</Notice> : null}
        {!liveConfigured ? (
          <Notice>
            Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to enable live member reads.
          </Notice>
        ) : null}
        <Section title="Login">
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Role</Text>
            <View style={styles.inlineField}>
              <Text style={styles.formValue}>Member</Text>
            </View>
            <Text style={styles.formLabel}>Email / Code</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setMemberEmail}
              placeholder="member@creditunion.com"
              style={styles.input}
              value={memberEmail}
            />
            <Text style={styles.formLabel}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setMemberPassword}
              placeholder="Enter your password"
              secureTextEntry
              style={styles.input}
              value={memberPassword}
            />
            <ActionButton
              label={isMemberAuthLoading ? "Logging In..." : "Login"}
              disabled={isMemberAuthLoading || !liveConfigured}
              onPress={handleMemberSignIn}
            />
          </View>
        </Section>
      </>,
    );
  }

  function renderAgentPasswordFlow() {
    return renderLoginShell(
      <>
        {agentError ? <Notice tone="error">{agentError}</Notice> : null}
        {agentMessage ? <Notice tone="success">{agentMessage}</Notice> : null}
        <Section title="Change Password">
          <Notice>
            Your account must change its password before field screens are available.
          </Notice>
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>New Password</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setAgentNewPassword}
              placeholder="Enter a new password"
              secureTextEntry
              style={styles.input}
              value={agentNewPassword}
            />
            <Text style={styles.formLabel}>Confirm Password</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setAgentConfirmPassword}
              placeholder="Confirm the new password"
              secureTextEntry
              style={styles.input}
              value={agentConfirmPassword}
            />
            <ActionButton
              label={isChangingAgentPassword ? "Updating Password..." : "Update Password"}
              disabled={isChangingAgentPassword}
              onPress={handleAgentPasswordChange}
            />
            <ActionButton
              label={isAuthLoading ? "Signing Out..." : "Logout"}
              disabled={isAuthLoading}
              onPress={handleAgentSignOut}
              variant="secondary"
            />
          </View>
        </Section>
      </>,
    );
  }

  function renderMemberPasswordFlow() {
    return renderLoginShell(
      <>
        {memberError ? <Notice tone="error">{memberError}</Notice> : null}
        {memberMessage ? <Notice tone="success">{memberMessage}</Notice> : null}
        <Section title="Change Password">
          <Notice>
            Your account must change its password before member screens are available.
          </Notice>
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>New Password</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setMemberNewPassword}
              placeholder="Enter a new password"
              secureTextEntry
              style={styles.input}
              value={memberNewPassword}
            />
            <Text style={styles.formLabel}>Confirm Password</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setMemberConfirmPassword}
              placeholder="Confirm the new password"
              secureTextEntry
              style={styles.input}
              value={memberConfirmPassword}
            />
            <ActionButton
              label={isChangingMemberPassword ? "Updating Password..." : "Update Password"}
              disabled={isChangingMemberPassword}
              onPress={handleMemberPasswordChange}
            />
            <ActionButton
              label={isMemberAuthLoading ? "Signing Out..." : "Logout"}
              disabled={isMemberAuthLoading}
              onPress={handleMemberSignOut}
              variant="secondary"
            />
          </View>
        </Section>
      </>,
    );
  }

  function renderAgentHome() {
    return (
      <>
        <View style={styles.identityCard}>
          <Text style={styles.identityName}>{agentProfile?.full_name ?? "Agent"}</Text>
          <Text style={styles.identityMeta}>Code: {agentProfile?.id ?? "AGENT"}</Text>
          <Text style={styles.identityMeta}>Branch: {agentBranchName ?? "Branch unavailable"}</Text>
          <View style={styles.identityStatusRow}>
            <StatusPill label={agentStatusDescriptor.label} tone={agentStatusDescriptor.tone} />
            <Text style={styles.identityMeta}>{pendingSyncCount} Pending Sync</Text>
          </View>
        </View>

        <Section title="Quick Actions">
          <View style={styles.tileGrid}>
            <ActionTile
              title="+ Add Member"
              helper="Create a local member draft with PENDING SYNC status."
              onPress={() => setAgentScreen("add-member")}
            />
            <ActionTile
              title="+ Record Transaction"
              helper="Select a member and capture a deposit or withdrawal quickly."
              onPress={() => setAgentScreen("transactions")}
            />
            <ActionTile
              title="Sync Queue"
              helper="Review pending, syncing, and failed items."
              onPress={() => setAgentScreen("sync-queue")}
            />
            <ActionTile
              title="Reconcile Cash"
              helper="Compare expected and actual cash before day close."
              onPress={() => setAgentScreen("reconciliation")}
            />
          </View>
        </Section>

        <Section title="Today Summary">
          <View style={styles.metricGrid}>
            <MetricCard title="Collections" value={formatCurrency(totalQueuedCollections)} />
            <MetricCard title="Withdrawals" value={formatCurrency(totalQueuedWithdrawals)} />
            <MetricCard title="Pending Approvals" value={String(queueStats.pendingApproval)} />
            <MetricCard title="Pending Sync" value={String(pendingSyncCount)} />
          </View>
        </Section>

        <Section title="Recent Activity">
          {agentRecentActivity.map((item) => {
            const payload = item.payload;
            const descriptor = getQueueStatusDescriptor(item.status);

            return (
              <View key={item.id} style={styles.listRow}>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>
                    {payload.transactionType === "withdrawal" ? "Withdrawal" : "Deposit"}{" "}
                    {formatCurrency(payload.amount)}
                  </Text>
                  <Text style={styles.listMeta}>{payload.memberName}</Text>
                  <Text style={styles.listMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                <StatusPill label={descriptor.label} tone={descriptor.tone} />
              </View>
            );
          })}
          {agentRecentActivity.length === 0 ? (
            <Notice>No recent field activity yet.</Notice>
          ) : null}
        </Section>
      </>
    );
  }

  function renderAgentTransactions() {
    return (
      <>
        <Section title="Transaction Flow">
          <View style={styles.formCard}>
            <Text style={styles.flowStep}>Step 1: Select Member</Text>
            <Text style={styles.formLabel}>Current Member</Text>
            <Text style={styles.formValue}>
              {selectedLiveAccount?.fullName ?? "Select a member from Members"}
            </Text>
            <Text style={styles.formHelper}>
              {selectedLiveAccount
                ? `${selectedLiveAccount.accountNumber} · ${formatLabel(selectedLiveAccount.accountType)} · Available ${formatCurrency(selectedLiveAccount.balance)}`
                : "Open Members and choose an assigned member account first."}
            </Text>

            <Text style={styles.flowStep}>Step 2: Select Type</Text>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => {
                  setTransactionType("deposit");
                  setAgentScreen("deposit");
                }}
                style={styles.segmentCard}
              >
                <Text style={styles.segmentCardTitle}>Deposit</Text>
                <Text style={styles.segmentCardMeta}>Record incoming cash</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setTransactionType("withdrawal");
                  setAgentScreen("withdrawal");
                }}
                style={styles.segmentCard}
              >
                <Text style={styles.segmentCardTitle}>Withdrawal</Text>
                <Text style={styles.segmentCardMeta}>Requires PIN confirmation</Text>
              </Pressable>
            </View>
          </View>
        </Section>

        <Section title="Recent Transactions">
          {agentTransactionQueue.slice(0, 6).map((item) => {
            const payload = item.payload;
            const descriptor = getQueueStatusDescriptor(item.status);

            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedReceiptId(item.id);
                  setAgentScreen("sync-queue");
                }}
                style={styles.listRow}
              >
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>
                    {payload.transactionType === "withdrawal" ? "Withdrawal" : "Deposit"} ·{" "}
                    {formatCurrency(payload.amount)}
                  </Text>
                  <Text style={styles.listMeta}>
                    {payload.memberName} · {payload.accountNumber ?? "No account"}
                  </Text>
                </View>
                <StatusPill label={descriptor.label} tone={descriptor.tone} />
              </Pressable>
            );
          })}
          {agentTransactionQueue.length === 0 ? (
            <Notice>No transactions have been captured yet.</Notice>
          ) : null}
        </Section>
      </>
    );
  }

  function renderTransactionForm(kind: "deposit" | "withdrawal") {
    const amountStatusLabel = isOffline || !liveConfigured ? "OFFLINE → PENDING SYNC" : "PENDING APPROVAL";

    return (
      <>
        <Section title={kind === "withdrawal" ? "Withdrawal" : "Deposit"}>
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Member</Text>
            <Text style={styles.formValue}>
              {selectedLiveAccount?.fullName ?? "No member selected"}
            </Text>
            <Text style={styles.formHelper}>
              {selectedLiveAccount
                ? `${selectedLiveAccount.accountNumber} · ${formatLabel(selectedLiveAccount.accountType)}`
                : "Go to Members and select an assigned member account first."}
            </Text>

            {kind === "withdrawal" ? (
              <>
                <Text style={styles.formLabel}>Available</Text>
                <Text style={styles.formValue}>
                  {selectedLiveAccount ? formatCurrency(selectedLiveAccount.balance) : "Unavailable"}
                </Text>
              </>
            ) : null}

            <Text style={styles.formLabel}>Amount</Text>
            <TextInput
              keyboardType="numeric"
              onChangeText={setDepositAmount}
              placeholder={kind === "withdrawal" ? "Enter withdrawal amount" : "Enter deposit amount"}
              style={styles.input}
              value={depositAmount}
            />

            {kind === "withdrawal" ? (
              <>
                <Notice>WARNING: Requires Approval</Notice>
                <Text style={styles.formLabel}>Transaction PIN</Text>
                <TextInput
                  keyboardType="numeric"
                  maxLength={8}
                  onChangeText={setWithdrawalPin}
                  placeholder="Enter PIN to confirm withdrawal"
                  secureTextEntry
                  style={styles.input}
                  value={withdrawalPin}
                />
              </>
            ) : null}

            <Text style={styles.formLabel}>Status</Text>
            <StatusPill
              label={kind === "withdrawal" ? "PENDING APPROVAL" : amountStatusLabel}
              tone={
                kind === "withdrawal"
                  ? "pendingApproval"
                  : isOffline || !liveConfigured
                    ? "pendingSync"
                    : "pendingApproval"
              }
            />

            <ActionButton
              label={
                isSubmittingDeposit
                  ? "Saving..."
                  : kind === "withdrawal"
                    ? "Save Withdrawal"
                    : "Save Deposit"
              }
              disabled={isSubmittingDeposit}
              onPress={handleSubmitTransaction}
            />
          </View>
        </Section>
      </>
    );
  }

  function renderAgentMembers() {
    return (
      <>
        <Section
          title="Members"
          action={
            <ActionButton
              label="+"
              onPress={() => setAgentScreen("add-member")}
              variant="ghost"
            />
          }
        >
          <View style={styles.formCard}>
            <TextInput
              onChangeText={setMemberSearch}
              placeholder="Search members"
              style={styles.input}
              value={memberSearch}
            />
          </View>
          {filteredAssignedMembers.map((member) => (
            <Pressable
              key={member.memberId}
              onPress={() => selectAssignedMember(member.memberId)}
              style={[
                styles.listRow,
                selectedAssignedMember?.memberId === member.memberId && styles.selectedRow,
              ]}
            >
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>{member.fullName}</Text>
                <Text style={styles.listMeta}>{member.memberId}</Text>
                <Text style={styles.listMeta}>
                  {member.accounts.length} active account{member.accounts.length === 1 ? "" : "s"}
                </Text>
              </View>
              <StatusPill label="ONLINE" tone="online" />
            </Pressable>
          ))}
          {filteredAssignedMembers.length === 0 ? (
            <Notice>
              {assignedMembers.length === 0
                ? "No assigned members were found for this agent yet."
                : "No members match the current search."}
            </Notice>
          ) : null}
        </Section>

        {selectedAssignedMember ? (
          <Section title="Selected Member">
            <View style={styles.formCard}>
              <Text style={styles.formValue}>{selectedAssignedMember.fullName}</Text>
              {selectedAssignedMember.accounts.map((account) => (
                <Pressable
                  key={account.accountId}
                  onPress={() => setSelectedLiveAccountId(account.accountId)}
                  style={[
                    styles.optionRow,
                    selectedLiveAccountId === account.accountId && styles.selectedRow,
                  ]}
                >
                  <View style={styles.listContent}>
                    <Text style={styles.listTitle}>
                      {formatLabel(account.accountType)} · {account.accountNumber}
                    </Text>
                    <Text style={styles.listMeta}>Available: {formatCurrency(account.balance)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Section>
        ) : null}
      </>
    );
  }

  function renderAddMember() {
    return (
      <Section title="Add Member">
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Type</Text>
          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => setMemberDraftType("individual")}
              style={[
                styles.segmentCard,
                memberDraftType === "individual" && styles.segmentCardActive,
              ]}
            >
              <Text style={styles.segmentCardTitle}>Individual</Text>
            </Pressable>
            <Pressable
              onPress={() => setMemberDraftType("group")}
              style={[
                styles.segmentCard,
                memberDraftType === "group" && styles.segmentCardActive,
              ]}
            >
              <Text style={styles.segmentCardTitle}>Group</Text>
            </Pressable>
          </View>

          <Text style={styles.formLabel}>National ID</Text>
          <TextInput
            onChangeText={setDraftMemberNationalId}
            placeholder="Enter national ID"
            style={styles.input}
            value={draftMemberNationalId}
          />

          <Text style={styles.formLabel}>Photo</Text>
          <ActionButton
            label={draftMemberPhotoCaptured ? "Photo Captured" : "Take Photo"}
            onPress={handleTakePhotoPlaceholder}
            variant="secondary"
          />

          <Text style={styles.formLabel}>
            {memberDraftType === "group" ? "Group Name" : "First Name"}
          </Text>
          <TextInput
            onChangeText={setDraftMemberFirstName}
            placeholder={memberDraftType === "group" ? "Enter group name" : "Enter first name"}
            style={styles.input}
            value={draftMemberFirstName}
          />

          {memberDraftType === "individual" ? (
            <>
              <Text style={styles.formLabel}>Last Name</Text>
              <TextInput
                onChangeText={setDraftMemberLastName}
                placeholder="Enter last name"
                style={styles.input}
                value={draftMemberLastName}
              />
            </>
          ) : null}

          <Text style={styles.formLabel}>Phone</Text>
          <TextInput
            keyboardType="phone-pad"
            onChangeText={setDraftMemberPhone}
            placeholder="Enter phone number"
            style={styles.input}
            value={draftMemberPhone}
          />

          <Text style={styles.formLabel}>Notes</Text>
          <TextInput
            multiline
            onChangeText={setDraftMemberNotes}
            placeholder="Optional onboarding notes"
            style={[styles.input, styles.multilineInput]}
            value={draftMemberNotes}
          />

          <ActionButton label="Save Member" onPress={queueMemberDraft} />
        </View>
      </Section>
    );
  }

  function renderAgentQueue() {
    return (
      <>
        <Section title="Sync Queue">
          <View style={styles.queueHeaderCard}>
            <StatusPill label={agentStatusDescriptor.label} tone={agentStatusDescriptor.tone} />
            <Text style={styles.formHelper}>Pending sync: {pendingSyncCount}</Text>
            <Text style={styles.formHelper}>Pending approval: {queueStats.pendingApproval}</Text>
          </View>

          {queue.map((item) => {
            const descriptor = getQueueStatusDescriptor(item.status);
            const transactionPayload =
              item.kind === "transaction_request"
                ? (item.payload as TransactionQueuePayload)
                : null;
            const draftPayload =
              item.kind === "member_draft" ? (item.payload as MemberDraftQueuePayload) : null;

            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (item.kind === "transaction_request") {
                    setSelectedReceiptId(item.id);
                  }
                }}
                style={styles.listRow}
              >
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>
                    {item.kind === "transaction_request"
                      ? `${transactionPayload?.transactionType === "withdrawal" ? "Withdrawal" : "Deposit"} · ${formatCurrency(transactionPayload?.amount ?? 0)}`
                      : draftPayload?.fullName ?? "Member Draft"}
                  </Text>
                  <Text style={styles.listMeta}>
                    {item.kind === "transaction_request"
                      ? `${transactionPayload?.memberName ?? "Member"} · ${transactionPayload?.accountNumber ?? "No account"}`
                      : `${draftPayload?.phone ?? "Phone missing"} · ${draftPayload?.memberType ?? "draft"}`}
                  </Text>
                  <Text style={styles.listMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                <StatusPill label={descriptor.label} tone={descriptor.tone} />
              </Pressable>
            );
          })}

          {queue.length === 0 ? <Notice>No queued local items yet.</Notice> : null}

          <View style={styles.buttonStack}>
            <ActionButton
              label={isSyncingQueue ? "Syncing..." : "Retry Failed"}
              disabled={isSyncingQueue}
              onPress={() => void handleSyncQueue("failed")}
              variant="secondary"
            />
            <ActionButton
              label={isSyncingQueue ? "Syncing..." : "Sync Now"}
              disabled={isSyncingQueue}
              onPress={() => void handleSyncQueue("all")}
            />
          </View>
        </Section>

        {selectedReceiptItem && selectedReceiptPayload ? (
          <Section title="Transaction Detail">
            <View style={styles.formCard}>
              <Text style={styles.formValue}>
                {selectedReceiptPayload.transactionType === "withdrawal" ? "Withdrawal" : "Deposit"}{" "}
                {formatCurrency(selectedReceiptPayload.amount)}
              </Text>
              <Text style={styles.listMeta}>Member: {selectedReceiptPayload.memberName}</Text>
              <Text style={styles.listMeta}>
                Account: {selectedReceiptPayload.accountNumber ?? "Unavailable"} ·{" "}
                {selectedReceiptPayload.accountType ?? "unknown"}
              </Text>
              <Text style={styles.listMeta}>
                Branch: {selectedReceiptPayload.branchName ?? agentBranchName ?? "Unavailable"}
              </Text>
              <Text style={styles.listMeta}>
                Delivery Mode: {selectedReceiptPayload.mode ?? "live"}
              </Text>
              <Text style={styles.listMeta}>
                Server Request: {selectedReceiptPayload.serverRequestId ?? "Not synced yet"}
              </Text>
              <StatusPill
                label={getQueueStatusDescriptor(selectedReceiptItem.status).label}
                tone={getQueueStatusDescriptor(selectedReceiptItem.status).tone}
              />
            </View>
          </Section>
        ) : null}
      </>
    );
  }

  function renderReconciliation() {
    return (
      <Section title="Cash Reconciliation">
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Expected</Text>
          <Text style={styles.formValue}>{formatCurrency(reconciliationExpected)}</Text>

          <Text style={styles.formLabel}>Actual Cash</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={setReconciliationActualCash}
            placeholder="Enter actual cash"
            style={styles.input}
            value={reconciliationActualCash}
          />

          <Text style={styles.formLabel}>Difference</Text>
          <Text style={styles.formValue}>{formatCurrency(reconciliationDifference)}</Text>

          <StatusPill
            label={reconciliationDescriptor.label}
            tone={reconciliationDescriptor.tone}
          />

          <ActionButton label="Submit" onPress={handleSubmitReconciliation} />
        </View>
      </Section>
    );
  }

  function renderAgentProfile() {
    return (
      <>
        <Section title="Profile">
          <View style={styles.formCard}>
            <Text style={styles.formValue}>{agentProfile?.full_name ?? "No agent connected"}</Text>
            <Text style={styles.listMeta}>Branch: {agentBranchName ?? "Unavailable"}</Text>
            {agentBranchPhone ? <Text style={styles.listMeta}>Phone: {agentBranchPhone}</Text> : null}
            <Text style={styles.listMeta}>
              Transaction PIN: {agentHasTransactionPin ? "configured" : "not set"}
            </Text>
            <Text style={styles.listMeta}>Last sync: {formatSyncTime(agentLastSyncAt)}</Text>
          </View>
        </Section>

        <Section title="Set Transaction PIN">
          <View style={styles.formCard}>
            <TextInput
              keyboardType="numeric"
              maxLength={8}
              onChangeText={setAgentPinSetup}
              placeholder="Enter a new transaction PIN"
              secureTextEntry
              style={styles.input}
              value={agentPinSetup}
            />
            <TextInput
              keyboardType="numeric"
              maxLength={8}
              onChangeText={setAgentPinConfirm}
              placeholder="Confirm transaction PIN"
              secureTextEntry
              style={styles.input}
              value={agentPinConfirm}
            />
            <ActionButton
              label={isSavingAgentPin ? "Saving PIN..." : "Save Transaction PIN"}
              disabled={isSavingAgentPin}
              onPress={() => void handleSaveAgentPin()}
            />
          </View>
        </Section>

        <Section title="Live Session">
          <View style={styles.buttonStack}>
            <ActionButton
              label={isAuthLoading ? "Refreshing..." : "Refresh Assigned Members"}
              disabled={isAuthLoading}
              onPress={() => void handleRefreshAssignedMembers()}
              variant="secondary"
            />
            <ActionButton
              label={isAuthLoading ? "Signing Out..." : "Logout"}
              disabled={isAuthLoading}
              onPress={() => void handleAgentSignOut()}
              variant="secondary"
            />
          </View>
        </Section>
      </>
    );
  }

  function renderAgentMore() {
    return (
      <>
        <Section title="More">
          <View style={styles.tileGrid}>
            <ActionTile
              title="Sync Queue"
              helper="Review pending, synced, and failed items."
              onPress={() => setAgentScreen("sync-queue")}
            />
            <ActionTile
              title="Cash Reconciliation"
              helper="Compare expected and actual cash before close."
              onPress={() => setAgentScreen("reconciliation")}
            />
            <ActionTile
              title="Profile"
              helper="Security, PIN, refresh, and session controls."
              onPress={() => setAgentScreen("profile")}
            />
            <ActionTile
              title="Logout"
              helper="Clear the agent session from this device."
              onPress={() => void handleAgentSignOut()}
            />
          </View>
        </Section>
      </>
    );
  }

  function renderMemberHome() {
    return (
      <>
        <View style={styles.identityCard}>
          <Text style={styles.identityName}>{memberProfile?.full_name ?? "Member"}</Text>
          <Text style={styles.identityMeta}>Code: {memberProfile?.id ?? "MEMBER"}</Text>
          <Text style={styles.identityMeta}>Branch: {memberBranchName ?? "Unavailable"}</Text>
        </View>

        <Section title="Balances">
          <View style={styles.metricGrid}>
            <MetricCard title="Savings" value={formatCurrency(liveSavingsBalance)} />
            <MetricCard title="Deposit" value={formatCurrency(liveDepositBalance)} />
            <MetricCard
              title="Available"
              value={formatCurrency(liveSavingsBalance + liveDepositBalance)}
            />
          </View>
        </Section>

        <Section title="Loan">
          <View style={styles.formCard}>
            <Text style={styles.formValue}>{formatCurrency(liveOutstandingPrincipal)}</Text>
            <Text style={styles.formHelper}>
              Outstanding principal across {memberLoans.length} loan{memberLoans.length === 1 ? "" : "s"}.
            </Text>
            <Text style={styles.formHelper}>
              Next due:{" "}
              {selectedMemberLoan ? formatCurrency(selectedMemberLoan.nextInterestDue) : "Unavailable"}
            </Text>
          </View>
        </Section>

        <Section title="Transactions">
          {memberTransactions.slice(0, 5).map((transaction) => {
            const descriptor = getTransactionStatusDescriptor(transaction.status);

            return (
              <Pressable
                key={transaction.id}
                onPress={() => {
                  setSelectedMemberTransactionId(transaction.id);
                  setMemberScreen("transactions");
                }}
                style={styles.listRow}
              >
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>
                    {formatLabel(transaction.type)} · {formatCurrency(transaction.amount)}
                  </Text>
                  <Text style={styles.listMeta}>{new Date(transaction.createdAt).toLocaleString()}</Text>
                </View>
                <StatusPill label={descriptor.label} tone={descriptor.tone} />
              </Pressable>
            );
          })}
          {memberTransactions.length === 0 ? (
            <Notice>No transactions were found for this member yet.</Notice>
          ) : null}
        </Section>
      </>
    );
  }

  function renderMemberTransactions() {
    return (
      <>
        <Section title="Transactions">
          {memberTransactions.map((transaction) => {
            const descriptor = getTransactionStatusDescriptor(transaction.status);

            return (
              <Pressable
                key={transaction.id}
                onPress={() => setSelectedMemberTransactionId(transaction.id)}
                style={[
                  styles.listRow,
                  selectedMemberTransactionId === transaction.id && styles.selectedRow,
                ]}
              >
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>
                    {formatLabel(transaction.type)} · {formatCurrency(transaction.amount)}
                  </Text>
                  <Text style={styles.listMeta}>
                    {new Date(transaction.createdAt).toLocaleDateString()} · {transaction.agentName}
                  </Text>
                </View>
                <StatusPill label={descriptor.label} tone={descriptor.tone} />
              </Pressable>
            );
          })}
          {memberTransactions.length === 0 ? (
            <Notice>No transactions were found for this member yet.</Notice>
          ) : null}
        </Section>

        {selectedMemberTransaction ? (
          <Section title="Transaction Detail">
            <View style={styles.formCard}>
              <Text style={styles.formValue}>
                {formatLabel(selectedMemberTransaction.type)} ·{" "}
                {formatCurrency(selectedMemberTransaction.amount)}
              </Text>
              <Text style={styles.listMeta}>
                Recorded: {new Date(selectedMemberTransaction.createdAt).toLocaleString()}
              </Text>
              <Text style={styles.listMeta}>Handled by: {selectedMemberTransaction.agentName}</Text>
              <Text style={styles.listMeta}>Branch: {memberBranchName ?? "Unavailable"}</Text>
              <StatusPill
                label={getTransactionStatusDescriptor(selectedMemberTransaction.status).label}
                tone={getTransactionStatusDescriptor(selectedMemberTransaction.status).tone}
              />
            </View>
          </Section>
        ) : null}
      </>
    );
  }

  function renderMemberLoans() {
    return (
      <>
        <Section title="Loans">
          {memberLoans.map((loan) => (
            <Pressable
              key={loan.id}
              onPress={() => setSelectedMemberLoanId(loan.id)}
              style={[
                styles.listRow,
                selectedMemberLoanId === loan.id && styles.selectedRow,
              ]}
            >
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>{loan.id.toUpperCase()}</Text>
                <Text style={styles.listMeta}>
                  Outstanding: {formatCurrency(loan.remainingPrincipal)}
                </Text>
              </View>
              <StatusPill label={formatLabel(loan.status)} tone="neutral" />
            </Pressable>
          ))}
          {memberLoans.length === 0 ? <Notice>No loans were found for this member.</Notice> : null}
        </Section>

        {selectedMemberLoan ? (
          <Section title="Loan Detail">
            <View style={styles.formCard}>
              <Text style={styles.formValue}>{selectedMemberLoan.id.toUpperCase()}</Text>
              <Text style={styles.listMeta}>
                Approved principal: {formatCurrency(selectedMemberLoan.approvedPrincipal)}
              </Text>
              <Text style={styles.listMeta}>
                Remaining principal: {formatCurrency(selectedMemberLoan.remainingPrincipal)}
              </Text>
              <Text style={styles.listMeta}>
                Next due: {formatCurrency(selectedMemberLoan.nextInterestDue)}
              </Text>
              <StatusPill label={formatLabel(selectedMemberLoan.status)} tone="neutral" />
            </View>
          </Section>
        ) : null}
      </>
    );
  }

  function renderMemberProfile() {
    return (
      <>
        <Section title="Profile">
          <View style={styles.formCard}>
            <Text style={styles.formValue}>{memberProfile?.full_name ?? "No member connected"}</Text>
            <Text style={styles.listMeta}>Branch: {memberBranchName ?? "Unavailable"}</Text>
            {memberBranchPhone ? <Text style={styles.listMeta}>Phone: {memberBranchPhone}</Text> : null}
            <Text style={styles.listMeta}>
              App PIN: {memberHasAppPin ? "configured" : "not set"}
            </Text>
            <Text style={styles.listMeta}>
              Biometric unlock: {memberDeviceSettings.biometricEnabled ? "enabled" : "disabled"}
            </Text>
            <Text style={styles.listMeta}>Last sync: {formatSyncTime(memberLastSyncAt)}</Text>
          </View>
        </Section>

        <Section title="Set App PIN">
          <View style={styles.formCard}>
            <TextInput
              keyboardType="numeric"
              maxLength={8}
              onChangeText={setMemberPinSetup}
              placeholder="Enter a new app PIN"
              secureTextEntry
              style={styles.input}
              value={memberPinSetup}
            />
            <TextInput
              keyboardType="numeric"
              maxLength={8}
              onChangeText={setMemberPinConfirm}
              placeholder="Confirm app PIN"
              secureTextEntry
              style={styles.input}
              value={memberPinConfirm}
            />
            <ActionButton
              label={isSavingMemberPin ? "Saving PIN..." : "Save App PIN"}
              disabled={isSavingMemberPin}
              onPress={() => void handleSaveMemberPin()}
            />
            <ActionButton
              label={
                memberDeviceSettings.biometricEnabled
                  ? "Disable Biometric Unlock"
                  : "Enable Biometric Unlock"
              }
              onPress={() => void handleToggleMemberBiometric()}
              variant="secondary"
            />
          </View>
        </Section>
      </>
    );
  }

  function renderMemberMore() {
    return (
      <>
        <Section title="More">
          <View style={styles.tileGrid}>
            <ActionTile
              title="Profile"
              helper="App PIN, biometric unlock, and support details."
              onPress={() => setMemberScreen("profile")}
            />
            <ActionTile
              title="Refresh"
              helper="Reload balances, transactions, and loans."
              onPress={() => void handleRefreshMemberSnapshot()}
            />
            <ActionTile
              title="Branch Support"
              helper={`${memberBranchName ?? "Branch"}${memberBranchPhone ? ` · ${memberBranchPhone}` : ""}`}
              onPress={() => setMemberScreen("profile")}
            />
            <ActionTile
              title="Logout"
              helper="Clear the member session from this device."
              onPress={() => void handleMemberSignOut()}
            />
          </View>
        </Section>
      </>
    );
  }

  if (role === "agent") {
    if (!isAgentSignedIn) {
      return renderAgentLogin();
    }

    if (agentNeedsPasswordChange) {
      return renderAgentPasswordFlow();
    }

    return (
      <AppShell
        title={getAgentScreenTitle(agentScreen)}
        canGoBack={!isAgentPrimaryScreen(agentScreen)}
        onBack={handleAgentBack}
        onMenu={() => setAgentScreen("more")}
        statusDescriptor={agentStatusDescriptor}
        pendingSyncCount={pendingSyncCount}
        lastSyncAt={agentLastSyncAt}
        bottomItems={agentBottomItems}
        activeBottomItem={isAgentPrimaryScreen(agentScreen) ? agentScreen : "more"}
        onSelectBottomItem={(key) => setAgentScreen(key as AgentScreen)}
      >
        {agentError ? <Notice tone="error">{agentError}</Notice> : null}
        {agentMessage ? <Notice tone="success">{agentMessage}</Notice> : null}

        {!agentHasTransactionPin ? (
          <Notice>Set your transaction PIN before recording withdrawals.</Notice>
        ) : null}

        {agentScreen === "home" ? renderAgentHome() : null}
        {agentScreen === "transactions" ? renderAgentTransactions() : null}
        {agentScreen === "deposit" ? renderTransactionForm("deposit") : null}
        {agentScreen === "withdrawal" ? renderTransactionForm("withdrawal") : null}
        {agentScreen === "members" ? renderAgentMembers() : null}
        {agentScreen === "add-member" ? renderAddMember() : null}
        {agentScreen === "sync-queue" ? renderAgentQueue() : null}
        {agentScreen === "reconciliation" ? renderReconciliation() : null}
        {agentScreen === "profile" ? renderAgentProfile() : null}
        {agentScreen === "more" ? renderAgentMore() : null}
      </AppShell>
    );
  }

  if (!isMemberSignedIn) {
    return renderMemberLogin();
  }

  if (memberNeedsPasswordChange) {
    return renderMemberPasswordFlow();
  }

  return (
    <AppShell
      title={getMemberScreenTitle(memberScreen)}
      canGoBack={!isMemberPrimaryScreen(memberScreen)}
      onBack={() => setMemberScreen("more")}
      onMenu={() => setMemberScreen("more")}
      statusDescriptor={memberStatusDescriptor}
      pendingSyncCount={livePendingTransactions}
      lastSyncAt={memberLastSyncAt}
      bottomItems={memberBottomItems}
      activeBottomItem={isMemberPrimaryScreen(memberScreen) ? memberScreen : "more"}
      onSelectBottomItem={(key) => setMemberScreen(key as MemberScreen)}
    >
      {memberError ? <Notice tone="error">{memberError}</Notice> : null}
      {memberMessage ? <Notice tone="success">{memberMessage}</Notice> : null}

      {!memberHasAppPin ? (
        <Notice>Set an app PIN on the Profile screen to complete member device security.</Notice>
      ) : null}

      {memberScreen === "home" ? renderMemberHome() : null}
      {memberScreen === "transactions" ? renderMemberTransactions() : null}
      {memberScreen === "loans" ? renderMemberLoans() : null}
      {memberScreen === "profile" ? renderMemberProfile() : null}
      {memberScreen === "more" ? renderMemberMore() : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#efe7da",
  },
  shell: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 18,
  },
  loginContainer: {
    padding: 20,
    gap: 18,
  },
  loginEyebrow: {
    color: "#7a6247",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 11,
  },
  loginTitle: {
    color: "#20160c",
    fontSize: 30,
    fontWeight: "800",
  },
  loginSubtitle: {
    color: "#5c4c38",
    lineHeight: 21,
  },
  rolePicker: {
    gap: 12,
  },
  roleCard: {
    backgroundColor: "#fff9f2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#decdb6",
    padding: 16,
    gap: 5,
  },
  roleCardActive: {
    backgroundColor: "#155b49",
    borderColor: "#155b49",
  },
  roleTitle: {
    color: "#20160c",
    fontSize: 18,
    fontWeight: "800",
  },
  roleTitleActive: {
    color: "#fffefb",
  },
  roleMeta: {
    color: "#5c4c38",
    lineHeight: 19,
  },
  roleMetaActive: {
    color: "#d7f1e5",
  },
  loginStatusRow: {
    backgroundColor: "#f9f2e4",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#decdb6",
    padding: 14,
    gap: 8,
  },
  loginStatusText: {
    color: "#5c4c38",
    fontWeight: "600",
  },
  statusStrip: {
    backgroundColor: "#f8f1e5",
    borderBottomWidth: 1,
    borderBottomColor: "#dbc9ae",
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 6,
  },
  statusMeta: {
    color: "#5c4c38",
    fontSize: 12,
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#dfd1bc",
    backgroundColor: "#fffaf2",
  },
  topBarTitle: {
    color: "#20160c",
    fontSize: 20,
    fontWeight: "800",
  },
  topBarButton: {
    minWidth: 56,
  },
  topBarButtonDisabled: {
    opacity: 0.4,
  },
  topBarButtonText: {
    color: "#155b49",
    fontWeight: "700",
  },
  topBarButtonTextMuted: {
    color: "#b5a793",
  },
  bottomNav: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#dbc9ae",
    backgroundColor: "#fffaf2",
    gap: 8,
  },
  bottomNavItem: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  bottomNavItemActive: {
    backgroundColor: "#155b49",
  },
  bottomNavLabel: {
    color: "#6c5940",
    fontWeight: "700",
  },
  bottomNavLabelActive: {
    color: "#fffefb",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#20160c",
    fontSize: 20,
    fontWeight: "800",
  },
  notice: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeInfo: {
    backgroundColor: "#fff8eb",
    borderColor: "#e7d3ab",
  },
  noticeSuccess: {
    backgroundColor: "#e2f3ea",
    borderColor: "#afd4be",
  },
  noticeError: {
    backgroundColor: "#fdece7",
    borderColor: "#efc0b4",
  },
  noticeText: {
    lineHeight: 20,
  },
  noticeTextInfo: {
    color: "#765722",
  },
  noticeTextSuccess: {
    color: "#18533d",
  },
  noticeTextError: {
    color: "#8b3022",
  },
  identityCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#decdb6",
    padding: 18,
    gap: 6,
  },
  identityName: {
    color: "#20160c",
    fontSize: 24,
    fontWeight: "800",
  },
  identityMeta: {
    color: "#5c4c38",
    fontWeight: "600",
  },
  identityStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    paddingTop: 8,
  },
  metricGrid: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#decdb6",
    padding: 16,
    gap: 4,
  },
  metricLabel: {
    color: "#7a6247",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricValue: {
    color: "#20160c",
    fontSize: 26,
    fontWeight: "800",
  },
  metricHelper: {
    color: "#5c4c38",
  },
  tileGrid: {
    gap: 12,
  },
  actionTile: {
    backgroundColor: "#fffaf2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#decdb6",
    padding: 16,
    gap: 5,
  },
  actionTileTitle: {
    color: "#20160c",
    fontWeight: "800",
    fontSize: 17,
  },
  actionTileHelper: {
    color: "#5c4c38",
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#decdb6",
    padding: 16,
    gap: 10,
  },
  queueHeaderCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#decdb6",
    padding: 16,
    gap: 8,
  },
  formLabel: {
    color: "#7a6247",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  formValue: {
    color: "#20160c",
    fontSize: 18,
    fontWeight: "800",
  },
  formHelper: {
    color: "#5c4c38",
    lineHeight: 19,
  },
  flowStep: {
    color: "#155b49",
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d6c5a9",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  inlineField: {
    borderRadius: 16,
    backgroundColor: "#f3ead9",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonStack: {
    gap: 10,
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: "#155b49",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d6c5a9",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  ghostButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f3ead9",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#fffefb",
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: "#20160c",
    fontWeight: "800",
  },
  ghostButtonText: {
    color: "#155b49",
    fontWeight: "800",
  },
  segmentRow: {
    gap: 10,
  },
  segmentCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d6c5a9",
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  segmentCardActive: {
    backgroundColor: "#edf7f3",
    borderColor: "#155b49",
  },
  segmentCardTitle: {
    color: "#20160c",
    fontWeight: "800",
  },
  segmentCardMeta: {
    color: "#5c4c38",
  },
  listRow: {
    backgroundColor: "#fffaf2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#decdb6",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionRow: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d6c5a9",
    padding: 14,
  },
  selectedRow: {
    borderColor: "#155b49",
    backgroundColor: "#edf7f3",
  },
  listContent: {
    flex: 1,
    gap: 2,
  },
  listTitle: {
    color: "#20160c",
    fontSize: 16,
    fontWeight: "800",
  },
  listMeta: {
    color: "#5c4c38",
    lineHeight: 19,
  },
});
