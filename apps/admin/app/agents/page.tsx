import Link from "next/link";

import { AdminShell } from "../../components/admin-shell";
import { ActionBar } from "../../components/action-bar";
import { AdminTableEmptyRow, AdminTableFrame } from "../../components/admin-table";
import { SectionCard } from "../../components/section-card";
import { StatusBadge } from "../../components/status-badge";
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
        <ActionBar>
          <Button asChild>
            <Link href="/agents/new">Create Agent</Link>
          </Button>
        </ActionBar>
      </SectionCard>

      <SectionCard title="Agent Registry" description="Each row links to the full agent profile with member relationships and analytics.">
        <AdminTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Collections Today</TableHead>
                <TableHead>Pending Approvals</TableHead>
                <TableHead>Cash Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <Link className="font-semibold underline-offset-4 hover:underline" href={`/agents/${agent.id}`}>
                    {agent.fullName}
                  </Link>
                </TableCell>
                <TableCell>{agent.branchName}</TableCell>
                <TableCell>{agent.assignedMemberCount}</TableCell>
                <TableCell>{prettyCurrency(agent.collectionsToday)}</TableCell>
                <TableCell>{agent.pendingApprovals}</TableCell>
                <TableCell>{prettyCurrency(agent.cashVariance)}</TableCell>
                <TableCell>
                  <StatusBadge>{agent.status}</StatusBadge>
                </TableCell>
              </TableRow>
            ))}
            {agents.length === 0 ? (
              <AdminTableEmptyRow colSpan={7} description="No live agents were found for this branch yet." />
            ) : null}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </SectionCard>
    </AdminShell>
  );
}
