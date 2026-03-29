import { createWithdrawalAction } from "../../actions";
import { AdminShell } from "../../../components/admin-shell";
import { AdminTransactionForm } from "../../../components/admin-transaction-form";
import { getAdminTransactionPageContext } from "../../../lib/onboarding-data";

export default async function CreateWithdrawalPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const context = await getAdminTransactionPageContext();
  const role = context.profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      currentBranchLabel={context.currentBranchLabel}
      currentUserName={context.profile.full_name}
      role={role}
      statusBadge={context.isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Create Withdrawal"
      subtitle="Record a branch-office withdrawal and auto-approve it into the ledger."
    >
      <AdminTransactionForm
        action={createWithdrawalAction}
        buttonLabel="Create Withdrawal"
        context={context}
        description="Select the member account and the agent drawer that should release the cash for the withdrawal."
        detail={params?.detail}
        result={params?.result}
        title="Withdrawal Form"
        transactionType="withdrawal"
      />
    </AdminShell>
  );
}
