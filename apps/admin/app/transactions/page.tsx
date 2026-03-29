import {
  approveTransactionRequestAction,
  rejectTransactionRequestAction,
} from "../actions";
import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { getTransactionQueuePageData } from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";

function TransactionResultNotice({
  detail,
  result,
}: {
  detail?: string;
  result?: string;
}) {
  if (!result) {
    return null;
  }

  const isError = result === "error";
  const message =
    isError
      ? detail ?? "The transaction action failed."
      : result === "approved"
        ? "Transaction approved and posted to the ledger."
        : "Transaction rejected and preserved in history.";

  return <p className={isError ? "notice notice-error" : "notice notice-success"}>{message}</p>;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const { branchLabel, isLive, profile, transactions } = await getTransactionQueuePageData();

  return (
    <AdminShell
      currentBranchLabel={branchLabel}
      currentUserName={profile.full_name}
      role={profile.role === "admin" ? "admin" : "branch_manager"}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Transactions"
      subtitle="Pending agent-originated cash transactions waiting for branch or admin review."
    >
      <TransactionResultNotice detail={params?.detail} result={params?.result} />
      <SectionCard
        title="Approval Queue"
        description="Every agent financial transaction remains pending until reviewed by a branch manager or admin."
      >
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Branch</th>
              <th>Member</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length ? transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.id.toUpperCase()}</td>
                <td>{transaction.branchName}</td>
                <td>{transaction.memberName}</td>
                <td>{transaction.type}</td>
                <td>{prettyCurrency(transaction.amount)}</td>
                <td>{transaction.agentName}</td>
                <td>
                  <span className="chip">{transaction.status}</span>
                </td>
                <td>
                  <div className="table-actions">
                    <form action={approveTransactionRequestAction}>
                      <input name="requestId" type="hidden" value={transaction.id} />
                      <button className="button table-button" type="submit">
                        Approve
                      </button>
                    </form>
                    <form action={rejectTransactionRequestAction}>
                      <input name="requestId" type="hidden" value={transaction.id} />
                      <button className="button-secondary table-button" type="submit">
                        Reject
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="muted" colSpan={8}>
                  No pending transactions are waiting for review.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
