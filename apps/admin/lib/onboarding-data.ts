import { requireRole, type AdminProfile } from "./auth";
import { hasSupabaseEnv } from "./supabase/env";

export type BranchOption = {
  id: string;
  name: string;
  code: string;
  managerProfileId: string | null;
};

export type ProfileOption = {
  id: string;
  fullName: string;
  branchId: string | null;
  branchName: string;
};

export type MemberOption = {
  id: string;
  fullName: string;
  branchId: string;
  branchName: string;
};

export type MemberAccountOption = {
  id: string;
  memberId: string;
  memberName: string;
  branchId: string;
  branchName: string;
  accountNumber: string;
  accountType: "savings" | "deposit";
};

type BranchRow = {
  id: string;
  name: string;
  code: string;
  manager_profile_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  branch_id: string | null;
  is_active?: boolean;
};

type MemberProfileRow = {
  profile_id: string;
  branch_id: string;
  status: string;
};

type MemberAccountRow = {
  id: string;
  member_profile_id: string;
  branch_id: string;
  account_type: "savings" | "deposit";
  account_number: string;
  status: string;
};

type OnboardingPageContext = {
  isLive: boolean;
  profile: AdminProfile;
  branches: BranchOption[];
  agents: ProfileOption[];
  managers: ProfileOption[];
  currentBranchLabel: string;
};

export type AdminTransactionPageContext = {
  isLive: boolean;
  profile: AdminProfile;
  branches: BranchOption[];
  agents: ProfileOption[];
  members: MemberOption[];
  memberAccounts: MemberAccountOption[];
  currentBranchLabel: string;
};

function emptyContext(role: "admin" | "branch_manager"): OnboardingPageContext {
  return {
    isLive: false,
    profile: {
      id: `empty-${role}`,
      role,
      full_name: "Supabase not configured",
      email: null,
      branch_id: null,
    },
    branches: [],
    agents: [],
    managers: [],
    currentBranchLabel: role === "admin" ? "All branches" : "Branch",
  };
}

function emptyTransactionContext(role: "admin" | "branch_manager"): AdminTransactionPageContext {
  return {
    isLive: false,
    profile: {
      id: `empty-${role}`,
      role,
      full_name: "Supabase not configured",
      email: null,
      branch_id: null,
    },
    branches: [],
    agents: [],
    members: [],
    memberAccounts: [],
    currentBranchLabel: role === "admin" ? "All branches" : "Branch",
  };
}

export async function getOnboardingPageContext(
  allowedRoles: ("admin" | "branch_manager")[],
): Promise<OnboardingPageContext> {
  const fallbackRole = allowedRoles.includes("branch_manager") ? "branch_manager" : "admin";

  if (!hasSupabaseEnv()) {
    return emptyContext(fallbackRole);
  }

  const { supabase, profile } = await requireRole(allowedRoles);
  const branchFilter = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;

  let branchQuery = supabase
    .from("branches")
    .select("id, name, code, manager_profile_id")
    .order("name", { ascending: true });

  if (branchFilter) {
    branchQuery = branchQuery.eq("id", branchFilter);
  }

  const [branchResponse, agentResponse, managerResponse] = await Promise.all([
    branchQuery,
    supabase
      .from("profiles")
      .select("id, full_name, branch_id")
      .eq("role", "agent")
      .order("full_name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, branch_id")
      .eq("role", "branch_manager")
      .order("full_name", { ascending: true }),
  ]);

  const branches = ((branchResponse.data as BranchRow[] | null) ?? []).map((branch) => ({
    id: branch.id,
    name: branch.name,
    code: branch.code,
    managerProfileId: branch.manager_profile_id,
  }));

  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));

  const toProfileOption = (row: ProfileRow): ProfileOption => ({
    id: row.id,
    fullName: row.full_name,
    branchId: row.branch_id,
    branchName: row.branch_id ? branchMap.get(row.branch_id) ?? row.branch_id : "Unassigned",
  });

  const agents = ((agentResponse.data as ProfileRow[] | null) ?? [])
    .filter((row) => !branchFilter || row.branch_id === branchFilter)
    .map(toProfileOption);

  const managers = ((managerResponse.data as ProfileRow[] | null) ?? []).map(toProfileOption);

  return {
    isLive: true,
    profile,
    branches,
    agents,
    managers,
    currentBranchLabel:
      profile.role === "admin"
        ? "All branches"
        : branches[0]?.name ?? "Branch",
  };
}

export async function getAdminTransactionPageContext(): Promise<AdminTransactionPageContext> {
  if (!hasSupabaseEnv()) {
    return emptyTransactionContext("branch_manager");
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchFilter = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;

  let branchQuery = supabase
    .from("branches")
    .select("id, name, code, manager_profile_id")
    .order("name", { ascending: true });
  let agentQuery = supabase
    .from("profiles")
    .select("id, full_name, branch_id, is_active")
    .eq("role", "agent")
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  let memberProfileQuery = supabase
    .from("member_profiles")
    .select("profile_id, branch_id, status")
    .eq("status", "active")
    .order("profile_id", { ascending: true });
  let memberAccountQuery = supabase
    .from("member_accounts")
    .select("id, member_profile_id, branch_id, account_type, account_number, status")
    .eq("status", "active")
    .in("account_type", ["savings", "deposit"])
    .order("account_number", { ascending: true });

  if (branchFilter) {
    branchQuery = branchQuery.eq("id", branchFilter);
    agentQuery = agentQuery.eq("branch_id", branchFilter);
    memberProfileQuery = memberProfileQuery.eq("branch_id", branchFilter);
    memberAccountQuery = memberAccountQuery.eq("branch_id", branchFilter);
  }

  const [
    branchResponse,
    agentResponse,
    memberProfileResponse,
    memberAccountResponse,
  ] = await Promise.all([branchQuery, agentQuery, memberProfileQuery, memberAccountQuery]);

  const branches = ((branchResponse.data as BranchRow[] | null) ?? []).map((branch) => ({
    id: branch.id,
    name: branch.name,
    code: branch.code,
    managerProfileId: branch.manager_profile_id,
  }));
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));

  const agents = (((agentResponse.data as ProfileRow[] | null) ?? [])).map((agent) => ({
    id: agent.id,
    fullName: agent.full_name,
    branchId: agent.branch_id,
    branchName: agent.branch_id ? branchMap.get(agent.branch_id) ?? agent.branch_id : "Unassigned",
  }));

  const memberProfileRows = (memberProfileResponse.data as MemberProfileRow[] | null) ?? [];
  const memberIds = memberProfileRows.map((row) => row.profile_id);
  const { data: memberRowsData } = memberIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, branch_id, is_active")
        .in("id", memberIds)
    : { data: [] as ProfileRow[] };

  const memberMap = new Map(
    ((memberRowsData as ProfileRow[] | null) ?? [])
      .filter((member) => member.is_active !== false && member.branch_id)
      .map((member) => [member.id, member]),
  );

  const members = memberProfileRows
    .map((memberProfile) => {
      const member = memberMap.get(memberProfile.profile_id);

      if (!member || !member.branch_id) {
        return null;
      }

      return {
        id: member.id,
        fullName: member.full_name,
        branchId: member.branch_id,
        branchName: branchMap.get(member.branch_id) ?? member.branch_id,
      } satisfies MemberOption;
    })
    .filter((member): member is MemberOption => Boolean(member))
    .sort((left, right) => left.fullName.localeCompare(right.fullName));

  const accounts = ((memberAccountResponse.data as MemberAccountRow[] | null) ?? [])
    .map((account) => {
      const member = memberMap.get(account.member_profile_id);

      if (!member || !member.branch_id) {
        return null;
      }

      return {
        id: account.id,
        memberId: account.member_profile_id,
        memberName: member.full_name,
        branchId: account.branch_id,
        branchName: branchMap.get(account.branch_id) ?? account.branch_id,
        accountNumber: account.account_number,
        accountType: account.account_type,
      } satisfies MemberAccountOption;
    })
    .filter((account): account is MemberAccountOption => Boolean(account))
    .sort((left, right) => left.accountNumber.localeCompare(right.accountNumber));

  return {
    isLive: true,
    profile,
    branches,
    agents,
    members,
    memberAccounts: accounts,
    currentBranchLabel:
      profile.role === "admin"
        ? "All branches"
        : branches[0]?.name ?? "Branch",
  };
}
