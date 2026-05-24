import Link from "next/link";

import { AdminDetailItem, AdminDetailList } from "../components/admin-detail-list";
import { AdminShell } from "../components/admin-shell";
import { AdminTableEmptyRow, AdminTableFrame } from "../components/admin-table";
import {
  BranchPerformanceChart,
  PortfolioTrendChart,
} from "../components/charts/admin-dashboard-charts";
import { ActionBar } from "../components/action-bar";
import { SectionCard } from "../components/section-card";
import { StatCard } from "../components/stat-card";
import { StatusBadge } from "../components/status-badge";
import { withDashboardBreadcrumbs } from "../lib/breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { getAdminDashboardPageData } from "../lib/dashboard-data";
import { compactCurrency, prettyCurrency } from "../lib/format";

export default async function AdminDashboardPage() {
  const {
    dashboard: { alerts, charts, isLive, profile, summary },
    fraud,
  } = await getAdminDashboardPageData();

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs("admin")}
      currentBranchLabel="All branches"
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Admin Dashboard"
      subtitle="Institution-wide performance, branch totals, approval pressure, and risk signals."
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          description="Registered operational branches in the institution."
          label="Total Branches"
          value={String(summary.branchCount)}
        />
        <StatCard
          description="Member count across the full institution scope."
          label="Total Members"
          value={compactCurrency(summary.totalMembers)}
        />
        <StatCard
          description="Combined savings balances across every branch."
          label="Total Savings"
          tone="success"
          value={prettyCurrency(summary.totalSavings)}
        />
        <StatCard
          description="Transactions still waiting for review."
          label="Pending Approvals"
          tone="warning"
          value={String(summary.pendingApprovals)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          description="Deposit balances currently on the books."
          label="Total Deposits"
          value={prettyCurrency(summary.totalDeposits)}
        />
        <StatCard
          description="Principal approved across active loan products."
          label="Total Loans"
          value={prettyCurrency(summary.totalLoans)}
        />
        <StatCard
          description="Remaining principal still to be collected."
          label="Outstanding Principal"
          value={prettyCurrency(summary.outstandingPrincipal)}
        />
        <StatCard
          description="Interest collected across the reporting window."
          label="Interest Collected"
          value={prettyCurrency(summary.interestCollected)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Branch Performance Mix</CardTitle>
              <CardDescription>
                Grouped balances compare branch savings and deposits side-by-side.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BranchPerformanceChart data={charts.branchPerformance} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Portfolio Trend</CardTitle>
              <CardDescription>
                Deposit and loan movement for the most recent six reporting periods.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <PortfolioTrendChart data={charts.portfolioTrend} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          description="Create the operational entities that the live dashboards depend on."
          title="Admin Actions"
        >
          <ActionBar>
            <Button asChild>
              <Link href="/branches/new">Create Branch</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/managers/new">Create Manager</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/agents/new">Create Agent</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/members/new">Create Member</Link>
            </Button>
          </ActionBar>
        </SectionCard>
        <SectionCard
          description="Pending cash activity and open exceptions that need central attention."
          title="Approvals And Alerts"
        >
          <AdminDetailList>
            {alerts.map((transaction) => (
              <AdminDetailItem
                key={transaction.id}
                label={transaction.id.toUpperCase()}
                value={
                  <div className="space-y-1 text-left sm:text-right">
                    <p className="text-sm text-foreground">
                      {transaction.memberName} · {transaction.type} ·{" "}
                      {prettyCurrency(transaction.amount)}
                    </p>
                    <StatusBadge>{transaction.status}</StatusBadge>
                  </div>
                }
              />
            ))}
            {alerts.length === 0 ? (
              <AdminDetailItem
                label="No live alerts"
                value={
                  <div className="space-y-1 text-left sm:text-right">
                    <p className="text-sm text-muted-foreground">
                      Pending transactions and exception items will appear here.
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
        description="A direct view of suspicious activity, device trust drift, and approval-speed anomalies."
        title="Fraud Snapshot"
      >
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            description="Open and investigating fraud alerts."
            label="Alert Load"
            tone={fraud.summary.openAlerts > 0 ? "warning" : "default"}
            value={String(fraud.summary.openAlerts)}
          />
          <StatCard
            description="High-score transaction-linked cases."
            label="High Risk"
            tone={fraud.summary.highRiskTransactions > 0 ? "danger" : "default"}
            value={String(fraud.summary.highRiskTransactions)}
          />
          <StatCard
            description="Active offline burst clusters."
            label="Offline Bursts"
            tone={fraud.summary.offlineBurstCases > 0 ? "warning" : "default"}
            value={String(fraud.summary.offlineBurstCases)}
          />
          <StatCard
            description="Average approval time across the recent visible scope."
            label="Avg Approval"
            tone="success"
            value={`${fraud.summary.averageApprovalSeconds}s`}
          />
        </div>
        <ActionBar>
          <Button asChild>
            <Link href="/fraud">Open Fraud Center</Link>
          </Button>
        </ActionBar>
      </SectionCard>

      <SectionCard
        description="Each branch row carries consolidated savings, deposits, loans, and outstanding principal."
        title="Branch Performance Table"
      >
        <AdminTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Savings</TableHead>
                <TableHead>Deposits</TableHead>
                <TableHead>Loans</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {summary.branchPerformance.map((branch) => (
              <TableRow key={branch.id}>
                <TableCell>
                  <Link className="font-semibold underline-offset-4 hover:underline" href={`/branches/${branch.id}`}>
                    {branch.name}
                  </Link>
                </TableCell>
                <TableCell>{branch.managerName}</TableCell>
                <TableCell>{branch.memberCount}</TableCell>
                <TableCell>{prettyCurrency(branch.totalSavings)}</TableCell>
                <TableCell>{prettyCurrency(branch.totalDeposits)}</TableCell>
                <TableCell>{prettyCurrency(branch.totalLoans)}</TableCell>
                <TableCell>{prettyCurrency(branch.outstandingPrincipal)}</TableCell>
                <TableCell>{branch.pendingApprovals}</TableCell>
              </TableRow>
            ))}
            {summary.branchPerformance.length === 0 ? (
              <AdminTableEmptyRow
                colSpan={8}
                description="Branch performance rows will appear here once branches and balances are available."
              />
            ) : null}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </SectionCard>
    </AdminShell>
  );
}
