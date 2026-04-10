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
const MANAGER_PASSWORD = "Foli1234!";

const BRANCH_SEEDS = [
  {
    code: "BUA",
    name: "Buea Branch",
    city: "Buea",
    region: "Southwest",
    phone: "+237670000011",
    managerEmail: "managebua@example.com",
    managerName: "Buea Branch Manager",
    managerPhone: "+237680000011",
  },
  {
    code: "KBA",
    name: "Kumba Branch",
    city: "Kumba",
    region: "Southwest",
    phone: "+237670000012",
    managerEmail: "managekba@example.com",
    managerName: "Kumba Branch Manager",
    managerPhone: "+237680000012",
  },
  {
    code: "BAM",
    name: "Bamenda Branch",
    city: "Bamenda",
    region: "Northwest",
    phone: "+237670000013",
    managerEmail: "managebam@example.com",
    managerName: "Bamenda Branch Manager",
    managerPhone: "+237680000013",
  },
];

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

if (!SUPABASE_URL) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL.");
}

if (!SERVICE_ROLE_KEY) {
  fail(
    "Missing SUPABASE_SERVICE_ROLE_KEY. This script needs the service role key to create auth users and assign manager profiles.",
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listAllAuthUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const response = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (response.error) {
      fail(`Unable to list auth users: ${response.error.message}`);
    }

    const batch = response.data.users ?? [];
    users.push(...batch);

    if (batch.length < 200) {
      return users;
    }

    page += 1;
  }
}

async function ensureAuthUser({ email, password, fullName }) {
  const users = await listAllAuthUsers();
  const existingUser = users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existingUser) {
    const updateResponse = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (updateResponse.error || !updateResponse.data.user) {
      fail(
        `Unable to update auth user for ${email}: ${updateResponse.error?.message ?? "Unknown error"}`,
      );
    }

    return updateResponse.data.user;
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

async function upsertBranch(branchSeed) {
  const response = await supabase
    .from("branches")
    .upsert(
      {
        code: branchSeed.code,
        name: branchSeed.name,
        city: branchSeed.city,
        region: branchSeed.region,
        phone: branchSeed.phone,
        status: "active",
      },
      { onConflict: "code" },
    )
    .select("id, code, name")
    .single();

  if (response.error || !response.data) {
    fail(
      `Unable to upsert branch ${branchSeed.code}: ${response.error?.message ?? "Unknown error"}`,
    );
  }

  return response.data;
}

async function upsertManagerProfile({ userId, branchId, branchCode, fullName, email, phone }) {
  const response = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        role: "branch_manager",
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
    .select("id, full_name, email, branch_id")
    .single();

  if (response.error || !response.data) {
    fail(
      `Unable to upsert branch manager profile for ${email} (${branchCode}): ${response.error?.message ?? "Unknown error"}`,
    );
  }

  return response.data;
}

async function upsertStaffUser(profileId, branchId, email) {
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
    fail(
      `Unable to upsert staff user for ${email}: ${response.error?.message ?? "Unknown error"}`,
    );
  }
}

async function assignBranchManager(branchId, profileId, branchCode) {
  const response = await supabase
    .from("branches")
    .update({ manager_profile_id: profileId })
    .eq("id", branchId)
    .select("id")
    .single();

  if (response.error || !response.data) {
    fail(
      `Unable to assign manager for branch ${branchCode}: ${response.error?.message ?? "Unknown error"}`,
    );
  }
}

async function seedBranchManager(branchSeed) {
  const branch = await upsertBranch(branchSeed);
  const authUser = await ensureAuthUser({
    email: branchSeed.managerEmail,
    password: MANAGER_PASSWORD,
    fullName: branchSeed.managerName,
  });

  const managerProfile = await upsertManagerProfile({
    userId: authUser.id,
    branchId: branch.id,
    branchCode: branch.code,
    fullName: branchSeed.managerName,
    email: branchSeed.managerEmail,
    phone: branchSeed.managerPhone,
  });

  await upsertStaffUser(managerProfile.id, branch.id, branchSeed.managerEmail);
  await assignBranchManager(branch.id, managerProfile.id, branch.code);

  return {
    branch,
    managerEmail: branchSeed.managerEmail,
    managerName: branchSeed.managerName,
  };
}

async function main() {
  console.log("\nSeeding branches and branch managers...\n");

  const results = [];

  for (const branchSeed of BRANCH_SEEDS) {
    const result = await seedBranchManager(branchSeed);
    results.push(result);
  }

  console.log("Seed complete:");

  for (const result of results) {
    console.log(
      `- ${result.branch.name} (${result.branch.code}): ${result.managerEmail} / ${MANAGER_PASSWORD}`,
    );
  }

  console.log("");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Unknown failure");
});
