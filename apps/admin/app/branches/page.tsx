import Link from "next/link";

import { AdminShell } from "../../components/admin-shell";
import { ActionBar } from "../../components/action-bar";
import { AdminTableEmptyRow, AdminTableFrame } from "../../components/admin-table";
import { SectionCard } from "../../components/section-card";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { getAdminDashboardData } from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";

export default async function BranchesPage() {
  const { isLive, profile, summary } = await getAdminDashboardData();

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs("admin", [breadcrumb("Branches")])}
      currentBranchLabel="All branches"
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Branches"
      subtitle="Institution branches with consolidated branch totals and manager ownership."
    >
      <SectionCard title="Branch Actions" description="Create new branches or review existing branch coverage.">
        <ActionBar>
          <Button asChild>
            <Link href="/branches/new">Create Branch</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/managers/new">Create Manager</Link>
          </Button>
        </ActionBar>
      </SectionCard>

      <SectionCard title="Branch Directory" description="Each row includes savings, deposits, loans, and pending approvals for that branch.">
        <AdminTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Savings</TableHead>
                <TableHead>Deposits</TableHead>
                <TableHead>Loans</TableHead>
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
                <TableCell>{branch.agentCount}</TableCell>
                <TableCell>{prettyCurrency(branch.totalSavings)}</TableCell>
                <TableCell>{prettyCurrency(branch.totalDeposits)}</TableCell>
                <TableCell>{prettyCurrency(branch.totalLoans)}</TableCell>
                <TableCell>{branch.pendingApprovals}</TableCell>
              </TableRow>
            ))}
            {summary.branchPerformance.length === 0 ? (
              <AdminTableEmptyRow colSpan={8} description="No live branches were found yet." />
            ) : null}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </SectionCard>
    </AdminShell>
  );
}
