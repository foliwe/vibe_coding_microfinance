import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

if (existsSync("apps/admin/.env.local")) {
  loadEnvFile("apps/admin/.env.local");
} else if (existsSync(".env.local")) {
  loadEnvFile(".env.local");
}

const APP_URL = process.env.ADMIN_APP_URL ?? "http://127.0.0.1:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_BRANCH_CODE = process.env.TEST_BRANCH_CODE ?? "BAM";
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@example.com";
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "Admin123456!";
const TEST_MANAGER_EMAIL = process.env.TEST_MANAGER_EMAIL ?? "manager@example.com";
const TEST_MANAGER_PASSWORD = process.env.TEST_MANAGER_PASSWORD ?? "Manager123456!";
const TEST_MEMBER_EMAIL = process.env.TEST_MEMBER_EMAIL ?? "member@example.com";
const TEST_AGENT_EMAIL = process.env.TEST_AGENT_EMAIL ?? "agent@example.com";

function fail(message) {
  console.error(`\nAdmin smoke failed: ${message}\n`);
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

function runNodeScript(path) {
  execFileSync(process.execPath, [path], { stdio: "inherit" });
}

async function fetchSingle(query, label) {
  const { data, error } = await query;

  if (error || !data) {
    fail(error?.message ?? `Missing ${label}.`);
  }

  return data;
}

async function getSeededContext() {
  const branch = await fetchSingle(
    supabase.from("branches").select("id, code, name").eq("code", TEST_BRANCH_CODE).maybeSingle(),
    `branch ${TEST_BRANCH_CODE}`,
  );

  const member = await fetchSingle(
    supabase.from("profiles").select("id, full_name").eq("email", TEST_MEMBER_EMAIL).maybeSingle(),
    `member ${TEST_MEMBER_EMAIL}`,
  );

  const agent = await fetchSingle(
    supabase.from("profiles").select("id, full_name").eq("email", TEST_AGENT_EMAIL).maybeSingle(),
    `agent ${TEST_AGENT_EMAIL}`,
  );

  const savingsAccount = await fetchSingle(
    supabase
      .from("member_accounts")
      .select("id, account_number")
      .eq("account_number", `${branch.code}-SAV-0001`)
      .maybeSingle(),
    "seeded savings account",
  );

  return { branch, member, agent, savingsAccount };
}

async function signIn(page, email, password) {
  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signOut(page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login$/);
}

async function expectVisible(page, selector, message) {
  await selector.waitFor({ state: "visible", timeout: 30000 });
  if (!(await selector.isVisible())) {
    fail(message);
  }
}

async function waitFor(condition, message, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await condition()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  fail(message);
}

async function main() {
  const smokeStartedAt = new Date().toISOString();
  runNodeScript("scripts/bootstrap-admin-panel-e2e.mjs");
  const context = await getSeededContext();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await signIn(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await page.waitForURL(/\/$/, { timeout: 30000 });
    await expectVisible(
      page,
      page.getByRole("heading", { level: 1, name: "Admin Dashboard" }),
      "Admin dashboard did not load.",
    );

    await page.goto(`${APP_URL}/transactions/deposit`, { waitUntil: "domcontentloaded" });
    await expectVisible(
      page,
      page.getByRole("heading", { level: 1, name: "Create Deposit" }),
      "Admin deposit page did not load.",
    );
    await page.locator('select[name="memberAccountId"]').selectOption(context.savingsAccount.id);
    await page.locator('select[name="cashAgentProfileId"]').selectOption(context.agent.id);
    await page.getByLabel("Amount").fill("35");
    await page.getByLabel("Note").fill("Smoke deposit");
    await page.getByRole("button", { name: "Create Deposit" }).click();
    await page.waitForURL(/\/transactions\/deposit\?result=success/, { timeout: 30000 });
    await expectVisible(
      page,
      page.getByText("Deposit created and auto-approved."),
      "Deposit success message did not appear.",
    );

    await signOut(page);

    await signIn(page, TEST_MANAGER_EMAIL, TEST_MANAGER_PASSWORD);
    await page.waitForURL(/\/branch$/, { timeout: 30000 });
    await expectVisible(
      page,
      page.getByRole("heading", { level: 1, name: "Branch Dashboard" }),
      "Branch dashboard did not load.",
    );

    await page.goto(`${APP_URL}/members`, { waitUntil: "domcontentloaded" });
    await expectVisible(
      page,
      page.getByRole("heading", { level: 1, name: "Members" }),
      "Members page did not load.",
    );
    await page.getByRole("link", { name: new RegExp(context.member.full_name, "i") }).click();
    await expectVisible(
      page,
      page.getByText("Account Summary"),
      "Member profile did not render account summary.",
    );

    await page.goto(`${APP_URL}/loans`, { waitUntil: "domcontentloaded" });
    await expectVisible(
      page,
      page.getByRole("heading", { level: 1, name: "Loans" }),
      "Loans page did not load.",
    );
    await page.locator('select[name="memberProfileId"]').selectOption(context.member.id);
    await page.getByLabel("Requested amount").fill("120");
    await page.getByLabel("Monthly interest rate").fill("0.03");
    await page.getByLabel("Term (months)").fill("6");
    await page.getByLabel("Application note").fill("Smoke loan workflow");
    await page.getByRole("button", { name: "Create Loan Application" }).click();
    await page.waitForURL(/\/loans\?result=success/, { timeout: 30000 });
    await expectVisible(
      page,
      page.getByText("Loan application created."),
      "Loan application success message did not appear.",
    );

    const applicationRow = page
      .locator("tr")
      .filter({ hasText: context.member.full_name })
      .filter({ hasText: "application_submitted" })
      .first();
    await expectVisible(page, applicationRow, "Submitted loan application row did not appear.");
    await applicationRow.getByRole("button", { name: "Mark In Review" }).click();
    await expectVisible(
      page,
      page.getByText("Loan application marked under review."),
      "Loan review success message did not appear.",
    );

    const reviewRow = page
      .locator("tr")
      .filter({ hasText: context.member.full_name })
      .filter({ hasText: "under_review" })
      .first();
    await expectVisible(page, reviewRow, "Under-review loan row did not appear.");
    await reviewRow.locator('input[name="approvedPrincipal"]').fill("120");
    await reviewRow.getByRole("button", { name: "Approve Application" }).click();
    await expectVisible(
      page,
      page.getByText("Loan application approved."),
      "Loan approval success message did not appear.",
    );

    const disburseRow = page
      .locator("tr")
      .filter({ hasText: context.member.full_name })
      .filter({ hasText: "approved" })
      .filter({ has: page.getByRole("button", { name: "Disburse Loan" }) })
      .first();
    await expectVisible(page, disburseRow, "Approved loan row did not appear.");
    await disburseRow.locator('select[name="cashAgentProfileId"]').selectOption(context.agent.id);
    await disburseRow.getByRole("button", { name: "Disburse Loan" }).click();
    await expectVisible(page, page.getByText("Loan disbursed."), "Loan disbursement did not complete.");

    const repaymentRow = page
      .locator("tr")
      .filter({ hasText: context.member.full_name })
      .filter({ hasText: "disbursed" })
      .filter({ has: page.getByRole("button", { name: "Record Repayment" }) })
      .first();
    await expectVisible(page, repaymentRow, "Disbursed loan row did not appear.");
    await repaymentRow.locator('select[name="cashAgentProfileId"]').selectOption(context.agent.id);
    await repaymentRow.locator('input[name="amount"]').fill("15");
    await repaymentRow.locator('select[name="repaymentMode"]').selectOption("interest_plus_principal");
    await repaymentRow.getByRole("button", { name: "Record Repayment" }).click();
    await waitFor(async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("id, status, created_at")
        .eq("member_profile_id", context.member.id)
        .gte("created_at", smokeStartedAt)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data || (data.status !== "active" && data.status !== "closed")) {
        return false;
      }

      const repaymentResponse = await supabase
        .from("loan_repayments")
        .select("id")
        .eq("loan_id", data.id)
        .gte("created_at", smokeStartedAt)
        .limit(1)
        .maybeSingle();

      return Boolean(repaymentResponse.data);
    }, "Loan repayment was submitted, but no new repayment record was confirmed in Supabase.");

    console.log("Admin workflow smoke passed.");
    console.log(
      "Verified admin sign-in, deposit creation, manager sign-in, member profile, loan application, approval, disbursement, and repayment.",
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Unknown failure");
});
