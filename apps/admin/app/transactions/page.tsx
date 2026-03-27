import { transactions } from "@credit-union/shared";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { prettyCurrency } from "../../lib/format";

export default function TransactionsPage() {
  return (
    <AdminShell
      role="branch_manager"
      title="Transactions"
      subtitle="Pending agent-originated cash transactions waiting for branch or admin review."
    >
      <SectionCard title="Approval Queue" description="Every agent financial transaction remains pending until reviewed by a branch manager or admin.">
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Member</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Agent</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.id.toUpperCase()}</td>
                <td>{transaction.memberName}</td>
                <td>{transaction.type}</td>
                <td>{prettyCurrency(transaction.amount)}</td>
                <td>{transaction.agentName}</td>
                <td>
                  <span className="chip">{transaction.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
