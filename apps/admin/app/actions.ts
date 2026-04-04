"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { RepaymentMode, TransactionType } from "@credit-union/shared";
import {
  assertValidBranchCode,
  provisionMember,
} from "@credit-union/shared";

import { requireRole } from "../lib/auth";
import {
  registerCurrentWorkstation,
  syncWorkstationIdentityFromFormData,
} from "../lib/staff-device";
import { hasSupabaseEnv, hasSupabaseServiceEnv } from "../lib/supabase/env";
import { createServiceClient } from "../lib/supabase/service";
import { createClient } from "../lib/supabase/server";

type RedirectResult = "success" | "error";

const MEMBER_CREATION_FLASH_COOKIE = "member_creation_flash";

type ServiceClient = ReturnType<typeof createServiceClient>;

type MemberProvisionInput = {
  actorId: string;
  approvedById?: string;
  assignedAgentId: string;
  branchId: string;
  createdById?: string;
  dateOfBirth?: string | null;
  depositAccountNumber?: string;
  fullName: string;
  gender?: string | null;
  idNumber: string;
  idType?: string | null;
  nextOfKinAddress?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
  occupation?: string | null;
  password?: string | null;
  phone: string;
  residentialAddress?: string | null;
  savingsAccountNumber?: string;
};

function buildRedirect(path: string, result: RedirectResult, detail?: string): Route {
  const params = new URLSearchParams();
  params.set("result", result);

  if (detail) {
    params.set("detail", detail);
  }

  return `${path}?${params.toString()}` as Route;
}

async function clearMemberCreationFlash() {
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_CREATION_FLASH_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/members/new",
    sameSite: "lax",
  });
}

async function setMemberCreationFlash(input: {
  fullName: string;
  signInCode: string;
  temporaryPassword: string;
}) {
  const cookieStore = await cookies();
  cookieStore.set(
    MEMBER_CREATION_FLASH_COOKIE,
    JSON.stringify(input),
    {
      httpOnly: true,
      maxAge: 300,
      path: "/members/new",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}

function requiredValue(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

function optionalValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function booleanValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim().toLowerCase();
  return value === "true" || value === "yes" || value === "on";
}

function requiredNumberValue(formData: FormData, key: string, label: string) {
  const value = Number(requiredValue(formData, key, label));

  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a valid number.`);
  }

  return value;
}

function revalidateLoanPaths() {
  revalidatePath("/loans");
  revalidatePath("/");
  revalidatePath("/branch");
}

async function createAuthUser(email: string, password: string, fullName: string) {
  const service = createServiceClient();
  const response = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (response.error || !response.data.user) {
    throw new Error(response.error?.message ?? `Unable to create auth user for ${email}.`);
  }

  return response.data.user;
}

async function deleteAuthUserIfPresent(userId: string | null) {
  if (!userId) {
    return;
  }

  const service = createServiceClient();
  await service.auth.admin.deleteUser(userId).catch(() => undefined);
}

async function getBranchRecord(branchId: string) {
  const service = createServiceClient();
  const response = await service
    .from("branches")
    .select("id, name, code, manager_profile_id")
    .eq("id", branchId)
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Selected branch was not found.");
  }

  return response.data as {
    id: string;
    name: string;
    code: string;
    manager_profile_id: string | null;
  };
}

async function assertAssignedAgent(
  service: ServiceClient,
  branchId: string,
  assignedAgentId: string,
) {
  const response = await service
    .from("profiles")
    .select("id, branch_id, role")
    .eq("id", assignedAgentId)
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Assigned agent was not found.");
  }

  if (response.data.role !== "agent" || response.data.branch_id !== branchId) {
    throw new Error("Assigned agent must belong to the selected branch.");
  }

  return response.data;
}

async function writeAuditLogEntry(
  service: ServiceClient,
  input: {
    actorId: string;
    branchId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
) {
  const response = await service.from("audit_logs").insert({
    actor_id: input.actorId,
    branch_id: input.branchId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  });

  if (response.error) {
    throw new Error(response.error.message);
  }
}

function revalidateMemberPaths(memberId?: string) {
  revalidatePath("/members");
  revalidatePath("/members/new");
  revalidatePath("/agents");
  revalidatePath("/branch");
  revalidatePath("/");

  if (memberId) {
    revalidatePath(`/members/${memberId}`);
  }
}

async function provisionMemberRecord({
  actorId,
  approvedById,
  assignedAgentId,
  branchId,
  createdById,
  dateOfBirth,
  depositAccountNumber,
  fullName,
  gender,
  idNumber,
  idType,
  nextOfKinAddress,
  nextOfKinName,
  nextOfKinPhone,
  occupation,
  password,
  phone,
  residentialAddress,
  savingsAccountNumber,
}: MemberProvisionInput) {
  const service = createServiceClient();
  const branch = await getBranchRecord(branchId);
  await assertAssignedAgent(service, branch.id, assignedAgentId);
  const provisionedMember = await provisionMember(service, {
    actorId,
    approvedById,
    assignedAgentId,
    branch,
    createdById,
    dateOfBirth,
    depositAccountNumber,
    fallbackSeed: branch.id,
    fullName,
    gender,
    idNumber,
    idType,
    nextOfKinAddress,
    nextOfKinName,
    nextOfKinPhone,
    occupation,
    password,
    phone,
    residentialAddress,
    savingsAccountNumber,
  });

  return {
    branch,
    idNumber: provisionedMember.idNumber,
    loginEmail: provisionedMember.loginEmail,
    memberId: provisionedMember.memberId,
    signInCode: provisionedMember.signInCode,
    temporaryPassword: provisionedMember.temporaryPassword,
  };
}

function assertServiceEnv(path: string) {
  if (!hasSupabaseEnv() || !hasSupabaseServiceEnv()) {
    redirect(buildRedirect(path, "error", "Supabase service credentials are missing."));
  }
}

function assertBranchForRole(
  role: "admin" | "branch_manager",
  profileBranchId: string | null,
  requestedBranchId: string | null,
) {
  if (role === "branch_manager") {
    if (!profileBranchId) {
      throw new Error("This branch manager is not assigned to a branch.");
    }

    return profileBranchId;
  }

  if (!requestedBranchId) {
    throw new Error("Branch is required.");
  }

  return requestedBranchId;
}

async function mutateTransactionRequest(
  action: "approve_transaction_request" | "reject_transaction_request",
  formData: FormData,
) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect("/transactions", "error", "Supabase credentials are missing."));
  }

  const requestId = requiredValue(formData, "requestId", "Transaction request");
  const note = optionalValue(formData, "note");

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const { error } = await supabase.rpc(action, {
    p_request_id: requestId,
    p_actor_id: profile.id,
    p_note: note,
  });

  if (error) {
    redirect(buildRedirect("/transactions", "error", error.message));
  }

  revalidatePath("/transactions");
  revalidatePath("/");
  revalidatePath("/branch");
  redirect(
    buildRedirect(
      "/transactions",
      "success",
      action === "approve_transaction_request" ? "Transaction approved." : "Transaction rejected.",
    ),
  );
}

export async function signOutAction() {
  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function completeBranchManagerSetupAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect("/setup", "error", "Supabase credentials are missing."));
  }

  try {
    const { supabase, profile } = await requireRole(["branch_manager"], {
      allowIncompleteSetup: true,
      allowUntrustedDevice: true,
    });

    const currentPassword = String(formData.get("currentPassword") ?? "").trim();
    const newPassword = String(formData.get("newPassword") ?? "").trim();
    const confirmNewPassword = String(formData.get("confirmNewPassword") ?? "").trim();
    const transactionPin = String(formData.get("transactionPin") ?? "").trim();
    const confirmTransactionPin = String(formData.get("confirmTransactionPin") ?? "").trim();

    if (profile.must_change_password) {
      if (!currentPassword) {
        throw new Error("Current temporary password is required.");
      }

      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters.");
      }

      if (newPassword !== confirmNewPassword) {
        throw new Error("Your new password and confirmation must match.");
      }
    }

    if (profile.requires_pin_setup) {
      if (!/^\d{4}$/.test(transactionPin)) {
        throw new Error("Transaction PIN must be exactly 4 digits.");
      }

      if (transactionPin !== confirmTransactionPin) {
        throw new Error("Your transaction PIN and confirmation must match.");
      }
    }

    await syncWorkstationIdentityFromFormData(formData);

    if (profile.must_change_password) {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: completeError } = await supabase.rpc("complete_password_change");

      if (completeError) {
        throw new Error(completeError.message);
      }
    }

    if (profile.requires_pin_setup) {
      const { error: pinError } = await supabase.rpc("set_my_transaction_pin", {
        p_pin: transactionPin,
      });

      if (pinError) {
        throw new Error(pinError.message);
      }
    }

    await registerCurrentWorkstation(supabase);
  } catch (error) {
    redirect(
      buildRedirect(
        "/setup",
        "error",
        error instanceof Error ? error.message : "Unable to complete setup.",
      ),
    );
  }

  revalidatePath("/branch");
  revalidatePath("/settings");
  redirect(buildRedirect("/branch", "success", "Security setup complete."));
}

export async function approveTransactionRequestAction(formData: FormData) {
  await mutateTransactionRequest("approve_transaction_request", formData);
}

export async function rejectTransactionRequestAction(formData: FormData) {
  await mutateTransactionRequest("reject_transaction_request", formData);
}

export async function reviewCashReconciliationAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect("/reconciliation", "error", "Supabase credentials are missing."));
  }

  try {
    const reconciliationId = requiredValue(
      formData,
      "reconciliationId",
      "Cash reconciliation",
    );
    const reviewAction = requiredValue(formData, "reviewAction", "Review action");
    const reviewNote = optionalValue(formData, "reviewNote");

    if (reviewAction !== "approve" && reviewAction !== "reject") {
      throw new Error("Review action must be approve or reject.");
    }

    const { supabase } = await requireRole(["admin", "branch_manager"]);
    const { error } = await supabase.rpc("review_cash_reconciliation", {
      p_action: reviewAction,
      p_reconciliation_id: reconciliationId,
      p_review_note: reviewNote,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirect(
      buildRedirect(
        "/reconciliation",
        "error",
        error instanceof Error ? error.message : "Unable to review the cash reconciliation.",
      ),
    );
  }

  revalidatePath("/reconciliation");
  revalidatePath("/branch");
  revalidatePath("/");
  redirect(
    buildRedirect(
      "/reconciliation",
      "success",
      requiredValue(formData, "reviewAction", "Review action") === "approve"
        ? "Cash reconciliation approved."
        : "Cash reconciliation rejected.",
    ),
  );
}

async function createAdminTransactionAction(
  transactionType: Extract<TransactionType, "deposit" | "withdrawal">,
  path: Route,
  formData: FormData,
) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect(path, "error", "Supabase credentials are missing."));
  }

  try {
    const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
    const memberAccountId = requiredValue(formData, "memberAccountId", "Member account");
    const cashAgentProfileId = requiredValue(formData, "cashAgentProfileId", "Cash drawer agent");
    const amountValue = requiredValue(formData, "amount", "Amount");
    const note = optionalValue(formData, "note");
    const amount = Number(amountValue);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be greater than zero.");
    }

    const { error } = await supabase.rpc("create_admin_transaction", {
      p_actor_id: profile.id,
      p_member_account_id: memberAccountId,
      p_cash_agent_profile_id: cashAgentProfileId,
      p_transaction_type: transactionType,
      p_amount: amount,
      p_note: note,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirect(
      buildRedirect(
        path,
        "error",
        error instanceof Error ? error.message : "Unable to create transaction.",
      ),
    );
  }

  revalidatePath(path);
  revalidatePath("/transactions");
  revalidatePath("/");
  revalidatePath("/branch");
  redirect(
    buildRedirect(
      path,
      "success",
      `${transactionType === "deposit" ? "Deposit" : "Withdrawal"} created and auto-approved.`,
    ),
  );
}

export async function createDepositAction(formData: FormData) {
  await createAdminTransactionAction("deposit", "/transactions/deposit", formData);
}

export async function createWithdrawalAction(formData: FormData) {
  await createAdminTransactionAction("withdrawal", "/transactions/withdrawal", formData);
}

export async function createLoanApplicationAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect("/loans", "error", "Supabase credentials are missing."));
  }

  try {
    const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
    const memberProfileId = requiredValue(formData, "memberProfileId", "Member");
    const requestedAmount = requiredNumberValue(formData, "requestedAmount", "Requested amount");
    const monthlyInterestRate = requiredNumberValue(
      formData,
      "monthlyInterestRate",
      "Monthly interest rate",
    );
    const termMonths = requiredNumberValue(formData, "termMonths", "Term months");
    const collateralRequired = booleanValue(formData, "collateralRequired");
    const collateralNotes = optionalValue(formData, "collateralNotes");
    const note = optionalValue(formData, "note");

    const { error } = await supabase.rpc("create_loan_application", {
      p_actor_id: profile.id,
      p_member_profile_id: memberProfileId,
      p_requested_amount: requestedAmount,
      p_monthly_interest_rate: monthlyInterestRate,
      p_term_months: Math.trunc(termMonths),
      p_collateral_required: collateralRequired,
      p_collateral_notes: collateralNotes,
      p_note: note,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirect(
      buildRedirect(
        "/loans",
        "error",
        error instanceof Error ? error.message : "Unable to create loan application.",
      ),
    );
  }

  revalidateLoanPaths();
  redirect(buildRedirect("/loans", "success", "Loan application created."));
}

async function mutateLoanApplicationAction(
  action:
    | "start_loan_application_review"
    | "approve_loan_application"
    | "reject_loan_application",
  formData: FormData,
) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect("/loans", "error", "Supabase credentials are missing."));
  }

  try {
    const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
    const applicationId = requiredValue(formData, "applicationId", "Loan application");
    const note = optionalValue(formData, "note");

    if (action === "approve_loan_application") {
      const approvedPrincipal = requiredNumberValue(
        formData,
        "approvedPrincipal",
        "Approved principal",
      );
      const { error } = await supabase.rpc(action, {
        p_application_id: applicationId,
        p_actor_id: profile.id,
        p_approved_principal: approvedPrincipal,
        p_note: note,
      });

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.rpc(action, {
        p_application_id: applicationId,
        p_actor_id: profile.id,
        p_note: note,
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  } catch (error) {
    redirect(
      buildRedirect(
        "/loans",
        "error",
        error instanceof Error ? error.message : "Unable to update loan application.",
      ),
    );
  }

  revalidateLoanPaths();

  const detail =
    action === "start_loan_application_review"
      ? "Loan application marked under review."
      : action === "approve_loan_application"
        ? "Loan application approved."
        : "Loan application rejected.";

  redirect(buildRedirect("/loans", "success", detail));
}

export async function startLoanApplicationReviewAction(formData: FormData) {
  await mutateLoanApplicationAction("start_loan_application_review", formData);
}

export async function approveLoanApplicationAction(formData: FormData) {
  await mutateLoanApplicationAction("approve_loan_application", formData);
}

export async function rejectLoanApplicationAction(formData: FormData) {
  await mutateLoanApplicationAction("reject_loan_application", formData);
}

export async function disburseLoanAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect("/loans", "error", "Supabase credentials are missing."));
  }

  try {
    const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
    const loanId = requiredValue(formData, "loanId", "Loan");
    const cashAgentProfileId = requiredValue(formData, "cashAgentProfileId", "Cash drawer agent");
    const note = optionalValue(formData, "note");

    const { error } = await supabase.rpc("disburse_loan", {
      p_loan_id: loanId,
      p_actor_id: profile.id,
      p_cash_agent_profile_id: cashAgentProfileId,
      p_note: note,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirect(
      buildRedirect(
        "/loans",
        "error",
        error instanceof Error ? error.message : "Unable to disburse loan.",
      ),
    );
  }

  revalidateLoanPaths();
  redirect(buildRedirect("/loans", "success", "Loan disbursed."));
}

export async function recordLoanRepaymentAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect("/loans", "error", "Supabase credentials are missing."));
  }

  try {
    const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
    const loanId = requiredValue(formData, "loanId", "Loan");
    const cashAgentProfileId = requiredValue(formData, "cashAgentProfileId", "Cash drawer agent");
    const amount = requiredNumberValue(formData, "amount", "Repayment amount");
    const repaymentMode = requiredValue(
      formData,
      "repaymentMode",
      "Repayment mode",
    ) as RepaymentMode;
    const note = optionalValue(formData, "note");

    if (
      repaymentMode !== "interest_only" &&
      repaymentMode !== "interest_plus_principal"
    ) {
      throw new Error("Repayment mode is invalid.");
    }

    const { error } = await supabase.rpc("record_loan_repayment", {
      p_loan_id: loanId,
      p_actor_id: profile.id,
      p_cash_agent_profile_id: cashAgentProfileId,
      p_amount: amount,
      p_repayment_mode: repaymentMode,
      p_note: note,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirect(
      buildRedirect(
        "/loans",
        "error",
        error instanceof Error ? error.message : "Unable to record loan repayment.",
      ),
    );
  }

  revalidateLoanPaths();
  redirect(buildRedirect("/loans", "success", "Loan repayment recorded."));
}

export async function createBranchAction(formData: FormData) {
  assertServiceEnv("/branches/new");

  await requireRole(["admin"]);
  const service = createServiceClient();
  let successDetail = "";

  try {
    const name = requiredValue(formData, "name", "Branch name");
    const code = assertValidBranchCode(requiredValue(formData, "code", "Branch code"));
    const city = optionalValue(formData, "city");
    const region = optionalValue(formData, "region");
    const phone = optionalValue(formData, "phone");
    const managerProfileId = optionalValue(formData, "managerProfileId");

    const branchResponse = await service
      .from("branches")
      .insert({
        name,
        code,
        city,
        region,
        phone,
        status: "active",
        manager_profile_id: managerProfileId,
      })
      .select("id, name")
      .single();

    if (branchResponse.error || !branchResponse.data) {
      throw new Error(branchResponse.error?.message ?? "Unable to create branch.");
    }

    if (managerProfileId) {
      const { error: profileError } = await service
        .from("profiles")
        .update({ branch_id: branchResponse.data.id })
        .eq("id", managerProfileId);

      if (profileError) {
        throw new Error(profileError.message);
      }

      const { error: staffError } = await service
        .from("staff_users")
        .upsert(
          {
            profile_id: managerProfileId,
            branch_id: branchResponse.data.id,
            device_binding_required: true,
            status: "active",
          },
          { onConflict: "profile_id" },
        );

      if (staffError) {
        throw new Error(staffError.message);
      }
    }
    successDetail = `Created branch ${name}.`;
  } catch (error) {
    redirect(
      buildRedirect(
        "/branches/new",
        "error",
        error instanceof Error ? error.message : "Unable to create branch.",
      ),
    );
  }

  revalidatePath("/");
  revalidatePath("/branches");
  revalidatePath("/branches/new");
  revalidatePath("/managers");
  redirect(buildRedirect("/branches/new", "success", successDetail));
}

export async function createManagerAction(formData: FormData) {
  assertServiceEnv("/managers/new");

  await requireRole(["admin"]);
  const service = createServiceClient();
  let successDetail = "";
  let createdUserId: string | null = null;

  try {
    const fullName = requiredValue(formData, "fullName", "Full name");
    const email = requiredValue(formData, "email", "Email");
    const phone = requiredValue(formData, "phone", "Phone");
    const password = requiredValue(formData, "password", "Temporary password");
    const branchId = requiredValue(formData, "branchId", "Branch");

    if (password.length < 8) {
      throw new Error("Temporary password must be at least 8 characters.");
    }

    const user = await createAuthUser(email, password, fullName);
    createdUserId = user.id;
    const branch = await getBranchRecord(branchId);

    const profileResponse = await service
      .from("profiles")
      .insert({
        id: user.id,
        role: "branch_manager",
        full_name: fullName,
        phone,
        email,
        branch_id: branch.id,
        must_change_password: true,
        requires_pin_setup: true,
        is_active: true,
      })
      .select("id")
      .single();

    if (profileResponse.error || !profileResponse.data) {
      throw new Error(profileResponse.error?.message ?? "Unable to create manager profile.");
    }

    const { error: staffError } = await service.from("staff_users").upsert(
      {
        profile_id: user.id,
        branch_id: branch.id,
        device_binding_required: true,
        status: "active",
      },
      { onConflict: "profile_id" },
    );

    if (staffError) {
      throw new Error(staffError.message);
    }

    const { error: branchError } = await service
      .from("branches")
      .update({ manager_profile_id: user.id })
      .eq("id", branch.id);

    if (branchError) {
      throw new Error(branchError.message);
    }
    successDetail = `Created branch manager ${fullName}.`;
  } catch (error) {
    await deleteAuthUserIfPresent(createdUserId);
    redirect(
      buildRedirect(
        "/managers/new",
        "error",
        error instanceof Error ? error.message : "Unable to create branch manager.",
      ),
    );
  }

  revalidatePath("/");
  revalidatePath("/branches");
  revalidatePath("/managers");
  revalidatePath("/managers/new");
  redirect(buildRedirect("/managers/new", "success", successDetail));
}

export async function createAgentAction(formData: FormData) {
  assertServiceEnv("/agents/new");

  const { profile } = await requireRole(["admin", "branch_manager"]);
  const service = createServiceClient();
  let successDetail = "";
  let createdUserId: string | null = null;

  try {
    const fullName = requiredValue(formData, "fullName", "Full name");
    const email = requiredValue(formData, "email", "Email");
    const phone = requiredValue(formData, "phone", "Phone");
    const password = requiredValue(formData, "password", "Temporary password");
    const branchId = assertBranchForRole(
      profile.role === "admin" ? "admin" : "branch_manager",
      profile.branch_id,
      optionalValue(formData, "branchId"),
    );

    if (password.length < 8) {
      throw new Error("Temporary password must be at least 8 characters.");
    }

    const branch = await getBranchRecord(branchId);
    const user = await createAuthUser(email, password, fullName);
    createdUserId = user.id;

    const profileResponse = await service
      .from("profiles")
      .insert({
        id: user.id,
        role: "agent",
        full_name: fullName,
        phone,
        email,
        branch_id: branch.id,
        must_change_password: true,
        requires_pin_setup: true,
        is_active: true,
      })
      .select("id")
      .single();

    if (profileResponse.error || !profileResponse.data) {
      throw new Error(profileResponse.error?.message ?? "Unable to create agent profile.");
    }

    const { error: staffError } = await service.from("staff_users").upsert(
      {
        profile_id: user.id,
        branch_id: branch.id,
        device_binding_required: true,
        status: "active",
      },
      { onConflict: "profile_id" },
    );

    if (staffError) {
      throw new Error(staffError.message);
    }
    successDetail = `Created agent ${fullName}.`;
  } catch (error) {
    await deleteAuthUserIfPresent(createdUserId);
    redirect(
      buildRedirect(
        "/agents/new",
        "error",
        error instanceof Error ? error.message : "Unable to create agent.",
      ),
    );
  }

  revalidatePath("/agents");
  revalidatePath("/agents/new");
  revalidatePath("/branch");
  revalidatePath("/");
  redirect(buildRedirect("/agents/new", "success", successDetail));
}

export async function createMemberAction(formData: FormData) {
  assertServiceEnv("/members/new");

  const { profile } = await requireRole(["admin", "branch_manager"]);
  let successDetail = "";
  await clearMemberCreationFlash();

  try {
    const fullName = requiredValue(formData, "fullName", "Full name");
    const phone = requiredValue(formData, "phone", "Phone");
    const idNumber = requiredValue(formData, "idNumber", "ID card number");
    const branchId = assertBranchForRole(
      profile.role === "admin" ? "admin" : "branch_manager",
      profile.branch_id,
      optionalValue(formData, "branchId"),
    );
    const assignedAgentId = requiredValue(formData, "assignedAgentId", "Assigned agent");
    const { memberId, signInCode, temporaryPassword } =
      await provisionMemberRecord({
        actorId: profile.id,
        approvedById: profile.id,
        assignedAgentId,
        branchId,
        createdById: profile.id,
        fullName,
        idNumber,
        phone,
      });

    const service = createServiceClient();
    await writeAuditLogEntry(service, {
      actorId: profile.id,
      branchId,
      action: "create_member",
      entityType: "member_profile",
      entityId: memberId,
      metadata: {
        assignedAgentId,
        source: "admin_panel",
      },
    });

    await setMemberCreationFlash({
      fullName,
      signInCode,
      temporaryPassword,
    });
    successDetail = `Created member ${fullName}. Credentials are ready below for secure handoff.`;
  } catch (error) {
    await clearMemberCreationFlash();
    redirect(
      buildRedirect(
        "/members/new",
        "error",
        error instanceof Error ? error.message : "Unable to create member.",
      ),
    );
  }

  revalidateMemberPaths();
  redirect(buildRedirect("/members/new", "success", successDetail));
}

export async function resetStaffDeviceAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect("/staff-devices", "error", "Supabase credentials are missing."));
  }

  try {
    const { supabase } = await requireRole(["admin", "branch_manager"]);
    const profileId = requiredValue(formData, "profileId", "Staff account");
    const reason = optionalValue(formData, "reason");
    const { error } = await supabase.rpc("reset_staff_device", {
      p_profile_id: profileId,
      p_reason: reason,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirect(
      buildRedirect(
        "/staff-devices",
        "error",
        error instanceof Error ? error.message : "Unable to reset trusted device access.",
      ),
    );
  }

  revalidatePath("/staff-devices");
  revalidatePath("/settings");
  revalidatePath("/audit");
  redirect(buildRedirect("/staff-devices", "success", "Trusted device reset."));
}

export async function requestReportAction(formData: FormData) {
  assertServiceEnv("/reports");

  const { profile } = await requireRole(["admin", "branch_manager"]);
  const service = createServiceClient();
  const successDetail = "Queued report request.";

  try {
    const reportType = requiredValue(formData, "reportType", "Report type");
    const exportFormat = requiredValue(formData, "exportFormat", "Export format");
    const dateFrom = optionalValue(formData, "dateFrom");
    const dateTo = optionalValue(formData, "dateTo");
    const requestedBranchId = optionalValue(formData, "branchId");
    const branchId =
      profile.role === "branch_manager"
        ? assertBranchForRole("branch_manager", profile.branch_id, requestedBranchId)
        : requestedBranchId;

    if (branchId) {
      await getBranchRecord(branchId);
    }

    const { error } = await service.from("report_jobs").insert({
      branch_id: branchId,
      requested_by: profile.id,
      report_type: reportType,
      params: {
        exportFormat,
        dateFrom,
        dateTo,
      },
      status: "queued",
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirect(
      buildRedirect(
        "/reports",
        "error",
        error instanceof Error ? error.message : "Unable to queue report request.",
      ),
    );
  }

  revalidatePath("/reports");
  redirect(buildRedirect("/reports", "success", successDetail));
}
