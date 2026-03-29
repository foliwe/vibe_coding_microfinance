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
};

type OnboardingPageContext = {
  isLive: boolean;
  profile: AdminProfile;
  branches: BranchOption[];
  agents: ProfileOption[];
  managers: ProfileOption[];
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
