type AuthAdminUser = {
  id: string;
};

type ServiceClientLike = {
  auth: {
    admin: {
      createUser: (input: {
        email: string;
        password: string;
        email_confirm: boolean;
        user_metadata: { full_name: string };
      }) => Promise<{
        data: { user: AuthAdminUser | null };
        error: { message?: string } | null;
      }>;
      deleteUser: (id: string) => Promise<unknown>;
    };
  };
  from: (table: string) => any;
};

export type BranchProvisioningRecord = {
  code: string;
  id: string;
};

export type MemberProvisioningInput = {
  actorId: string;
  approvedById?: string;
  assignedAgentId: string;
  branch: BranchProvisioningRecord;
  createdById?: string;
  dateOfBirth?: string | null;
  depositAccountNumber?: string;
  fallbackSeed?: string;
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

export type ProvisionedMember = {
  idNumber: string;
  loginEmail: string;
  memberId: string;
  signInCode: string;
  temporaryPassword: string;
};

const MEMBER_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const HEX_ALPHABET = "0123456789ABCDEF";
const RANDOM_ID_FALLBACK_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomString(length: number, alphabet: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export function accountNumber(branchCode: string, prefix: "SAV" | "DEP") {
  const entropy = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
  return `${normalizeBranchCode(branchCode)}-${prefix}-${entropy}`;
}

export function normalizeBranchCode(value: string) {
  return value.trim().toUpperCase();
}

export function assertValidBranchCode(value: string) {
  const normalized = normalizeBranchCode(value);

  if (!/^[A-Z0-9]{3}$/.test(normalized)) {
    throw new Error("Branch code must be exactly 3 uppercase letters or numbers.");
  }

  return normalized;
}

export function normalizeIdCardNumber(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function buildMemberLoginEmail(signInCode: string) {
  const normalized = signInCode.trim().replace(/[^A-Z0-9]+/gi, "").toLowerCase();

  if (!normalized) {
    throw new Error("Sign-in code is required.");
  }

  return `member-${normalized}@members.local`;
}

export function buildTemporaryPassword(length = 7) {
  return randomString(length, MEMBER_PASSWORD_ALPHABET);
}

function hexPair() {
  return randomString(2, HEX_ALPHABET);
}

function normalizeAlphanumeric(value: string) {
  return value.replace(/[^A-Z0-9]+/gi, "").toUpperCase();
}

function pickSourceCharacters(idNumber: string, fallbackSeed = "", count = 2) {
  const primary = normalizeAlphanumeric(idNumber);
  const fallback = normalizeAlphanumeric(fallbackSeed);
  let pool = primary;

  if (pool.length < count) {
    pool += fallback;
  }

  if (pool.length < count) {
    pool += randomString(count, RANDOM_ID_FALLBACK_ALPHABET);
  }

  if (!pool) {
    throw new Error("ID card number is required.");
  }

  const characters: string[] = [];
  const bytes = crypto.getRandomValues(new Uint8Array(count * 2));

  for (const value of bytes) {
    characters.push(pool[value % pool.length]);

    if (characters.length === count) {
      break;
    }
  }

  return characters.join("");
}

export function generateMemberSignInCode(input: {
  branchCode: string;
  fallbackSeed?: string;
  idNumber: string;
}) {
  const branchCode = assertValidBranchCode(input.branchCode);
  const idChars = pickSourceCharacters(input.idNumber, input.fallbackSeed);
  return `MM${branchCode}${idChars}${hexPair()}`;
}

async function isMemberSignInCodeTaken(service: ServiceClientLike, signInCode: string) {
  const response = await service
    .from("member_profiles")
    .select("profile_id")
    .eq("sign_in_code", signInCode)
    .limit(1)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message ?? "Unable to validate member sign-in code.");
  }

  return Boolean(response.data?.profile_id);
}

export async function generateUniqueMemberSignInCode(
  service: ServiceClientLike,
  input: {
    branchCode: string;
    fallbackSeed?: string;
    idNumber: string;
  },
) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const signInCode = generateMemberSignInCode(input);

    if (!(await isMemberSignInCodeTaken(service, signInCode))) {
      return signInCode;
    }
  }

  throw new Error("Unable to generate a unique member sign-in code.");
}

export async function provisionMember(
  service: ServiceClientLike,
  input: MemberProvisioningInput,
): Promise<ProvisionedMember> {
  const normalizedIdNumber = normalizeIdCardNumber(input.idNumber);

  if (!normalizedIdNumber) {
    throw new Error("ID card number is required.");
  }

  const existingMemberResponse = await service
    .from("member_profiles")
    .select("profile_id")
    .eq("id_number", normalizedIdNumber)
    .limit(1)
    .maybeSingle();

  if (existingMemberResponse.error) {
    throw new Error(existingMemberResponse.error.message ?? "Unable to check member ID card.");
  }

  if (existingMemberResponse.data?.profile_id) {
    throw new Error("A member with this ID card number already exists.");
  }

  const signInCode = await generateUniqueMemberSignInCode(service, {
    branchCode: input.branch.code,
    fallbackSeed: input.fallbackSeed,
    idNumber: normalizedIdNumber,
  });
  const loginEmail = buildMemberLoginEmail(signInCode);
  const temporaryPassword = input.password?.trim() || buildTemporaryPassword(7);

  let createdUserId: string | null = null;

  try {
    const createUserResponse = await service.auth.admin.createUser({
      email: loginEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
      },
    });

    if (createUserResponse.error || !createUserResponse.data.user) {
      throw new Error(createUserResponse.error?.message ?? "Unable to create auth user.");
    }

    createdUserId = createUserResponse.data.user.id;

    const profileResponse = await service
      .from("profiles")
      .insert({
        id: createdUserId,
        role: "member",
        full_name: input.fullName,
        phone: input.phone,
        email: loginEmail,
        branch_id: input.branch.id,
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
        profile_id: createdUserId,
        branch_id: input.branch.id,
        assigned_agent_id: input.assignedAgentId,
        date_of_birth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
        residential_address: input.residentialAddress ?? null,
        occupation: input.occupation ?? null,
        id_type: input.idType ?? "ID Card",
        id_number: normalizedIdNumber,
        sign_in_code: signInCode,
        next_of_kin_name: input.nextOfKinName ?? null,
        next_of_kin_phone: input.nextOfKinPhone ?? null,
        next_of_kin_address: input.nextOfKinAddress ?? null,
        status: "active",
        created_by: input.createdById ?? input.actorId,
        approved_by: input.approvedById ?? input.actorId,
      })
      .select("profile_id")
      .single();

    if (memberResponse.error || !memberResponse.data) {
      throw new Error(memberResponse.error?.message ?? "Unable to create member registry row.");
    }

    const accountsResponse = await service.from("member_accounts").insert([
      {
        member_profile_id: createdUserId,
        branch_id: input.branch.id,
        account_type: "savings",
        account_number: input.savingsAccountNumber ?? accountNumber(input.branch.code, "SAV"),
        status: "active",
      },
      {
        member_profile_id: createdUserId,
        branch_id: input.branch.id,
        account_type: "deposit",
        account_number: input.depositAccountNumber ?? accountNumber(input.branch.code, "DEP"),
        status: "active",
      },
    ]);

    if (accountsResponse.error) {
      throw new Error(accountsResponse.error.message ?? "Unable to create member accounts.");
    }

    const assignmentResponse = await service
      .from("agent_member_assignments")
      .insert({
        member_profile_id: createdUserId,
        agent_profile_id: input.assignedAgentId,
        branch_id: input.branch.id,
        is_active: true,
      })
      .select("id")
      .single();

    if (assignmentResponse.error || !assignmentResponse.data) {
      throw new Error(
        assignmentResponse.error?.message ?? "Unable to create agent assignment.",
      );
    }

    return {
      idNumber: normalizedIdNumber,
      loginEmail,
      memberId: createdUserId,
      signInCode,
      temporaryPassword,
    };
  } catch (error) {
    if (createdUserId) {
      await service.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }

    throw error;
  }
}
