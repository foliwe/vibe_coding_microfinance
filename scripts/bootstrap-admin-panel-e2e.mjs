import { execFileSync } from "node:child_process";
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
const TEST_BRANCH_NAME = process.env.TEST_BRANCH_NAME ?? "Bamenda Central";
const TEST_BRANCH_CITY = process.env.TEST_BRANCH_CITY ?? "Bamenda";
const TEST_BRANCH_REGION = process.env.TEST_BRANCH_REGION ?? "Northwest";
const TEST_BRANCH_PHONE = process.env.TEST_BRANCH_PHONE ?? "+237670000001";
const TEST_MANAGER_EMAIL = process.env.TEST_MANAGER_EMAIL ?? "manager@example.com";

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

async function ensureBranch() {
  const existingBranch = await supabase
    .from("branches")
    .select("id, name, code")
    .eq("code", TEST_BRANCH_CODE)
    .maybeSingle();

  if (existingBranch.error) {
    fail(`Unable to load branch ${TEST_BRANCH_CODE}: ${existingBranch.error.message}`);
  }

  if (existingBranch.data) {
    return existingBranch.data;
  }

  const createdBranch = await supabase
    .from("branches")
    .insert({
      name: TEST_BRANCH_NAME,
      code: TEST_BRANCH_CODE,
      city: TEST_BRANCH_CITY,
      region: TEST_BRANCH_REGION,
      phone: TEST_BRANCH_PHONE,
      status: "active",
    })
    .select("id, name, code")
    .single();

  if (createdBranch.error || !createdBranch.data) {
    fail(
      `Unable to create branch ${TEST_BRANCH_CODE}: ${createdBranch.error?.message ?? "Unknown error"}`,
    );
  }

  return createdBranch.data;
}

function runNodeScript(path) {
  execFileSync(process.execPath, [path], { stdio: "inherit" });
}

async function resetStaffDevice(email) {
  const profileResponse = await supabase
    .from("profiles")
    .select("id, branch_id")
    .eq("email", email)
    .maybeSingle();

  if (profileResponse.error) {
    fail(`Unable to load profile for ${email}: ${profileResponse.error.message}`);
  }

  if (!profileResponse.data) {
    fail(`Missing profile for ${email}.`);
  }

  const deviceResponse = await supabase
    .from("device_registrations")
    .delete()
    .eq("profile_id", profileResponse.data.id);

  if (deviceResponse.error) {
    fail(`Unable to clear trusted workstation for ${email}: ${deviceResponse.error.message}`);
  }

  const staffUserResponse = await supabase
    .from("staff_users")
    .upsert(
      {
        profile_id: profileResponse.data.id,
        branch_id: profileResponse.data.branch_id,
        device_binding_required: true,
        status: "active",
      },
      { onConflict: "profile_id" },
    );

  if (staffUserResponse.error) {
    fail(`Unable to mark ${email} for workstation rebind: ${staffUserResponse.error.message}`);
  }
}

async function main() {
  const branch = await ensureBranch();

  console.log(`\nPreparing Playwright fixtures for ${branch.name} (${branch.code})...\n`);

  runNodeScript("scripts/create-test-admin.mjs");
  runNodeScript("scripts/bootstrap-test-users.mjs");
  await resetStaffDevice(TEST_MANAGER_EMAIL);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Unknown failure");
});
