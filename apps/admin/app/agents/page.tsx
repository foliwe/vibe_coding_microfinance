import { branchDashboard } from "@credit-union/shared";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { prettyCurrency } from "../../lib/format";

export default function AgentsPage() {
  return (
    <AdminShell
      role="branch_manager"
      title="Agents"
      subtitle="Branch-scoped field staff performance and cash handling summary."
    >
      <SectionCard title="Agent Performance Table">
        <table className="table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Collections Today</th>
              <th>Pending Approvals</th>
              <th>Cash Variance</th>
            </tr>
          </thead>
          <tbody>
            {branchDashboard.agentPerformance.map((agent) => (
              <tr key={agent.id}>
                <td>{agent.name}</td>
                <td>{prettyCurrency(agent.collectionsToday)}</td>
                <td>{agent.pendingApprovals}</td>
                <td>{prettyCurrency(agent.cashVariance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
