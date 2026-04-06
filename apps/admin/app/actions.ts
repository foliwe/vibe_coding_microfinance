"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { RepaymentMode, TransactionType } from "@credit-union/shared";
import {
  PASSWORD_POLICY,
  assertValidBranchCode,
  provisionMember,
} from "@credit-union/shared";

import { requireRole } from "../lib/auth";
import {
  registerCurrentWorkstation,
  syncWorkstationIdentityFromFormData,
} from "../lib/staff-device";
import { getSupabaseEnv, hasSupabaseEnv, hasSupabaseServiceEnv } from "../lib/supabase/env";
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

type SafeUserErrorInput = {
  action: string;
  error: unknown;
  userMessage: string;
  errorCode: string;
};

type ErrorDiagnostics = {
  rawCode?: string;
  rawDetails?: string;
  rawHint?: string;
  rawMessage: string;
  stack?: string;
};

type ErrorLikeObject = {
  code?: unknown;
  details?: unknown;
  error_description?: unknown;
  hint?: unknown;
  message?: unknown;
  stack?: unknown;
};

class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

function buildRedirect(path: string, result: RedirectResult, detail?: string): Route {
  const params = new URLSearchParams();
  params.set("result", result);

  if (detail) {
    params.set("detail", detail);
  }

  return `${path}?${params.toString()}` as Route;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toUserFacingError(message: string) {
  return new UserFacingError(message);
}

function getErrorDiagnostics(error: unknown): ErrorDiagnostics {
  if (typeof error === "string") {
    return {
      rawMessage: normalizeText(error) ?? "Unknown error",
    };
  }

  if (error instanceof Error) {
    const errorWithFields = error as ErrorLikeObject;
    return {
      rawCode: normalizeText(errorWithFields.code),
      rawDetails: normalizeText(errorWithFields.details),
      rawHint: normalizeText(errorWithFields.hint),
      rawMessage:
        normalizeText(error.message) ??
        normalizeText(errorWithFields.error_description) ??
        normalizeText(errorWithFields.details) ??
        normalizeText(errorWithFields.hint) ??
        "Unknown error",
      stack: normalizeText(error.stack) ?? normalizeText(errorWithFields.stack) ?? undefined,
    };
  }

  if (error && typeof error === "object") {
    const errorLike = error as ErrorLikeObject;
    return {
      rawCode: normalizeText(errorLike.code),
      rawDetails: normalizeText(errorLike.details),
      rawHint: normalizeText(errorLike.hint),
      rawMessage:
        normalizeText(errorLike.message) ??
        normalizeText(errorLike.error_description) ??
        normalizeText(errorLike.details) ??
        normalizeText(errorLike.hint) ??
        "Unknown error",
      stack: normalizeText(errorLike.stack) ?? undefined,
    };
  }

  return {
    rawMessage: "Unknown error",
  };
}

function toSafeUserError(input: SafeUserErrorInput) {
  const correlationId = crypto.randomUUID();
  const diagnostics = getErrorDiagnostics(input.error);

  console.error(
    JSON.stringify({
      level: "error",
      event: "admin_action_failed",
      action: input.action,
      errorCode: input.errorCode,
      correlationId,
      rawCode: diagnostics.rawCode,
      rawDetails: diagnostics.rawDetails,
      rawHint: diagnostics.rawHint,
      rawMessage: diagnostics.rawMessage,
      stack: diagnostics.stack,
    }),
  );

  return `${input.userMessage} (Code: ${input.errorCode}; Ref: ${correlationId})`;
}

function toRedirectErrorMessage(input: SafeUserErrorInput) {
  if (isRedirectError(input.error)) {
    throw input.error;
  }

  if (input.error instanceof UserFacingError) {
    return input.error.message;
  }

  return toSafeUserError(input);
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
    throw toUserFacingError(`${label} is required.`);
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
    throw toUserFacingError(`${label} must be a valid number.`);
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
    throw response.error ?? new Error(`Unable to create auth user for ${email}.`);
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
    throw response.error ?? new Error("Selected branch was not found.");
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
    throw response.error ?? new Error("Assigned agent was not found.");
  }

  if (response.data.role !== "agent" || response.data.branch_id !== branchId) {
    throw toUserFacingError("Assigned agent must belong to the selected branch.");
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
    throw response.error;
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
      throw toUserFacingError("This branch manager is not assigned to a branch.");
    }

    return profileBranchId;
  }

  if (!requestedBranchId) {
    throw toUserFacingError("Branch is required.");
  }

  return requestedBranchId;
}

async function verifyCurrentPassword(email: string, password: string) {
  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createSupabaseClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw toUserFacingError("Current temporary password is incorrect.");
  }
}

async function mutateTransactionRequest(
  action: "approve_transaction_request" | "reject_transaction_request",
  formData: FormData,
) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect("/transactions", "error", "Supabase credentials are missing."));
  }

  try {
    const requestId = requiredValue(formData, "requestId", "Transaction request");
    const note = optionalValue(formData, "note");
    const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
    const { error } = await supabase.rpc(action, {
      p_request_id: requestId,
      p_actor_id: profile.id,
      p_note: note,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    redirect(
      buildRedirect(
        "/transactions",
        "error",
        toRedirectErrorMessage({
          action,
          error,
          userMessage: "Unable to update this transaction request.",
          errorCode: "TXN_REQUEST_FAILED",
        }),
      ),
    );
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
        throw toUserFacingError("Current temporary password is required.");
      }

      if (!profile.email) {
        throw toUserFacingError("This branch-manager account is missing an email address.");
      }

      await verifyCurrentPassword(profile.email, currentPassword);


      if (newPassword.length < 8) {
        throw toUserFacingError("New password must be at least 8 characters.");

      if (newPassword.length < PASSWORD_POLICY.minimumLength) {
        throw new Error(
          `New password must be at least ${PASSWORD_POLICY.minimumLength} characters.`,
        );

      }

      if (newPassword !== confirmNewPassword) {
        throw toUserFacingError("Your new password and confirmation must match.");
      }
    }

    if (profile.requires_pin_setup) {
      if (!/^\d{4}$/.test(transactionPin)) {
        throw toUserFacingError("Transaction PIN must be exactly 4 digits.");
      }

      if (transactionPin !== confirmTransactionPin) {
        throw toUserFacingError("Your transaction PIN and confirmation must match.");
      }
    }

    await syncWorkstationIdentityFromFormData(formData);

    if (profile.must_change_password) {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      const { error: completeError } = await supabase.rpc("complete_password_change");

      if (completeError) {
        throw completeError;
      }
    }

    if (profile.requires_pin_setup) {
      const { error: pinError } = await supabase.rpc("set_my_transaction_pin", {
        p_pin: transactionPin,
      });

      if (pinError) {
        throw pinError;
      }
    }

    await registerCurrentWorkstation(supabase);
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action: "completeBranchManagerSetupAction",
      error,
      userMessage: "Unable to complete setup.",
      errorCode: "SETUP_FAILED",
    });
    redirect(
      buildRedirect(
        "/setup",
        "error",
        safeMessage,
      ),
    );
  }

  revalidatePath("/branch");
  revalidatePath("/settings");
  redirect(buildRedirect("/branch", "success", "Security setup complete."));
}

export async function rebindCurrentWorkstationAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect(buildRedirect("/workstation-blocked", "error", "Supabase credentials are missing."));
  }

  try {
    const { supabase } = await requireRole(["branch_manager"], {
      allowUntrustedDevice: true,
    });

    await syncWorkstationIdentityFromFormData(formData);
    await registerCurrentWorkstation(supabase);
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action: "rebindCurrentWorkstationAction",
      error,
      userMessage: "Unable to trust this workstation.",
      errorCode: "WORKSTATION_REBIND_FAILED",
    });
    redirect(
      buildRedirect(
        "/workstation-blocked",
        "error",
        safeMessage,
      ),
    );
  }

  revalidatePath("/branch");
  revalidatePath("/staff-devices");
  redirect(buildRedirect("/branch", "success", "This workstation is trusted again."));
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
      throw toUserFacingError("Review action must be approve or reject.");
    }

    const { supabase } = await requireRole(["admin", "branch_manager"]);
    const { error } = await supabase.rpc("review_cash_reconciliation", {
      p_action: reviewAction,
      p_reconciliation_id: reconciliationId,
      p_review_note: reviewNote,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action: "reviewCashReconciliationAction",
      error,
      userMessage: "Unable to review the cash reconciliation.",
      errorCode: "RECON_REVIEW_FAILED",
    });
    redirect(
      buildRedirect(
        "/reconciliation",
        "error",
        safeMessage,
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
      throw toUserFacingError("Amount must be greater than zero.");
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
      throw error;
    }
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action: `createAdminTransactionAction:${transactionType}`,
      error,
      userMessage: "Unable to create transaction.",
      errorCode: "TXN_CREATE_FAILED",
    });
    redirect(
      buildRedirect(
        path,
        "error",
        safeMessage,
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
      throw error;
    }
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action: "createLoanApplicationAction",
      error,
      userMessage: "Unable to create loan application.",
      errorCode: "LOAN_CREATE_FAILED",
    });
    redirect(
      buildRedirect(
        "/loans",
        "error",
        safeMessage,
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
        throw error;
      }
    } else {
      const { error } = await supabase.rpc(action, {
        p_application_id: applicationId,
        p_actor_id: profile.id,
        p_note: note,
      });

      if (error) {
        throw error;
      }
    }
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action,
      error,
      userMessage: "Unable to update loan application.",
      errorCode: "LOAN_UPDATE_FAILED",
    });
    redirect(
      buildRedirect(
        "/loans",
        "error",
        safeMessage,
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
      throw error;
    }
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action: "disburseLoanAction",
      error,
      userMessage: "Unable to disburse loan.",
      errorCode: "LOAN_DISBURSE_FAILED",
    });
    redirect(
      buildRedirect(
        "/loans",
        "error",
        safeMessage,
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
      throw toUserFacingError("Repayment mode is invalid.");
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
      throw error;
    }
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action: "recordLoanRepaymentAction",
      error,
      userMessage: "Unable to record loan repayment.",
      errorCode: "LOAN_REPAYMENT_FAILED",
    });
    redirect(
      buildRedirect(
        "/loans",
        "error",
        safeMessage,
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
      throw branchResponse.error ?? new Error("Unable to create branch.");
    }

    if (managerProfileId) {
      const { error: profileError } = await service
        .from("profiles")
        .update({ branch_id: branchResponse.data.id })
        .eq("id", managerProfileId);

      if (profileError) {
        throw profileError;
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
        throw staffError;
      }
    }
    successDetail = `Created branch ${name}.`;
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action: "createBranchAction",
      error,
      userMessage: "Unable to create branch.",
      errorCode: "BRANCH_CREATE_FAILED",
    });
    redirect(
      buildRedirect(
        "/branches/new",
        "error",
        safeMessage,
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
      throw toUserFacingError("Temporary password must be at least 8 characters.");

    if (password.length < PASSWORD_POLICY.minimumLength) {
      throw new Error(
        `Temporary password must be at least ${PASSWORD_POLICY.minimumLength} characters.`,
      );

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
      throw profileResponse.error ?? new Error("Unable to create manager profile.");
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
      throw staffError;
    }

    const { error: branchError } = await service
      .from("branches")
      .update({ manager_profile_id: user.id })
      .eq("id", branch.id);

    if (branchError) {
      throw branchError;
    }
    successDetail = `Created branch manager ${fullName}.`;
  } catch (error) {
    await deleteAuthUserIfPresent(createdUserId);
    const safeMessage = toRedirectErrorMessage({
      action: "createManagerAction",
      error,
      userMessage: "Unable to create branch manager.",
      errorCode: "MANAGER_CREATE_FAILED",
    });
    redirect(
      buildRedirect(
        "/managers/new",
        "error",
        safeMessage,
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
      throw toUserFacingError("Temporary password must be at least 8 characters.");

    if (password.length < PASSWORD_POLICY.minimumLength) {
      throw new Error(
        `Temporary password must be at least ${PASSWORD_POLICY.minimumLength} characters.`,
      );

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
      throw profileResponse.error ?? new Error("Unable to create agent profile.");
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
      throw staffError;
    }
    successDetail = `Created agent ${fullName}.`;
  } catch (error) {
    await deleteAuthUserIfPresent(createdUserId);
    const safeMessage = toRedirectErrorMessage({
      action: "createAgentAction",
      error,
      userMessage: "Unable to create agent.",
      errorCode: "AGENT_CREATE_FAILED",
    });
    redirect(
      buildRedirect(
        "/agents/new",
        "error",
        safeMessage,
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
    const safeMessage = toRedirectErrorMessage({
      action: "createMemberAction",
      error,
      userMessage: "Unable to create member.",
      errorCode: "MEMBER_CREATE_FAILED",
    });
    redirect(
      buildRedirect(
        "/members/new",
        "error",
        safeMessage,
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
      throw error;
    }
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action: "resetStaffDeviceAction",
      error,
      userMessage: "Unable to reset trusted device access.",
      errorCode: "STAFF_DEVICE_RESET_FAILED",
    });
    redirect(
      buildRedirect(
        "/staff-devices",
        "error",
        safeMessage,
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
      throw error;
    }
  } catch (error) {
    const safeMessage = toRedirectErrorMessage({
      action: "requestReportAction",
      error,
      userMessage: "Unable to queue report request.",
      errorCode: "REPORT_QUEUE_FAILED",
    });
    redirect(
      buildRedirect(
        "/reports",
        "error",
        safeMessage,
      ),
    );
  }

  revalidatePath("/reports");
  redirect(buildRedirect("/reports", "success", successDetail));
}
