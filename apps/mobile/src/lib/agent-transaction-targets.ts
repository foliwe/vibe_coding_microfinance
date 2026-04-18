import type { TransactionType } from "@credit-union/shared";

type AgentTargetMemberRow = {
  profile_id: string;
  sign_in_code: string | null;
};

type AgentTargetAccountRow = {
  account_number: string;
  account_type: "savings" | "deposit";
  id: string;
  member_profile_id: string;
};

type AgentTargetBalanceRow = {
  depositBalance: number;
  savingsBalance: number;
};

type AgentTargetProfileRow = {
  full_name: string;
};

export interface AgentTransactionTarget {
  accountId: string;
  accountNumber: string;
  accountType: "savings" | "deposit";
  availableBalance: number;
  depositBalance: number;
  memberCode: string;
  memberId: string;
  memberName: string;
  savingsBalance: number;
}

export function formatMobileProfileCode(prefix: "AG" | "MB", id: string) {
  return `${prefix}-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

export function getAgentTargetMemberCode(row: AgentTargetMemberRow) {
  return row.sign_in_code ?? formatMobileProfileCode("MB", row.profile_id);
}

export function resolveAgentTransactionTarget(input: {
  accountRows: AgentTargetAccountRow[];
  balances: AgentTargetBalanceRow;
  memberName: string;
  memberRow: AgentTargetMemberRow;
  preferredAccountType: "deposit" | "savings";
  strictAccountTypeMatch?: boolean;
}): AgentTransactionTarget | null {
  const selectedAccount = input.accountRows.find(
    (row) => row.account_type === input.preferredAccountType,
  );

  if (selectedAccount) {
    return {
      accountId: selectedAccount.id,
      accountNumber: selectedAccount.account_number,
      accountType: selectedAccount.account_type,
      availableBalance:
        selectedAccount.account_type === "deposit"
          ? input.balances.depositBalance
          : input.balances.savingsBalance,
      depositBalance: input.balances.depositBalance,
      memberCode: getAgentTargetMemberCode(input.memberRow),
      memberId: input.memberRow.profile_id,
      memberName: input.memberName,
      savingsBalance: input.balances.savingsBalance,
    };
  }

  if (input.strictAccountTypeMatch) {
    return null;
  }

  const fallbackAccount = input.accountRows[0];

  if (!fallbackAccount) {
    return null;
  }

  return {
    accountId: fallbackAccount.id,
    accountNumber: fallbackAccount.account_number,
    accountType: fallbackAccount.account_type,
    availableBalance:
      fallbackAccount.account_type === "deposit"
        ? input.balances.depositBalance
        : input.balances.savingsBalance,
    depositBalance: input.balances.depositBalance,
    memberCode: getAgentTargetMemberCode(input.memberRow),
    memberId: input.memberRow.profile_id,
    memberName: input.memberName,
    savingsBalance: input.balances.savingsBalance,
  };
}

export function listAgentTransactionTargets(input: {
  accountRows: AgentTargetAccountRow[];
  balancesByMemberId: Map<string, AgentTargetBalanceRow>;
  memberRows: AgentTargetMemberRow[];
  preferredAccountType?: "deposit" | "savings";
  profileMap: Map<string, AgentTargetProfileRow>;
  strictAccountTypeMatch?: boolean;
  transactionType: Extract<TransactionType, "deposit" | "withdrawal">;
}) {
  const preferredAccountType =
    input.preferredAccountType ??
    (input.transactionType === "withdrawal" ? "deposit" : "savings");

  return input.memberRows.flatMap((memberRow) => {
    const target = resolveAgentTransactionTarget({
      accountRows: input.accountRows.filter(
        (row) => row.member_profile_id === memberRow.profile_id,
      ),
      balances: input.balancesByMemberId.get(memberRow.profile_id) ?? {
        depositBalance: 0,
        savingsBalance: 0,
      },
      memberName:
        input.profileMap.get(memberRow.profile_id)?.full_name ?? "Assigned member",
      memberRow,
      preferredAccountType,
      strictAccountTypeMatch: input.strictAccountTypeMatch,
    });

    return target ? [target] : [];
  });
}
