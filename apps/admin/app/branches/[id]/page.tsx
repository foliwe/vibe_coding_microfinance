import Link from "next/link";

import { ActionBar } from "../../../components/action-bar";
import { AdminDetailItem, AdminDetailList } from "../../../components/admin-detail-list";
import { AdminShell } from "../../../components/admin-shell";
import { ChartBars } from "../../../components/chart-bars";
import { SectionCard } from "../../../components/section-card";
import { StatCard } from "../../../components/stat-card";
import { StatusBadge } from "../../../components/status-badge";
import { Button } from "../../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
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
      breadcrumbs={withDashboardBreadcrumbs("admin", [
        breadcrumb("Branches", "/branches"),
        breadcrumb(branch.name),
      ])}
      currentBranchLabel={branch.name}
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title={branch.name}
      subtitle="Branch profile with ownership, live balances, approvals, and agent activity."
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          description="Members assigned to this branch."
          label="Total Members"
          value={String(summary.totalMembers)}
        />
        <StatCard
          description="Agents currently active in the branch."
          label="Active Agents"
          value={String(summary.activeAgents)}
        />
        <StatCard
          description="Combined savings balance at branch scope."
          label="Branch Savings"
          tone="success"
          value={prettyCurrency(summary.totalSavings)}
        />
        <StatCard
          description="Transactions still awaiting branch review."
          label="Pending Approvals"
          tone="warning"
          value={String(summary.pendingApprovals)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          description="Deposit balances in the branch."
          label="Branch Deposits"
          value={prettyCurrency(summary.totalDeposits)}
        />
        <StatCard
          description="Approved loan principal tied to this branch."
          label="Branch Loans"
          value={prettyCurrency(summary.totalLoans)}
        />
        <StatCard
          description="Principal that remains outstanding."
          label="Outstanding Principal"
          value={prettyCurrency(summary.outstandingPrincipal)}
        />
        <StatCard
          description="Current branch cash variance."
          label="Cash Variance"
          value={prettyCurrency(summary.cashVariance)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Branch Profile"
          description="Identity and ownership details for this branch."
        >
          <AdminDetailList>
            <AdminDetailItem label="Branch Name" value={branch.name} />
            <AdminDetailItem label="Manager" value={branch.managerName} />
            <AdminDetailItem label="Branch ID" value={branch.id} />
            <AdminDetailItem
              label="Status"
              value={
                <StatusBadge>
                  {isLive ? "Live Supabase data" : "Setup required"}
                </StatusBadge>
              }
            />
          </AdminDetailList>
        </SectionCard>

        <SectionCard
          title="Branch Actions"
          description="Admin shortcuts for branch-level follow-up."
        >
          <ActionBar>
            <Button asChild>
              <Link href="/branches">Back to Branches</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/managers/new">Create Manager</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/reports">View Reports</Link>
            </Button>
          </ActionBar>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Risk And Cash"
          description="Operational indicators for this branch."
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
              label="Expected Cash Today"
              value={prettyCurrency(summary.expectedCashToday)}
            />
          </AdminDetailList>
        </SectionCard>

        <SectionCard
          title="Pending Alerts"
          description="Latest branch transactions still awaiting approval."
        >
          <AdminDetailList>
            {alerts.map((transaction) => (
              <AdminDetailItem
                key={transaction.id}
                label={transaction.memberName}
                value={
                  <div className="space-y-1 text-left sm:text-right">
                    <p className="text-sm text-foreground">
                      {transaction.type} · {prettyCurrency(transaction.amount)}
                    </p>
                    <StatusBadge>{transaction.status}</StatusBadge>
                  </div>
                }
              />
            ))}
            {alerts.length === 0 ? (
              <AdminDetailItem
                label="No open alerts"
                value={
                  <div className="space-y-1 text-left sm:text-right">
                    <p className="text-sm text-muted-foreground">
                      Pending branch approvals will appear here.
                    </p>
                    <StatusBadge>clear</StatusBadge>
                  </div>
                }
              />
            ) : null}
          </AdminDetailList>
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
          <p className="text-sm text-muted-foreground">
            No active agents are assigned to this branch yet.
          </p>
        )}
      </SectionCard>
    </AdminShell>
  );
}
