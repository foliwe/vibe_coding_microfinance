import Link from "next/link";

import { AdminShell } from "../../../components/admin-shell";
import { ChartBars } from "../../../components/chart-bars";
import { SectionCard } from "../../../components/section-card";
import { StatCard } from "../../../components/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { getBranchDetailPageData } from "../../../lib/dashboard-data";
import { prettyCurrency } from "../../../lib/format";

export default async function BranchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { alerts, branch, isLive, profile, summary } = await getBranchDetailPageData(id);

  return (
    <AdminShell
      currentBranchLabel={branch.name}
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title={branch.name}
      subtitle="Branch profile with ownership, live balances, approvals, and agent activity."
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
        <StatCard label="Cash Variance" value={prettyCurrency(summary.cashVariance)} />
      </div>

      <div className="grid grid-2">
        <SectionCard
          title="Branch Profile"
          description="Identity and ownership details for this branch."
        >
          <div className="list">
            <div className="list-item">
              <strong>Branch Name</strong>
              <span>{branch.name}</span>
            </div>
            <div className="list-item">
              <strong>Manager</strong>
              <span>{branch.managerName}</span>
            </div>
            <div className="list-item">
              <strong>Branch ID</strong>
              <span>{branch.id}</span>
            </div>
            <div className="list-item">
              <strong>Status</strong>
              <span>{isLive ? "Live Supabase data" : "Setup required"}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Branch Actions"
          description="Admin shortcuts for branch-level follow-up."
        >
          <div className="actions">
            <Link className="button" href="/branches">
              Back to Branches
            </Link>
            <Link className="button-secondary" href="/managers/new">
              Create Manager
            </Link>
            <Link className="button-secondary" href="/reports">
              View Reports
            </Link>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-2">
        <SectionCard
          title="Risk And Cash"
          description="Operational indicators for this branch."
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
              <strong>Expected Cash Today</strong>
              <span>{prettyCurrency(summary.expectedCashToday)}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Pending Alerts"
          description="Latest branch transactions still awaiting approval."
        >
          <div className="list">
            {alerts.map((transaction) => (
              <div className="list-item" key={transaction.id}>
                <div>
                  <strong>{transaction.memberName}</strong>
                  <p className="muted">
                    {transaction.type} · {prettyCurrency(transaction.amount)}
                  </p>
                </div>
                <span className="chip">{transaction.status}</span>
              </div>
            ))}
            {alerts.length === 0 ? (
              <div className="list-item">
                <div>
                  <strong>No open alerts</strong>
                  <p className="muted">Pending branch approvals will appear here.</p>
                </div>
                <span className="chip">clear</span>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Agent Performance"
        description="Collections, approval load, and cash variance by agent."
      >
        {summary.agentPerformance.length ? (
          <div className="grid gap-6">
            <ChartBars
              data={summary.agentPerformance.map((agent) => ({
                label: agent.name,
                value: Math.round(agent.collectionsToday / 1000),
                suffix: "k",
              }))}
            />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Collections Today</TableHead>
                  <TableHead>Pending Approvals</TableHead>
                  <TableHead>Cash Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.agentPerformance.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{prettyCurrency(agent.collectionsToday)}</TableCell>
                    <TableCell>{agent.pendingApprovals}</TableCell>
                    <TableCell>{prettyCurrency(agent.cashVariance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="muted">No active agents are assigned to this branch yet.</p>
        )}
      </SectionCard>
    </AdminShell>
  );
}
