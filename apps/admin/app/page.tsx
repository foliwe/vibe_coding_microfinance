import Link from "next/link";

import { AdminShell } from "../components/admin-shell";
import {
  BranchPerformanceChart,
  PortfolioTrendChart,
} from "../components/chart-bars";
import { SectionCard } from "../components/section-card";
import { StatCard } from "../components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { getAdminDashboardData } from "../lib/dashboard-data";
import { compactCurrency, prettyCurrency } from "../lib/format";

export default async function AdminDashboardPage() {
  const { alerts, charts, isLive, profile, summary } = await getAdminDashboardData();

  return (
    <AdminShell
      currentBranchLabel="All branches"
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Admin Dashboard"
      subtitle="Institution-wide performance, branch totals, approval pressure, and risk signals."
    >
      <div className="grid grid-4">
        <StatCard label="Total Branches" value={String(summary.branchCount)} />
        <StatCard label="Total Members" value={compactCurrency(summary.totalMembers)} />
        <StatCard label="Total Savings" value={prettyCurrency(summary.totalSavings)} tone="success" />
        <StatCard label="Pending Approvals" value={String(summary.pendingApprovals)} tone="warning" />
      </div>

      <div className="grid grid-4">
        <StatCard label="Total Deposits" value={prettyCurrency(summary.totalDeposits)} />
        <StatCard label="Total Loans" value={prettyCurrency(summary.totalLoans)} />
        <StatCard
          label="Outstanding Principal"
          value={prettyCurrency(summary.outstandingPrincipal)}
        />
        <StatCard label="Interest Collected" value={prettyCurrency(summary.interestCollected)} />
      </div>

      <div className="grid grid-2">
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

      <div className="grid grid-2">
        <SectionCard
          title="Admin Actions"
          description="Create the operational entities that the live dashboards depend on."
        >
          <div className="actions">
            <Link className="button" href="/branches/new">
              Create Branch
            </Link>
            <Link className="button-secondary" href="/managers/new">
              Create Manager
            </Link>
            <Link className="button-secondary" href="/agents/new">
              Create Agent
            </Link>
            <Link className="button-secondary" href="/members/new">
              Create Member
            </Link>
          </div>
        </SectionCard>
        <SectionCard
          title="Approvals And Alerts"
          description="Pending cash activity and open exceptions that need central attention."
        >
          <div className="list">
            {alerts.map((transaction) => (
              <div className="list-item" key={transaction.id}>
                <div>
                  <strong>{transaction.id.toUpperCase()}</strong>
                  <p className="muted">
                    {transaction.memberName} · {transaction.type} · {prettyCurrency(transaction.amount)}
                  </p>
                </div>
                <span className="chip">{transaction.status}</span>
              </div>
            ))}
            {alerts.length === 0 ? (
              <div className="list-item">
                <div>
                  <strong>No live alerts</strong>
                  <p className="muted">Pending transactions and exception items will appear here.</p>
                </div>
                <span className="chip">clear</span>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Branch Performance Table"
        description="Each branch row carries consolidated savings, deposits, loans, and outstanding principal."
      >
        <table className="table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Manager</th>
              <th>Members</th>
              <th>Savings</th>
              <th>Deposits</th>
              <th>Loans</th>
              <th>Outstanding</th>
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
                <td>{prettyCurrency(branch.totalSavings)}</td>
                <td>{prettyCurrency(branch.totalDeposits)}</td>
                <td>{prettyCurrency(branch.totalLoans)}</td>
                <td>{prettyCurrency(branch.outstandingPrincipal)}</td>
                <td>{branch.pendingApprovals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
