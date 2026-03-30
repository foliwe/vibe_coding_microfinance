import { createDepositAction } from "../../actions";
import { AdminShell } from "../../../components/admin-shell";
import { AdminTransactionForm } from "../../../components/admin-transaction-form";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import { getAdminTransactionPageContext } from "../../../lib/onboarding-data";

export default async function CreateDepositPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const context = await getAdminTransactionPageContext();
  const role = context.profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [
        breadcrumb("Transactions", "/transactions"),
        breadcrumb("Create Deposit"),
      ])}
      currentBranchLabel={context.currentBranchLabel}
      currentUserName={context.profile.full_name}
      role={role}
      statusBadge={context.isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Create Deposit"
      subtitle="Record a branch-office deposit and auto-approve it into the ledger."
    >
      <AdminTransactionForm
        action={createDepositAction}
        buttonLabel="Create Deposit"
        context={context}
        description="Select the member account and the agent drawer that should hold the resulting cash."
        detail={params?.detail}
        result={params?.result}
        title="Deposit Form"
        transactionType="deposit"
      />
    </AdminShell>
  );
}
