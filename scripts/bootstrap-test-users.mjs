import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { createClient } from "@supabase/supabase-js";

if (existsSync("apps/admin/.env.local")) {
  loadEnvFile("apps/admin/.env.local");
} else if (existsSync(".env.local")) {
  loadEnvFile(".env.local");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_BRANCH_CODE = process.env.TEST_BRANCH_CODE ?? "BAM";

const TEST_MANAGER_EMAIL = process.env.TEST_MANAGER_EMAIL ?? "manager@example.com";
const TEST_MANAGER_PASSWORD = process.env.TEST_MANAGER_PASSWORD ?? "Manager123456!";
const TEST_MANAGER_NAME = process.env.TEST_MANAGER_NAME ?? "Bamenda Manager";
const TEST_MANAGER_PHONE = process.env.TEST_MANAGER_PHONE ?? "+237600000101";

const TEST_AGENT_EMAIL = process.env.TEST_AGENT_EMAIL ?? "agent@example.com";
const TEST_AGENT_PASSWORD = process.env.TEST_AGENT_PASSWORD ?? "Agent123456!";
const TEST_AGENT_NAME = process.env.TEST_AGENT_NAME ?? "Field Agent One";
const TEST_AGENT_PHONE = process.env.TEST_AGENT_PHONE ?? "+237600000102";

const TEST_MEMBER_EMAIL = process.env.TEST_MEMBER_EMAIL ?? "member@example.com";
const TEST_MEMBER_PASSWORD = process.env.TEST_MEMBER_PASSWORD ?? "Member123456!";
const TEST_MEMBER_NAME = process.env.TEST_MEMBER_NAME ?? "Member One";
const TEST_MEMBER_PHONE = process.env.TEST_MEMBER_PHONE ?? "+237600000103";

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

if (!SUPABASE_URL) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL.");
}

if (!SERVICE_ROLE_KEY) {
  fail("Missing SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensureAuthUser({ email, password, fullName }) {
  const listResponse = await supabase.auth.admin.listUsers();

  if (listResponse.error) {
    fail(`Unable to list auth users: ${listResponse.error.message}`);
  }

  const existingUser = listResponse.data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existingUser) {
    return existingUser;
  }

  const createResponse = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (createResponse.error || !createResponse.data.user) {
    fail(
      `Unable to create auth user for ${email}: ${createResponse.error?.message ?? "Unknown error"}`,
    );
  }

  return createResponse.data.user;
}

async function getBranchByCode(code) {
  const response = await supabase
    .from("branches")
    .select("id, name, code")
    .eq("code", code)
    .single();

  if (response.error || !response.data) {
    fail(`Unable to find branch with code ${code}: ${response.error?.message ?? "Missing row"}`);
  }

  return response.data;
}

async function upsertProfile({
  userId,
  role,
  fullName,
  phone,
  email,
  branchId,
}) {
  const response = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        role,
        full_name: fullName,
        phone,
        email,
        branch_id: branchId,
        must_change_password: false,
        requires_pin_setup: false,
        is_active: true,
      },
      { onConflict: "id" },
    )
    .select("id, role, full_name, branch_id")
    .single();

  if (response.error || !response.data) {
    fail(`Unable to upsert profile for ${email}: ${response.error?.message ?? "Unknown error"}`);
  }

  return response.data;
}

async function upsertStaffUser(profileId, branchId) {
  const response = await supabase
    .from("staff_users")
    .upsert(
      {
        profile_id: profileId,
        branch_id: branchId,
        device_binding_required: false,
        status: "active",
      },
      { onConflict: "profile_id" },
    )
    .select("profile_id")
    .single();

  if (response.error || !response.data) {
    fail(`Unable to upsert staff user ${profileId}: ${response.error?.message ?? "Unknown error"}`);
  }

  return response.data;
}

async function upsertMemberProfile(profileId, branchId, assignedAgentId, createdBy) {
  const response = await supabase
    .from("member_profiles")
    .upsert(
      {
        profile_id: profileId,
        branch_id: branchId,
        assigned_agent_id: assignedAgentId,
        status: "active",
        created_by: createdBy,
        approved_by: createdBy,
      },
      { onConflict: "profile_id" },
    )
    .select("profile_id")
    .single();

  if (response.error || !response.data) {
    fail(
      `Unable to upsert member profile ${profileId}: ${response.error?.message ?? "Unknown error"}`,
    );
  }

  return response.data;
}

async function ensureActiveAssignment(memberProfileId, agentProfileId, branchId) {
  const existingResponse = await supabase
    .from("agent_member_assignments")
    .select("id, agent_profile_id, is_active")
    .eq("member_profile_id", memberProfileId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingResponse.error) {
    fail(`Unable to check member assignment: ${existingResponse.error.message}`);
  }

  const existing = existingResponse.data;

  if (existing?.agent_profile_id === agentProfileId) {
    return existing;
  }

  if (existing) {
    const closeResponse = await supabase
      .from("agent_member_assignments")
      .update({
        is_active: false,
        ends_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (closeResponse.error) {
      fail(`Unable to close prior member assignment: ${closeResponse.error.message}`);
    }
  }

  const insertResponse = await supabase
    .from("agent_member_assignments")
    .insert({
      member_profile_id: memberProfileId,
      agent_profile_id: agentProfileId,
      branch_id: branchId,
      is_active: true,
    })
    .select("id")
    .single();

  if (insertResponse.error || !insertResponse.data) {
    fail(`Unable to create member assignment: ${insertResponse.error?.message ?? "Unknown error"}`);
  }

  return insertResponse.data;
}

async function ensureMemberAccount(memberProfileId, branchId, accountType, accountNumber) {
  const existingResponse = await supabase
    .from("member_accounts")
    .select("id, account_number")
    .eq("account_number", accountNumber)
    .maybeSingle();

  if (existingResponse.error) {
    fail(`Unable to check member account ${accountNumber}: ${existingResponse.error.message}`);
  }

  if (existingResponse.data) {
    return existingResponse.data;
  }

  const insertResponse = await supabase
    .from("member_accounts")
    .insert({
      member_profile_id: memberProfileId,
      branch_id: branchId,
      account_type: accountType,
      account_number: accountNumber,
      status: "active",
    })
    .select("id, account_number")
    .single();

  if (insertResponse.error || !insertResponse.data) {
    fail(`Unable to create member account ${accountNumber}: ${insertResponse.error?.message ?? "Unknown error"}`);
  }

  return insertResponse.data;
}

async function updateBranchManager(branchId, managerProfileId) {
  const response = await supabase
    .from("branches")
    .update({ manager_profile_id: managerProfileId })
    .eq("id", branchId)
    .select("id")
    .single();

  if (response.error || !response.data) {
    fail(`Unable to assign branch manager: ${response.error?.message ?? "Unknown error"}`);
  }
}

function branchScopedAccountNumber(code, suffix) {
  return `${code}-${suffix}`;
}

async function main() {
  console.log("\nBootstrapping test branch users...\n");

  const branch = await getBranchByCode(TEST_BRANCH_CODE);

  const managerUser = await ensureAuthUser({
    email: TEST_MANAGER_EMAIL,
    password: TEST_MANAGER_PASSWORD,
    fullName: TEST_MANAGER_NAME,
  });
  const agentUser = await ensureAuthUser({
    email: TEST_AGENT_EMAIL,
    password: TEST_AGENT_PASSWORD,
    fullName: TEST_AGENT_NAME,
  });
  const memberUser = await ensureAuthUser({
    email: TEST_MEMBER_EMAIL,
    password: TEST_MEMBER_PASSWORD,
    fullName: TEST_MEMBER_NAME,
  });

  const managerProfile = await upsertProfile({
    userId: managerUser.id,
    role: "branch_manager",
    fullName: TEST_MANAGER_NAME,
    phone: TEST_MANAGER_PHONE,
    email: TEST_MANAGER_EMAIL,
    branchId: branch.id,
  });
  const agentProfile = await upsertProfile({
    userId: agentUser.id,
    role: "agent",
    fullName: TEST_AGENT_NAME,
    phone: TEST_AGENT_PHONE,
    email: TEST_AGENT_EMAIL,
    branchId: branch.id,
  });
  const memberProfile = await upsertProfile({
    userId: memberUser.id,
    role: "member",
    fullName: TEST_MEMBER_NAME,
    phone: TEST_MEMBER_PHONE,
    email: TEST_MEMBER_EMAIL,
    branchId: branch.id,
  });

  await upsertStaffUser(managerProfile.id, branch.id);
  await upsertStaffUser(agentProfile.id, branch.id);
  await upsertMemberProfile(memberProfile.id, branch.id, agentProfile.id, managerProfile.id);
  await ensureActiveAssignment(memberProfile.id, agentProfile.id, branch.id);

  const savingsAccount = await ensureMemberAccount(
    memberProfile.id,
    branch.id,
    "savings",
    branchScopedAccountNumber(branch.code, "SAV-0001"),
  );
  const depositAccount = await ensureMemberAccount(
    memberProfile.id,
    branch.id,
    "deposit",
    branchScopedAccountNumber(branch.code, "DEP-0001"),
  );

  await updateBranchManager(branch.id, managerProfile.id);

  console.log(`Branch ready: ${branch.name} (${branch.code})`);
  console.log("");
  console.log("Test users:");
  console.log(`- Branch manager: ${TEST_MANAGER_EMAIL} / ${TEST_MANAGER_PASSWORD}`);
  console.log(`- Agent: ${TEST_AGENT_EMAIL} / ${TEST_AGENT_PASSWORD}`);
  console.log(`- Member: ${TEST_MEMBER_EMAIL} / ${TEST_MEMBER_PASSWORD}`);
  console.log("");
  console.log("Seeded accounts:");
  console.log(`- Savings: ${savingsAccount.account_number}`);
  console.log(`- Deposit: ${depositAccount.account_number}`);
  console.log("");
  console.log("You can now:");
  console.log("- sign in to the admin app as the branch manager");
  console.log("- sign in to the mobile app as the agent");
  console.log("- sign in to the mobile app as the member");
  console.log("- submit a live deposit and approve it from the admin transactions page");
  console.log("");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Unknown failure");
});
