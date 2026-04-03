import type { TransactionType } from "@credit-union/shared";

export function shouldQueueOfflineTransaction(
  transactionType: Extract<TransactionType, "deposit" | "withdrawal">,
  isOfflineError: boolean,
) {
  return transactionType === "deposit" && isOfflineError;
}

export function getWithdrawalConnectivityMessage() {
  return "Withdrawals require connectivity so your transaction PIN can be verified.";
}
