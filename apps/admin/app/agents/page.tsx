import Link from "next/link";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { getAgentsPageData } from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";

export default async function AgentsPage() {
  const { agents, currentBranchLabel, isLive, profile } = await getAgentsPageData();
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [
        breadcrumb("People"),
        breadcrumb("Agents"),
      ])}
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Agents"
      subtitle="Field staff directory with branch scope, member coverage, and cash-performance indicators."
    >
      <SectionCard title="Agent Actions" description="Create new field agents for the visible branch scope.">
        <div className="actions">
          <Link className="button" href="/agents/new">
            Create Agent
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Agent Registry" description="Each row links to the full agent profile with member relationships and analytics.">
        <table className="table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Branch</th>
              <th>Members</th>
              <th>Collections Today</th>
              <th>Pending Approvals</th>
              <th>Cash Variance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td>
                  <Link className="font-semibold underline-offset-4 hover:underline" href={`/agents/${agent.id}`}>
                    {agent.fullName}
                  </Link>
                </td>
                <td>{agent.branchName}</td>
                <td>{agent.assignedMemberCount}</td>
                <td>{prettyCurrency(agent.collectionsToday)}</td>
                <td>{agent.pendingApprovals}</td>
                <td>{prettyCurrency(agent.cashVariance)}</td>
                <td>
                  <span className="chip">{agent.status}</span>
                </td>
              </tr>
            ))}
            {agents.length === 0 ? (
              <tr>
                <td className="muted" colSpan={7}>
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
