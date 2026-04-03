import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeIdCardNumber, provisionMember } from "../../../packages/shared/src/member-provisioning.ts";

type CreateMemberPayload = {
  email?: string;
  firstName?: string;
  fullName?: string;
  idCardNumber?: string;
  lastName?: string;
  memberType?: string;
  nationalId?: string;
  password?: string;
  phone?: string;
};

type ProfileRow = {
  branch_id: string | null;
  full_name: string;
  id: string;
  role: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !anonKey || !serviceRoleKey) {
    return errorResponse("Supabase environment is not configured.", 500);
  }

  const authedClient = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
  const serviceClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const body = (await request.json().catch(() => null)) as CreateMemberPayload | null;
  const suppliedFullName = body?.fullName?.trim() ?? "";
  const firstName = body?.firstName?.trim() ?? "";
  const lastName = body?.lastName?.trim() ?? "";
  const fullName = suppliedFullName || `${firstName} ${lastName}`.trim();
  const phone = body?.phone?.trim() ?? "";
  const normalizedIdCardNumber = normalizeIdCardNumber(
    body?.idCardNumber?.trim() || body?.nationalId?.trim() || "",
  );
  const memberType = body?.memberType?.trim().toLowerCase() || null;

  if (!fullName) {
    return errorResponse("Enter the member's full name.");
  }

  if (!phone) {
    return errorResponse("Phone number is required.");
  }

  if (!normalizedIdCardNumber) {
    return errorResponse("ID card number is required.");
  }

  const { data: userData, error: userError } = await authedClient.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return errorResponse("Unauthorized", 401);
  }

  const { data: actorRows, error: actorError } = await authedClient.rpc("get_my_profile");

  if (actorError) {
    return errorResponse(actorError.message, 400);
  }

  const actor = Array.isArray(actorRows) ? (actorRows[0] as ProfileRow | undefined) : undefined;

  if (!actor) {
    return errorResponse("No signed-in profile was found.", 401);
  }

  if (actor.role !== "agent") {
    return errorResponse("Only agents can create members from mobile.", 403);
  }

  if (!actor.branch_id) {
    return errorResponse("The signed-in agent is not assigned to a branch.", 400);
  }

  const { data: branch, error: branchError } = await serviceClient
    .from("branches")
    .select("id, code")
    .eq("id", actor.branch_id)
    .single();

  if (branchError || !branch) {
    return errorResponse(branchError?.message ?? "Assigned branch was not found.", 400);
  }

  try {
    const provisionedMember = await provisionMember(serviceClient, {
      actorId: actor.id,
      approvedById: actor.id,
      assignedAgentId: actor.id,
      branch,
      createdById: actor.id,
      fallbackSeed: actor.id,
      fullName,
      idNumber: normalizedIdCardNumber,
      occupation: memberType,
      password: body?.password?.trim() || null,
      phone,
    });

    const auditResponse = await serviceClient.from("audit_logs").insert({
      actor_id: actor.id,
      branch_id: actor.branch_id,
      action: "create_member",
      entity_type: "member_profile",
      entity_id: provisionedMember.memberId,
      metadata: {
        source: "mobile_agent",
      },
    });

    if (auditResponse.error) {
      throw new Error(auditResponse.error.message);
    }

    return jsonResponse({
      memberId: provisionedMember.memberId,
      signInIdentifier: provisionedMember.signInCode,
      temporaryPassword: provisionedMember.temporaryPassword,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unable to create member.",
      400,
    );
  }
});
