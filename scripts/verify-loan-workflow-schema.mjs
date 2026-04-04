import { existsSync } from "node:fs";
import crypto from "node:crypto";
import { loadEnvFile } from "node:process";

import { createClient } from "@supabase/supabase-js";

if (existsSync("apps/admin/.env.local")) {
  loadEnvFile("apps/admin/.env.local");
} else if (existsSync(".env.local")) {
  loadEnvFile(".env.local");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REQUIRED_TABLES = [
  "loan_applications",
  "loans",
  "loan_collateral",
  "loan_repayments",
];
const REQUIRED_RPCS = [
  {
    args: {
      p_device_id: "smoke-device",
      p_device_kind: "mobile",
    },
    acceptedErrors: ["active actor profile not found"],
    name: "assert_staff_device_access",
  },
  {
    args: {
      p_device_id: "smoke-device",
      p_device_kind: "mobile",
      p_device_name: "Schema Smoke Device",
    },
    acceptedErrors: ["active actor profile not found"],
    name: "register_my_device",
  },
];

function fail(message) {
  console.error(`\nSchema smoke failed: ${message}\n`);
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

async function verifyTable(name) {
  const { error } = await supabase.from(name).select("*", { head: true, count: "exact" }).limit(1);

  if (error) {
    fail(`table ${name} is unavailable: ${error.message}`);
  }
}

async function verifyLoanColumns() {
  const { error } = await supabase
    .from("ledger_accounts")
    .select("loan_id, account_type", { head: true, count: "exact" })
    .limit(1);

  if (error) {
    fail(`loan-specific ledger columns are unavailable: ${error.message}`);
  }
}

async function verifyLoanRoutine() {
  const { error } = await supabase.rpc("ensure_loan_ledger_account", {
    p_loan_id: crypto.randomUUID(),
    p_account_type: "loan_principal",
  });

  if (!error) {
    return;
  }

  if (
    error.message.includes("loan not found") ||
    error.message.includes("unsupported loan ledger account type")
  ) {
    return;
  }

  fail(`loan workflow RPC check failed: ${error.message}`);
}

async function verifyRpcExists({ name, args, acceptedErrors }) {
  const { error } = await supabase.rpc(name, args);

  if (!error) {
    return;
  }

  if (acceptedErrors.some((message) => error.message.includes(message))) {
    return;
  }

  fail(`required RPC ${name} is unavailable: ${error.message}`);
}

async function main() {
  for (const table of REQUIRED_TABLES) {
    await verifyTable(table);
  }

  await verifyLoanColumns();
  await verifyLoanRoutine();

  for (const rpc of REQUIRED_RPCS) {
    await verifyRpcExists(rpc);
  }

  console.log("Schema smoke passed.");
  console.log(`Verified tables: ${REQUIRED_TABLES.join(", ")}`);
  console.log(
    `Verified loan ledger columns plus RPCs: ensure_loan_ledger_account, ${REQUIRED_RPCS.map((rpc) => rpc.name).join(", ")}.`,
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Unknown failure");
});
