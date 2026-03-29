import Link from "next/link";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { getBranchDashboardData } from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";

export default async function AgentsPage() {
  const { isLive, profile, summary } = await getBranchDashboardData();

  return (
    <AdminShell
      currentBranchLabel={summary.branchName}
      currentUserName={profile.full_name}
      role={profile.role === "admin" ? "admin" : "branch_manager"}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Agents"
      subtitle="Branch-scoped field staff performance and cash handling summary."
    >
      <SectionCard title="Agent Actions" description="Create new field agents for the visible branch scope.">
        <div className="actions">
          <Link className="button" href="/agents/new">
            Create Agent
          </Link>
        </div>
      </SectionCard>

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
            {summary.agentPerformance.map((agent) => (
              <tr key={agent.id}>
                <td>{agent.name}</td>
                <td>{prettyCurrency(agent.collectionsToday)}</td>
                <td>{agent.pendingApprovals}</td>
                <td>{prettyCurrency(agent.cashVariance)}</td>
              </tr>
            ))}
            {summary.agentPerformance.length === 0 ? (
              <tr>
                <td className="muted" colSpan={4}>
                  No live agents were found for this branch yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
