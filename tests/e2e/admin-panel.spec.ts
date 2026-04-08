import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  STAFF_DEVICE_COOKIE,
  STAFF_DEVICE_NAME_COOKIE,
  WORKSTATION_DEVICE_ID_STORAGE_KEY,
} from "../../apps/admin/lib/staff-device-shared";

import {
  createPendingCashReconciliation,
  createPendingTransactionRequest,
  getMemberAccountsByProfileId,
  getProfileByEmail,
  getProfileByPhone,
  getSeededPanelContext,
  newTestId,
  seededBranch,
  seededUsers,
} from "./support/admin-panel-fixtures";

const PLAYWRIGHT_WORKSTATION_ID = "workstation-playwright-e2e";
const PLAYWRIGHT_WORKSTATION_NAME = "Playwright-Chromium";

async function primeWorkstationIdentity(page: Page) {
  await page.addInitScript(
    ({ storageKey, workstationId }) => {
      window.localStorage.setItem(storageKey, workstationId);
    },
    {
      storageKey: WORKSTATION_DEVICE_ID_STORAGE_KEY,
      workstationId: PLAYWRIGHT_WORKSTATION_ID,
    },
  );

  await page.context().addCookies([
    {
      name: STAFF_DEVICE_COOKIE,
      url: "http://127.0.0.1:3000",
      value: PLAYWRIGHT_WORKSTATION_ID,
    },
    {
      name: STAFF_DEVICE_NAME_COOKIE,
      url: "http://127.0.0.1:3000",
      value: PLAYWRIGHT_WORKSTATION_NAME,
    },
  ]);
}

async function signIn(page: Page, credentials: { email: string; password: string }) {
  await primeWorkstationIdentity(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForLoadState("networkidle");

  if (page.url().includes("/workstation-blocked")) {
    const trustButton = page.getByRole("button", { name: "Trust This Workstation" });

    if (await trustButton.isVisible()) {
      await trustButton.click();
      await page.waitForLoadState("networkidle");
    }
  }
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function completeBranchManagerSetup(
  page: Page,
  input: {
    currentPassword: string;
    newPassword: string;
    transactionPin: string;
  },
) {
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByLabel("Current Temporary Password").fill(input.currentPassword);
  await page.getByLabel("New Password", { exact: true }).fill(input.newPassword);
  await page.getByLabel("Confirm New Password", { exact: true }).fill(input.newPassword);
  await page.getByLabel("Transaction PIN", { exact: true }).fill(input.transactionPin);
  await page.getByLabel("Confirm Transaction PIN", { exact: true }).fill(input.transactionPin);
  await page.getByRole("button", { name: "Complete Security Setup" }).click();
  await expect(page).toHaveURL(/\/branch\?result=success/);
}

function transactionRow(page: Page, reference: string): Locator {
  return page.locator("tr").filter({ hasText: reference });
}

function branchSelect(page: Page) {
  return page.locator('select[name="branchId"]');
}

function memberSelect(page: Page) {
  return page.getByRole("combobox", { name: "Member", exact: true });
}

function memberAccountSelect(page: Page) {
  return page.locator('select[name="memberAccountId"]');
}

function cashDrawerAgentSelect(page: Page) {
  return page.locator('select[name="cashAgentProfileId"]');
}

function assignedAgentSelect(page: Page) {
  return page.locator('select[name="assignedAgentId"]');
}

async function waitForProfile(email: string) {
  await expect.poll(async () => (await getProfileByEmail(email))?.id ?? null).not.toBeNull();
  const profile = await getProfileByEmail(email);

  if (!profile) {
    throw new Error(`Profile not found for ${email}.`);
  }

  return profile;
}

async function waitForProfileByPhone(phone: string) {
  await expect.poll(async () => (await getProfileByPhone(phone))?.id ?? null).not.toBeNull();
  const profile = await getProfileByPhone(phone);

  if (!profile) {
    throw new Error(`Profile not found for ${phone}.`);
  }

  return profile;
}

async function waitForMemberAccounts(profileId: string) {
  await expect.poll(async () => (await getMemberAccountsByProfileId(profileId)).length).toBeGreaterThan(1);
  return getMemberAccountsByProfileId(profileId);
}

test.describe("admin panel end-to-end flows", () => {
  test("admin can review institution screens and create branch-office transactions", async ({
    page,
  }) => {
    const context = await getSeededPanelContext();

    await signIn(page, seededUsers.admin);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByLabel("breadcrumb")).toContainText("Admin Dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Admin Dashboard" })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("All branches");
    await expect(page.getByRole("link", { name: "Branches" })).toBeVisible();

    await page.getByRole("link", { name: "Branches" }).click();
    await expect(page).toHaveURL(/\/branches$/);
    await expect(page.getByRole("heading", { level: 1, name: "Branches" })).toBeVisible();
    await expect(page.getByRole("link", { name: seededBranch.name })).toBeVisible();

    await page.getByRole("link", { name: seededBranch.name }).click();
    await expect(page.getByRole("heading", { level: 1, name: seededBranch.name })).toBeVisible();
    await expect(page.getByText(seededUsers.manager.fullName)).toBeVisible();

    await page.goto("/transactions/deposit");
    await expect(page.getByRole("heading", { level: 1, name: "Create Deposit" })).toBeVisible();
    await memberAccountSelect(page).selectOption(context.savingsAccount.id);
    await cashDrawerAgentSelect(page).selectOption(context.agent.id);
    await page.getByLabel("Amount").fill("150");
    await page.getByLabel("Note").fill("Playwright admin deposit");
    await page.getByRole("button", { name: "Create Deposit" }).click();
    await expect(page).toHaveURL(/\/transactions\/deposit\?result=success/);
    await expect(page.getByText("Deposit created and auto-approved.")).toBeVisible();

    await page.goto("/transactions/withdrawal");
    await expect(
      page.getByRole("heading", { level: 1, name: "Create Withdrawal" }),
    ).toBeVisible();
    await memberAccountSelect(page).selectOption(context.savingsAccount.id);
    await cashDrawerAgentSelect(page).selectOption(context.agent.id);
    await page.getByLabel("Amount").fill("25");
    await page.getByLabel("Note").fill("Playwright admin withdrawal");
    await page.getByRole("button", { name: "Create Withdrawal" }).click();
    await expect(page).toHaveURL(/\/transactions\/withdrawal\?result=success/);
    await expect(page.getByText("Withdrawal created and auto-approved.")).toBeVisible();

    await signOut(page);
  });

  test("branch manager can approve a pending agent transaction from the queue", async ({
    page,
  }) => {
    const request = await createPendingTransactionRequest({
      amount: 42.5,
      transactionType: "deposit",
    });

    await signIn(page, seededUsers.manager);

    await expect(page).toHaveURL(/\/branch$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Branch Dashboard" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Branches" })).toHaveCount(0);

    await page.goto("/transactions");
    await expect(page).toHaveURL(/\/transactions$/);
    const row = transactionRow(page, request.reference);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Approve" }).click();

    await expect(page).toHaveURL(/\/transactions\?result=success/);
    await expect(page.getByText("Transaction approved.")).toBeVisible();
    await expect(transactionRow(page, request.reference)).toContainText("approved");
    await expect(
      transactionRow(page, request.reference).getByRole("button", { name: "Approve" }),
    ).toHaveCount(0);

    await signOut(page);
  });

  test("branch manager can reject a pending agent transaction from the queue", async ({
    page,
  }) => {
    const request = await createPendingTransactionRequest({
      amount: 18.75,
      transactionType: "deposit",
    });

    await signIn(page, seededUsers.manager);
    await expect(page).toHaveURL(/\/branch$/);

    await page.goto("/transactions");
    const row = transactionRow(page, request.reference);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Reject" }).click();

    await expect(page).toHaveURL(/\/transactions\?result=success/);
    await expect(page.getByText("Transaction rejected.")).toBeVisible();
    await expect(transactionRow(page, request.reference)).toContainText("rejected");
    await expect(
      transactionRow(page, request.reference).getByRole("button", { name: "Reject" }),
    ).toHaveCount(0);

    await signOut(page);
  });

  test("branch manager can approve a pending cash reconciliation", async ({
    page,
  }) => {
    const reconciliation = await createPendingCashReconciliation({
      countedCash: 128,
      expectedCash: 100,
    });

    await signIn(page, seededUsers.manager);
    await expect(page).toHaveURL(/\/branch$/);

    await page.goto("/reconciliation");
    const row = transactionRow(page, reconciliation.reference);
    await expect(row).toBeVisible();
    await expect(row).toContainText(reconciliation.varianceReason);
    await row.getByRole("button", { name: "Approve" }).click();

    await expect(page).toHaveURL(/\/reconciliation\?result=success/);
    await expect(page.getByText("Cash reconciliation approved.")).toBeVisible();
    await expect(transactionRow(page, reconciliation.reference)).toContainText("approved");

    await signOut(page);
  });

  test("branch manager can reject a pending cash reconciliation", async ({
    page,
  }) => {
    const reconciliation = await createPendingCashReconciliation({
      countedCash: 92,
      expectedCash: 100,
    });

    await signIn(page, seededUsers.manager);
    await expect(page).toHaveURL(/\/branch$/);

    await page.goto("/reconciliation");
    const row = transactionRow(page, reconciliation.reference);
    await expect(row).toBeVisible();
    await expect(row).toContainText(reconciliation.varianceReason);
    await row.getByRole("button", { name: "Reject" }).click();

    await expect(page).toHaveURL(/\/reconciliation\?result=success/);
    await expect(page.getByText("Cash reconciliation rejected.")).toBeVisible();
    await expect(transactionRow(page, reconciliation.reference)).toContainText("rejected");

    await signOut(page);
  });

  test("admin and branch manager can create manager, agent, member, savings, deposit, and loan records", async ({
    page,
  }) => {
    const context = await getSeededPanelContext();
    const runId = newTestId("pw");
    const digits = runId.replace(/\D/g, "").slice(-8).padStart(8, "0");
    const manager = {
      fullName: `Playwright Manager ${runId}`,
      email: `${runId}-manager@example.com`,
      finalPassword: "Manager654321!",
      phone: `+23761${digits}`,
      password: "Manager123456!",
      transactionPin: "2468",
    };
    const agent = {
      fullName: `Playwright Agent ${runId}`,
      email: `${runId}-agent@example.com`,
      phone: `+23762${digits}`,
      password: "Agent123456!",
    };
    const member = {
      fullName: `Playwright Member ${runId}`,
      phone: `+23763${digits}`,
      idNumber: `PW${digits}`,
    };

    await signIn(page, seededUsers.admin);
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/managers/new");
    await expect(
      page.getByRole("heading", { level: 1, name: "Create Branch Manager" }),
    ).toBeVisible();
    await page.getByLabel("Full Name").fill(manager.fullName);
    await page.getByLabel("Email").fill(manager.email);
    await page.getByLabel("Phone").fill(manager.phone);
    await page.getByLabel("Temporary Password").fill(manager.password);
    await page.locator('select[name="branchId"]').selectOption(context.branch.id);
    await page.getByRole("button", { name: "Create Branch Manager" }).click();
    await expect(page).toHaveURL(/\/managers\/new\?result=success/);
    await expect(page.getByText(`Created branch manager ${manager.fullName}.`)).toBeVisible();

    const createdManager = await waitForProfile(manager.email);

    await page.goto("/managers");
    await expect(page.getByRole("heading", { level: 1, name: "Managers" })).toBeVisible();
    await expect(page.getByLabel("breadcrumb")).toContainText("Managers");
    await page.getByRole("link", { name: manager.fullName }).click();
    await expect(page).toHaveURL(new RegExp(`/managers/${createdManager.id}$`));
    await expect(page.getByRole("heading", { level: 1, name: manager.fullName })).toBeVisible();
    await expect(page.getByLabel("breadcrumb")).toContainText("People");
    await expect(page.getByText("Assigned Branch Summary")).toBeVisible();

    await signOut(page);

    await signIn(page, {
      email: manager.email,
      password: manager.password,
    });
    await completeBranchManagerSetup(page, {
      currentPassword: manager.password,
      newPassword: manager.finalPassword,
      transactionPin: manager.transactionPin,
    });

    await page.goto("/agents/new");
    await expect(page.getByRole("heading", { level: 1, name: "Create Agent" })).toBeVisible();
    await page.getByLabel("Full Name").fill(agent.fullName);
    await page.getByLabel("Email").fill(agent.email);
    await page.getByLabel("Phone").fill(agent.phone);
    await page.getByLabel("Temporary Password").fill(agent.password);
    await page.locator('select[name="branchId"]').selectOption(context.branch.id);
    await page.getByRole("button", { name: "Create Agent" }).click();
    await expect(page).toHaveURL(/\/agents\/new\?result=success/);
    await expect(page.getByText(`Created agent ${agent.fullName}.`)).toBeVisible();

    const createdAgent = await waitForProfile(agent.email);

    await page.goto("/agents");
    await expect(page.getByRole("heading", { level: 1, name: "Agents" })).toBeVisible();
    await page.getByRole("link", { name: agent.fullName }).click();
    await expect(page).toHaveURL(new RegExp(`/agents/${createdAgent.id}$`));
    await expect(page.getByRole("heading", { level: 1, name: agent.fullName })).toBeVisible();
    await expect(page.getByLabel("breadcrumb")).toContainText("Agents");
    await expect(page.getByRole("main")).toContainText("Assigned Members");

    await page.goto("/members/new");
    await expect(page.getByRole("heading", { level: 1, name: "Create Member" })).toBeVisible();
    await page.getByLabel("Full Name").fill(member.fullName);
    await page.getByLabel("Phone Number").fill(member.phone);
    await page.getByLabel("ID Card Number").fill(member.idNumber);
    await page.locator('select[name="branchId"]').selectOption(context.branch.id);
    await assignedAgentSelect(page).selectOption(createdAgent.id);
    await page.getByRole("button", { name: "Save Member" }).click();
    await expect(page).toHaveURL(/\/members\/new\?result=success/);
    await expect(page.getByText(`Created member ${member.fullName}.`)).toBeVisible();

    const createdMember = await waitForProfileByPhone(member.phone);
    const memberAccounts = await waitForMemberAccounts(createdMember.id);
    expect(memberAccounts.map((account) => account.account_type).sort()).toEqual([
      "deposit",
      "savings",
    ]);

    await page.goto("/members");
    await expect(page.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
    await page.getByRole("link", { name: member.fullName }).click();
    await expect(page.getByRole("heading", { level: 1, name: member.fullName })).toBeVisible();
    await expect(page.getByLabel("breadcrumb")).toContainText("Members");
    await expect(page.getByText("Account Summary")).toBeVisible();

    await page.goto("/loans");
    await expect(page.getByRole("heading", { level: 1, name: "Loans" })).toBeVisible();
    await page.locator('select[name="memberProfileId"]').selectOption(createdMember.id);
    await page.getByLabel("Requested amount").fill("800");
    await page.getByLabel("Monthly interest rate").fill("0.03");
    await page.getByLabel("Term (months)").fill("12");
    await page.getByLabel("Application note").fill("Playwright loan workflow");
    await page.getByRole("button", { name: "Create Loan Application" }).click();
    await expect(page).toHaveURL(/\/loans\?result=success/);
    await expect(page.getByText("Loan application created.")).toBeVisible();

    const applicationRow = page
      .locator("tr")
      .filter({ hasText: member.fullName })
      .filter({ hasText: "application_submitted" })
      .first();
    await expect(applicationRow).toBeVisible();
    await applicationRow.getByRole("button", { name: "Mark In Review" }).click();
    await expect(page.getByText("Loan application marked under review.")).toBeVisible();

    const reviewRow = page
      .locator("tr")
      .filter({ hasText: member.fullName })
      .filter({ hasText: "under_review" })
      .first();
    await expect(reviewRow).toBeVisible();
    await reviewRow.locator('input[name="approvedPrincipal"]').fill("800");
    await reviewRow.getByRole("button", { name: "Approve Application" }).click();
    await expect(page.getByText("Loan application approved.")).toBeVisible();

    const disburseRow = page
      .locator("tr")
      .filter({ hasText: member.fullName })
      .filter({ hasText: "approved" })
      .filter({ has: page.getByRole("button", { name: "Disburse Loan" }) })
      .first();
    await expect(disburseRow).toBeVisible();
    await disburseRow.locator('select[name="cashAgentProfileId"]').selectOption(createdAgent.id);
    await disburseRow.getByRole("button", { name: "Disburse Loan" }).click();
    await expect(page.getByText("Loan disbursed.")).toBeVisible();

    const repaymentRow = page
      .locator("tr")
      .filter({ hasText: member.fullName })
      .filter({ hasText: "disbursed" })
      .filter({ has: page.getByRole("button", { name: "Record Repayment" }) })
      .first();
    await expect(repaymentRow).toBeVisible();
    await repaymentRow.locator('select[name="cashAgentProfileId"]').selectOption(createdAgent.id);
    await repaymentRow.locator('input[name="amount"]').fill("50");
    await repaymentRow.locator('select[name="repaymentMode"]').selectOption("interest_plus_principal");
    await repaymentRow.getByRole("button", { name: "Record Repayment" }).click();
    await expect(page.getByText("Loan repayment recorded.")).toBeVisible();
    await expect(page.locator("tr").filter({ hasText: member.fullName }).filter({ hasText: "active" })).toBeVisible();

    await signOut(page);
  });
});
