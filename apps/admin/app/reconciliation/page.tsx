import { branchDashboard } from "@credit-union/shared";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { prettyCurrency } from "../../lib/format";

export default function ReconciliationPage() {
  return (
    <AdminShell
      role="branch_manager"
      title="Reconciliation"
      subtitle="Daily cash drawer review and variance tracking for the branch."
    >
      <SectionCard title="Branch Cash Summary">
        <table className="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Expected Cash Today</td>
              <td>{prettyCurrency(branchDashboard.expectedCashToday)}</td>
            </tr>
            <tr>
              <td>Cash Variance</td>
              <td>{prettyCurrency(branchDashboard.cashVariance)}</td>
            </tr>
            <tr>
              <td>Pending Approvals</td>
              <td>{branchDashboard.pendingApprovals}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
