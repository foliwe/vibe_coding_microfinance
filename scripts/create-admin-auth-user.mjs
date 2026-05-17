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

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "foliadmin@mailbali.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Foli@18821882";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Foli Fossung";
const ADMIN_PHONE = process.env.ADMIN_PHONE ?? "+237600000999";

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

async function ensureAdminAuthUser() {
  const listResponse = await supabase.auth.admin.listUsers();

  if (listResponse.error) {
    fail(`Unable to list auth users: ${listResponse.error.message}`);
  }

  const existingUser = listResponse.data.users.find(
    (user) => user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
  );

  if (existingUser) {
    const updateResponse = await supabase.auth.admin.updateUserById(existingUser.id, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: ADMIN_NAME,
        email_verified: true,
      },
      app_metadata: {
        role: "admin",
      },
    });

    if (updateResponse.error || !updateResponse.data.user) {
      fail(
        `Unable to update auth user: ${updateResponse.error?.message ?? "Unknown error"}`,
      );
    }

    return updateResponse.data.user;
  }

  const createResponse = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: ADMIN_NAME,
      email_verified: true,
    },
    app_metadata: {
      role: "admin",
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
    full_name: ADMIN_NAME,
    phone: ADMIN_PHONE,
    email: ADMIN_EMAIL,
    branch_id: null,
    must_change_password: false,
    requires_pin_setup: false,
    is_active: true,
  };

  const profileResponse = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" })
    .select("id, role, full_name, email, phone")
    .single();

  if (profileResponse.error) {
    fail(`Unable to upsert admin profile: ${profileResponse.error.message}`);
  }

  return profileResponse.data;
}

async function main() {
  console.log("\nCreating or updating admin auth user and profile...\n");

  const user = await ensureAdminAuthUser();
  const profile = await upsertAdminProfile(user.id);

  console.log("Admin user ready:");
  console.log(`- Email: ${ADMIN_EMAIL}`);
  console.log(`- Password: ${ADMIN_PASSWORD}`);
  console.log(`- Full name: ${ADMIN_NAME}`);
  console.log(`- Phone: ${profile.phone}`);
  console.log(`- User ID: ${user.id}`);
  console.log(`- Role: ${profile.role}`);
  console.log("");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Unknown failure");
});
