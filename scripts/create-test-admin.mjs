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

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@example.com";
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "Admin123456!";
const TEST_ADMIN_NAME = process.env.TEST_ADMIN_NAME ?? "Main Admin";
const TEST_ADMIN_PHONE = process.env.TEST_ADMIN_PHONE ?? "+237600000000";

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

if (!SUPABASE_URL) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL.");
}

if (!SERVICE_ROLE_KEY) {
  fail(
    "Missing SUPABASE_SERVICE_ROLE_KEY. This script needs the service role key to create an auth user and assign the admin profile.",
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensureAdminUser() {
  const listResponse = await supabase.auth.admin.listUsers();
  if (listResponse.error) {
    fail(`Unable to list users: ${listResponse.error.message}`);
  }

  const existingUser = listResponse.data.users.find(
    (user) => user.email?.toLowerCase() === TEST_ADMIN_EMAIL.toLowerCase(),
  );

  if (existingUser) {
    return existingUser;
  }

  const createResponse = await supabase.auth.admin.createUser({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: TEST_ADMIN_NAME,
    },
  });

  if (createResponse.error || !createResponse.data.user) {
    fail(
      `Unable to create auth user: ${createResponse.error?.message ?? "Unknown error"}`,
    );
  }

  return createResponse.data.user;
}

async function upsertAdminProfile(userId) {
  const profilePayload = {
    id: userId,
    role: "admin",
    full_name: TEST_ADMIN_NAME,
    phone: TEST_ADMIN_PHONE,
    email: TEST_ADMIN_EMAIL,
    branch_id: null,
    must_change_password: false,
    requires_pin_setup: false,
    is_active: true,
  };

  const profileResponse = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" })
    .select("id, role, full_name, email")
    .single();

  if (profileResponse.error) {
    fail(`Unable to upsert admin profile: ${profileResponse.error.message}`);
  }

  return profileResponse.data;
}

async function main() {
  console.log("\nCreating or updating test admin...\n");

  const user = await ensureAdminUser();
  const profile = await upsertAdminProfile(user.id);

  console.log("Test admin ready:");
  console.log(`- Email: ${TEST_ADMIN_EMAIL}`);
  console.log(`- Password: ${TEST_ADMIN_PASSWORD}`);
  console.log(`- User ID: ${user.id}`);
  console.log(`- Role: ${profile.role}`);
  console.log("\nYou can now sign in at http://localhost:3000/login\n");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Unknown failure");
});
