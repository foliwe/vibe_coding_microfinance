"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { TransactionType } from "@credit-union/shared";

import { requireRole } from "../lib/auth";
import { hasSupabaseEnv, hasSupabaseServiceEnv } from "../lib/supabase/env";
import { createServiceClient } from "../lib/supabase/service";
import { createClient } from "../lib/supabase/server";

type RedirectResult = "success" | "error";

function buildRedirect(path: string, result: RedirectResult, detail?: string): Route {
  const params = new URLSearchParams();
  params.set("result", result);

  if (detail) {
    params.set("detail", detail);
  }

  return `${path}?${params.toString()}` as Route;
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

function accountNumber(branchCode: string, prefix: "SAV" | "DEP") {
  const entropy = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
  return `${branchCode.toUpperCase()}-${prefix}-${entropy}`;
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

export async function approveTransactionRequestAction(formData: FormData) {
  await mutateTransactionRequest("approve_transaction_request", formData);
}

export async function rejectTransactionRequestAction(formData: FormData) {
  await mutateTransactionRequest("reject_transaction_request", formData);
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

export async function createBranchAction(formData: FormData) {
  assertServiceEnv("/branches/new");

  await requireRole(["admin"]);
  const service = createServiceClient();
  let successDetail = "";

  try {
    const name = requiredValue(formData, "name", "Branch name");
    const code = requiredValue(formData, "code", "Branch code").toUpperCase();
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
  const service = createServiceClient();
  let successDetail = "";

  try {
    const fullName = requiredValue(formData, "fullName", "Full name");
    const email = requiredValue(formData, "email", "Login email");
    const phone = requiredValue(formData, "phone", "Phone");
    const password = requiredValue(formData, "password", "Temporary password");
    const branchId = assertBranchForRole(
      profile.role === "admin" ? "admin" : "branch_manager",
      profile.branch_id,
      optionalValue(formData, "branchId"),
    );
    const assignedAgentId = requiredValue(formData, "assignedAgentId", "Assigned agent");
    const dateOfBirth = optionalValue(formData, "dateOfBirth");
    const gender = optionalValue(formData, "gender");
    const occupation = optionalValue(formData, "occupation");
    const idType = optionalValue(formData, "idType");
    const idNumber = optionalValue(formData, "idNumber");
    const nextOfKinName = optionalValue(formData, "nextOfKinName");
    const nextOfKinPhone = optionalValue(formData, "nextOfKinPhone");
    const nextOfKinAddress = optionalValue(formData, "nextOfKinAddress");
    const residentialAddress = optionalValue(formData, "residentialAddress");
    const savingsAccountNumber =
      optionalValue(formData, "savingsAccountNumber") ?? undefined;
    const depositAccountNumber =
      optionalValue(formData, "depositAccountNumber") ?? undefined;

    if (password.length < 8) {
      throw new Error("Temporary password must be at least 8 characters.");
    }

    const branch = await getBranchRecord(branchId);
    const agentResponse = await service
      .from("profiles")
      .select("id, branch_id, role")
      .eq("id", assignedAgentId)
      .single();

    if (agentResponse.error || !agentResponse.data) {
      throw new Error(agentResponse.error?.message ?? "Assigned agent was not found.");
    }

    if (agentResponse.data.role !== "agent" || agentResponse.data.branch_id !== branch.id) {
      throw new Error("Assigned agent must belong to the selected branch.");
    }

    const user = await createAuthUser(email, password, fullName);

    const profileResponse = await service
      .from("profiles")
      .insert({
        id: user.id,
        role: "member",
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
      throw new Error(profileResponse.error?.message ?? "Unable to create member profile.");
    }

    const memberResponse = await service
      .from("member_profiles")
      .insert({
        profile_id: user.id,
        branch_id: branch.id,
        assigned_agent_id: assignedAgentId,
        date_of_birth: dateOfBirth,
        gender,
        residential_address: residentialAddress,
        occupation,
        id_type: idType,
        id_number: idNumber,
        next_of_kin_name: nextOfKinName,
        next_of_kin_phone: nextOfKinPhone,
        next_of_kin_address: nextOfKinAddress,
        status: "active",
        created_by: profile.id,
        approved_by: profile.id,
      })
      .select("profile_id")
      .single();

    if (memberResponse.error || !memberResponse.data) {
      throw new Error(memberResponse.error?.message ?? "Unable to create member registry row.");
    }

    const accounts = [
      {
        member_profile_id: user.id,
        branch_id: branch.id,
        account_type: "savings",
        account_number:
          savingsAccountNumber ?? accountNumber(branch.code, "SAV"),
        status: "active",
      },
      {
        member_profile_id: user.id,
        branch_id: branch.id,
        account_type: "deposit",
        account_number:
          depositAccountNumber ?? accountNumber(branch.code, "DEP"),
        status: "active",
      },
    ];

    const accountsResponse = await service
      .from("member_accounts")
      .insert(accounts)
      .select("id");

    if (accountsResponse.error) {
      throw new Error(accountsResponse.error.message);
    }

    const assignmentResponse = await service
      .from("agent_member_assignments")
      .insert({
        member_profile_id: user.id,
        agent_profile_id: assignedAgentId,
        branch_id: branch.id,
        is_active: true,
      })
      .select("id")
      .single();

    if (assignmentResponse.error || !assignmentResponse.data) {
      throw new Error(
        assignmentResponse.error?.message ?? "Unable to create agent assignment.",
      );
    }
    successDetail = `Created member ${fullName}.`;
  } catch (error) {
    redirect(
      buildRedirect(
        "/members/new",
        "error",
        error instanceof Error ? error.message : "Unable to create member.",
      ),
    );
  }

  revalidatePath("/members");
  revalidatePath("/members/new");
  revalidatePath("/agents");
  revalidatePath("/branch");
  revalidatePath("/");
  redirect(buildRedirect("/members/new", "success", successDetail));
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
