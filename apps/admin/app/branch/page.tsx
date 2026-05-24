import Link from "next/link";

import { AdminDetailItem, AdminDetailList } from "../../components/admin-detail-list";
import { AdminShell } from "../../components/admin-shell";
import { ActionBar } from "../../components/action-bar";
import { ChartBars } from "../../components/charts/collection-bars";
import { SectionCard } from "../../components/section-card";
import { StatCard } from "../../components/stat-card";
import { Button } from "../../components/ui/button";
import { withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { getBranchDashboardPageData } from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";

export default async function BranchDashboardPage() {
  const {
    dashboard: { profile, summary, isLive },
    fraud,
  } = await getBranchDashboardPageData();

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs("branch_manager")}
      currentBranchLabel={summary.branchName}
      currentUserName={profile.full_name}
      role="branch_manager"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Branch Dashboard"
      subtitle="Branch-only totals, agent performance, approvals, and reconciliation indicators."
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          description="Members currently assigned to this branch."
          label="Total Members"
          value={String(summary.totalMembers)}
        />
        <StatCard
          description="Agents active in this branch office."
          label="Active Agents"
          value={String(summary.activeAgents)}
        />
        <StatCard
          description="Combined savings balances held by this branch."
          label="Branch Savings"
          tone="success"
          value={prettyCurrency(summary.totalSavings)}
        />
        <StatCard
          description="Transactions needing review in this branch."
          label="Pending Approvals"
          tone="warning"
          value={String(summary.pendingApprovals)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          description="Deposit balances on branch books."
          label="Branch Deposits"
          value={prettyCurrency(summary.totalDeposits)}
        />
        <StatCard
          description="Principal approved to this branch scope."
          label="Branch Loans"
          value={prettyCurrency(summary.totalLoans)}
        />
        <StatCard
          description="Principal still outstanding in branch loans."
          label="Outstanding Principal"
          value={prettyCurrency(summary.outstandingPrincipal)}
        />
        <StatCard
          description="Expected counted cash for today."
          label="Expected Cash Today"
          value={prettyCurrency(summary.expectedCashToday)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          description="Branch managers can onboard members, create agents, and review pending transactions from one place."
          title="Branch Actions"
        >
          <ActionBar>
            <Button asChild>
              <Link href="/members/new">Create Member</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/agents/new">Create Agent</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/transactions">Review Transactions</Link>
            </Button>
          </ActionBar>
        </SectionCard>
        <SectionCard
          description="Daily collections, pending approvals, and cash variance by agent."
          title="Agent Performance"
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
          description="Branch managers should see only their branch indicators."
          title="Branch Risk Summary"
        >
          <AdminDetailList>
            <AdminDetailItem
              label="New Members This Month"
              value={summary.newMembersThisMonth}
            />
            <AdminDetailItem
              label="Interest Collected"
              value={prettyCurrency(summary.interestCollected)}
            />
            <AdminDetailItem label="Overdue Loans" value={summary.overdueLoans} />
            <AdminDetailItem
              label="Cash Variance"
              value={prettyCurrency(summary.cashVariance)}
            />
          </AdminDetailList>
        </SectionCard>

        <SectionCard
          description="Your branch fraud queue, device trust flags, and approval-speed anomalies."
          title="Fraud Snapshot"
        >
          <AdminDetailList>
            <AdminDetailItem label="Open Alerts" value={fraud.summary.openAlerts} />
            <AdminDetailItem label="High Risk Transactions" value={fraud.summary.highRiskTransactions} />
            <AdminDetailItem label="Offline Bursts" value={fraud.summary.offlineBurstCases} />
            <AdminDetailItem label="Avg Approval Time" value={`${fraud.summary.averageApprovalSeconds}s`} />
          </AdminDetailList>
          <ActionBar>
            <Button asChild>
              <Link href="/fraud">Open Fraud Center</Link>
            </Button>
          </ActionBar>
        </SectionCard>
      </div>
    </AdminShell>
  );
}
