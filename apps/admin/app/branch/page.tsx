import Link from "next/link";

import { AdminShell } from "../../components/admin-shell";
import { ChartBars } from "../../components/chart-bars";
import { SectionCard } from "../../components/section-card";
import { StatCard } from "../../components/stat-card";
import { getBranchDashboardData } from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";

export default async function BranchDashboardPage() {
  const { profile, summary, isLive } = await getBranchDashboardData();

  return (
    <AdminShell
      currentBranchLabel={summary.branchName}
      currentUserName={profile.full_name}
      role="branch_manager"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Branch Dashboard"
      subtitle="Branch-only totals, agent performance, approvals, and reconciliation indicators."
    >
      <div className="grid grid-4">
        <StatCard label="Total Members" value={String(summary.totalMembers)} />
        <StatCard label="Active Agents" value={String(summary.activeAgents)} />
        <StatCard label="Branch Savings" value={prettyCurrency(summary.totalSavings)} tone="success" />
        <StatCard label="Pending Approvals" value={String(summary.pendingApprovals)} tone="warning" />
      </div>

      <div className="grid grid-4">
        <StatCard label="Branch Deposits" value={prettyCurrency(summary.totalDeposits)} />
        <StatCard label="Branch Loans" value={prettyCurrency(summary.totalLoans)} />
        <StatCard
          label="Outstanding Principal"
          value={prettyCurrency(summary.outstandingPrincipal)}
        />
        <StatCard label="Expected Cash Today" value={prettyCurrency(summary.expectedCashToday)} />
      </div>

      <div className="grid grid-2">
        <SectionCard
          title="Branch Actions"
          description="Branch managers can onboard members, create agents, and review pending transactions from one place."
        >
          <div className="actions">
            <Link className="button" href="/members/new">
              Create Member
            </Link>
            <Link className="button-secondary" href="/agents/new">
              Create Agent
            </Link>
            <Link className="button-secondary" href="/transactions">
              Review Transactions
            </Link>
          </div>
        </SectionCard>
        <SectionCard
          title="Agent Performance"
          description="Daily collections, pending approvals, and cash variance by agent."
        >
          <ChartBars
            data={summary.agentPerformance.map((agent) => ({
              label: agent.name,
              value: Math.round(agent.collectionsToday / 1000),
              suffix: "k",
            }))}
          />
        </SectionCard>

        <SectionCard
          title="Branch Risk Summary"
          description="Branch managers should see only their branch indicators."
        >
          <div className="list">
            <div className="list-item">
              <strong>New Members This Month</strong>
              <span>{summary.newMembersThisMonth}</span>
            </div>
            <div className="list-item">
              <strong>Interest Collected</strong>
              <span>{prettyCurrency(summary.interestCollected)}</span>
            </div>
            <div className="list-item">
              <strong>Overdue Loans</strong>
              <span>{summary.overdueLoans}</span>
            </div>
            <div className="list-item">
              <strong>Cash Variance</strong>
              <span>{prettyCurrency(summary.cashVariance)}</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </AdminShell>
  );
}
