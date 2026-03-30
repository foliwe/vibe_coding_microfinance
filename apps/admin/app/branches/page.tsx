import Link from "next/link";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { getAdminDashboardData } from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";

export default async function BranchesPage() {
  const { isLive, profile, summary } = await getAdminDashboardData();

  return (
    <AdminShell
      currentBranchLabel="All branches"
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Branches"
      subtitle="Institution branches with consolidated branch totals and manager ownership."
    >
      <SectionCard title="Branch Actions" description="Create new branches or review existing branch coverage.">
        <div className="actions">
          <Link className="button" href="/branches/new">
            Create Branch
          </Link>
          <Link className="button-secondary" href="/managers/new">
            Create Manager
          </Link>
        </div>
      </SectionCard>

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
            {summary.branchPerformance.map((branch) => (
              <tr key={branch.id}>
                <td>
                  <Link className="font-semibold underline-offset-4 hover:underline" href={`/branches/${branch.id}`}>
                    {branch.name}
                  </Link>
                </td>
                <td>{branch.managerName}</td>
                <td>{branch.memberCount}</td>
                <td>{branch.agentCount}</td>
                <td>{prettyCurrency(branch.totalSavings)}</td>
                <td>{prettyCurrency(branch.totalDeposits)}</td>
                <td>{prettyCurrency(branch.totalLoans)}</td>
                <td>{branch.pendingApprovals}</td>
              </tr>
            ))}
            {summary.branchPerformance.length === 0 ? (
              <tr>
                <td className="muted" colSpan={8}>
                  No live branches were found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
