export type MemberDetailBalanceAccount = {
  accountType: "savings" | "deposit";
  balance: number;
};

export type MemberDetailLoan = {
  remainingPrincipal: number;
};

export function summarizeMemberDetailCards(
  accounts: MemberDetailBalanceAccount[],
  loans: MemberDetailLoan[],
) {
  let savingsBalance = 0;
  let depositBalance = 0;

  for (const account of accounts) {
    if (account.accountType === "savings") {
      savingsBalance += account.balance;
    } else if (account.accountType === "deposit") {
      depositBalance += account.balance;
    }
  }

  const outstandingLoanBalance = loans.reduce(
    (sum, loan) => sum + loan.remainingPrincipal,
    0,
  );
  const activeLoanCount = loans.filter((loan) => loan.remainingPrincipal > 0).length;

  return {
    activeLoanCount,
    depositBalance,
    outstandingLoanBalance,
    savingsBalance,
  };
}
