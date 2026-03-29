import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { createClient } from "@supabase/supabase-js";

type SeededUser = {
  email: string;
  password: string;
  fullName: string;
};

type SeededPanelContext = {
  branch: {
    id: string;
    code: string;
    name: string;
  };
  member: {
    id: string;
    fullName: string;
  };
  agent: {
    id: string;
    fullName: string;
  };
  savingsAccount: {
    id: string;
    number: string;
  };
  depositAccount: {
    id: string;
    number: string;
  };
};

type PendingRequestInput = {
  accountType?: "savings" | "deposit";
  amount: number;
  transactionType?: "deposit" | "withdrawal";
};

type ProfileLookup = {
  id: string;
  full_name: string;
  role: string;
  branch_id: string | null;
};

type MemberAccountLookup = {
  account_number: string;
  account_type: "savings" | "deposit";
};

let envLoaded = false;
let cachedContext: Promise<SeededPanelContext> | null = null;

function loadTestEnv() {
  if (envLoaded) {
    return;
  }

  if (existsSync("apps/admin/.env.local")) {
    loadEnvFile("apps/admin/.env.local");
  } else if (existsSync(".env.local")) {
    loadEnvFile(".env.local");
  }

  envLoaded = true;
}

loadTestEnv();

function requiredEnv(key: string) {
  loadTestEnv();
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing ${key}.`);
  }

  return value;
}

export const seededUsers: {
  admin: SeededUser;
  manager: SeededUser;
  agent: SeededUser;
  member: SeededUser;
} = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.TEST_ADMIN_PASSWORD ?? "Admin123456!",
    fullName: process.env.TEST_ADMIN_NAME ?? "Main Admin",
  },
  manager: {
    email: process.env.TEST_MANAGER_EMAIL ?? "manager@example.com",
    password: process.env.TEST_MANAGER_PASSWORD ?? "Manager123456!",
    fullName: process.env.TEST_MANAGER_NAME ?? "Bamenda Manager",
  },
  agent: {
    email: process.env.TEST_AGENT_EMAIL ?? "agent@example.com",
    password: process.env.TEST_AGENT_PASSWORD ?? "Agent123456!",
    fullName: process.env.TEST_AGENT_NAME ?? "Field Agent One",
  },
  member: {
    email: process.env.TEST_MEMBER_EMAIL ?? "member@example.com",
    password: process.env.TEST_MEMBER_PASSWORD ?? "Member123456!",
    fullName: process.env.TEST_MEMBER_NAME ?? "Member One",
  },
};

export const seededBranch = {
  code: process.env.TEST_BRANCH_CODE ?? "BAM",
  name: process.env.TEST_BRANCH_NAME ?? "Bamenda Central",
};

export const seededAccounts = {
  savingsNumber: `${seededBranch.code}-SAV-0001`,
  depositNumber: `${seededBranch.code}-DEP-0001`,
};

function createServiceClient() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export function newTestId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

async function fetchSingle<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string,
) {
  const { data, error } = await query;

  if (error || !data) {
    throw new Error(error?.message ?? `Missing ${label}.`);
  }

  return data;
}

async function loadSeededPanelContext(): Promise<SeededPanelContext> {
  const service = createServiceClient();

  const branch = await fetchSingle(
    service
      .from("branches")
      .select("id, code, name")
      .eq("code", seededBranch.code)
      .maybeSingle(),
    `branch ${seededBranch.code}`,
  );

  const [memberProfile, agentProfile] = await Promise.all([
    fetchSingle(
      service
        .from("profiles")
        .select("id, full_name")
        .eq("email", seededUsers.member.email)
        .maybeSingle(),
      `member profile ${seededUsers.member.email}`,
    ),
    fetchSingle(
      service
        .from("profiles")
        .select("id, full_name")
        .eq("email", seededUsers.agent.email)
        .maybeSingle(),
      `agent profile ${seededUsers.agent.email}`,
    ),
  ]);

  const [savingsAccount, depositAccount] = await Promise.all([
    fetchSingle(
      service
        .from("member_accounts")
        .select("id, account_number")
        .eq("account_number", seededAccounts.savingsNumber)
        .maybeSingle(),
      `account ${seededAccounts.savingsNumber}`,
    ),
    fetchSingle(
      service
        .from("member_accounts")
        .select("id, account_number")
        .eq("account_number", seededAccounts.depositNumber)
        .maybeSingle(),
      `account ${seededAccounts.depositNumber}`,
    ),
  ]);

  return {
    branch,
    member: {
      id: memberProfile.id,
      fullName: memberProfile.full_name,
    },
    agent: {
      id: agentProfile.id,
      fullName: agentProfile.full_name,
    },
    savingsAccount: {
      id: savingsAccount.id,
      number: savingsAccount.account_number,
    },
    depositAccount: {
      id: depositAccount.id,
      number: depositAccount.account_number,
    },
  };
}

export async function getSeededPanelContext() {
  if (!cachedContext) {
    cachedContext = loadSeededPanelContext();
  }

  return cachedContext;
}

export async function createPendingTransactionRequest({
  accountType = "savings",
  amount,
  transactionType = "deposit",
}: PendingRequestInput) {
  const service = createServiceClient();
  const context = await getSeededPanelContext();
  const memberAccountId =
    accountType === "deposit" ? context.depositAccount.id : context.savingsAccount.id;

  const response = await service
    .from("transaction_requests")
    .insert({
      branch_id: context.branch.id,
      member_profile_id: context.member.id,
      member_account_id: memberAccountId,
      agent_profile_id: context.agent.id,
      transaction_type: transactionType,
      amount,
      note: `Playwright ${transactionType} ${accountType} ${Date.now()}`,
      status: "pending_approval",
      submitted_offline: false,
      created_by: context.agent.id,
    })
    .select("id")
    .single();

  if (response.error || !response.data) {
    throw new Error(
      response.error?.message ?? "Unable to create pending transaction request.",
    );
  }

  return {
    id: response.data.id,
    reference: response.data.id.toUpperCase(),
  };
}

export async function getProfileByEmail(email: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("profiles")
    .select("id, full_name, role, branch_id")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProfileLookup | null) ?? null;
}

export async function getMemberAccountsByEmail(email: string) {
  const profile = await getProfileByEmail(email);

  if (!profile) {
    return [] as MemberAccountLookup[];
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("member_accounts")
    .select("account_number, account_type")
    .eq("member_profile_id", profile.id)
    .order("account_type", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as MemberAccountLookup[] | null) ?? []).filter(
    (account) => account.account_type === "savings" || account.account_type === "deposit",
  );
}

export async function createLoanForMemberEmail({
  approvedPrincipal,
  createdByEmail,
  memberEmail,
  monthlyInterestRate = 0.05,
  remainingPrincipal = approvedPrincipal,
}: {
  approvedPrincipal: number;
  createdByEmail: string;
  memberEmail: string;
  monthlyInterestRate?: number;
  remainingPrincipal?: number;
}) {
  const service = createServiceClient();
  const [memberProfile, actorProfile] = await Promise.all([
    getProfileByEmail(memberEmail),
    getProfileByEmail(createdByEmail),
  ]);

  if (!memberProfile) {
    throw new Error(`Missing member profile for ${memberEmail}.`);
  }

  if (!actorProfile) {
    throw new Error(`Missing actor profile for ${createdByEmail}.`);
  }

  if (!memberProfile.branch_id) {
    throw new Error(`Missing branch assignment for ${memberEmail}.`);
  }

  const applicationResponse = await service
    .from("loan_applications")
    .insert({
      branch_id: memberProfile.branch_id,
      member_profile_id: memberProfile.id,
      requested_amount: approvedPrincipal,
      monthly_interest_rate: monthlyInterestRate,
      term_months: 12,
      collateral_required: false,
      collateral_notes: null,
      status: "approved",
      created_by: actorProfile.id,
      reviewed_by: actorProfile.id,
    })
    .select("id")
    .single();

  if (applicationResponse.error || !applicationResponse.data) {
    throw new Error(
      applicationResponse.error?.message ?? "Unable to create loan application.",
    );
  }

  const loanResponse = await service
    .from("loans")
    .insert({
      application_id: applicationResponse.data.id,
      branch_id: memberProfile.branch_id,
      member_profile_id: memberProfile.id,
      approved_principal: approvedPrincipal,
      remaining_principal: remainingPrincipal,
      monthly_interest_rate: monthlyInterestRate,
      disbursed_at: new Date().toISOString(),
      status: "active",
      approved_by: actorProfile.id,
    })
    .select("id")
    .single();

  if (loanResponse.error || !loanResponse.data) {
    throw new Error(loanResponse.error?.message ?? "Unable to create loan.");
  }

  return {
    id: loanResponse.data.id,
    reference: loanResponse.data.id.toUpperCase(),
  };
}
