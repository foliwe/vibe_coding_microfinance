import { adminDashboard } from "@credit-union/shared";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { prettyCurrency } from "../../lib/format";

export default function BranchesPage() {
  return (
    <AdminShell
      role="admin"
      title="Branches"
      subtitle="Institution branches with consolidated branch totals and manager ownership."
    >
      <SectionCard title="Branch Directory" description="Each row includes savings, deposits, loans, and pending approvals for that branch.">
        <table className="table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Manager</th>
              <th>Members</th>
              <th>Agents</th>
              <th>Savings</th>
              <th>Deposits</th>
              <th>Loans</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            {adminDashboard.branchPerformance.map((branch) => (
              <tr key={branch.id}>
                <td>{branch.name}</td>
                <td>{branch.managerName}</td>
                <td>{branch.memberCount}</td>
                <td>{branch.agentCount}</td>
                <td>{prettyCurrency(branch.totalSavings)}</td>
                <td>{prettyCurrency(branch.totalDeposits)}</td>
                <td>{prettyCurrency(branch.totalLoans)}</td>
                <td>{branch.pendingApprovals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
