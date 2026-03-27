import { activeLoan } from "@credit-union/shared";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { prettyCurrency } from "../../lib/format";

export default function LoansPage() {
  return (
    <AdminShell
      role="branch_manager"
      title="Loans"
      subtitle="Loan review, disbursement preparation, and principal/interest monitoring."
    >
      <SectionCard title="Active Loan Snapshot" description="Interest is calculated monthly on remaining principal.">
        <table className="table">
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Member</th>
              <th>Approved Principal</th>
              <th>Remaining Principal</th>
              <th>Monthly Rate</th>
              <th>Next Interest Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{activeLoan.id.toUpperCase()}</td>
              <td>{activeLoan.memberName}</td>
              <td>{prettyCurrency(activeLoan.approvedPrincipal)}</td>
              <td>{prettyCurrency(activeLoan.remainingPrincipal)}</td>
              <td>{activeLoan.monthlyInterestRate * 100}%</td>
              <td>{prettyCurrency(activeLoan.nextInterestDue)}</td>
              <td>
                <span className="chip">{activeLoan.status}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
