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
import { getMembersPageData } from "../../lib/dashboard-data";

export default async function MembersPage() {
  const { currentBranchLabel, isLive, members, profile } = await getMembersPageData();
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [
        breadcrumb("People"),
        breadcrumb("Members"),
      ])}
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Members"
      subtitle="Branch-scoped member list with assignment, branch, and status visibility."
    >
      <SectionCard title="Member Actions" description="Onboard new members into the currently visible branch scope.">
        <ActionBar>
          <Button asChild>
            <Link href="/members/new">Create Member</Link>
          </Button>
        </ActionBar>
      </SectionCard>

      <SectionCard title="Member Registry" description="Members are always tied to one branch and one active agent in v1.">
        <AdminTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.id.toUpperCase()}</TableCell>
                <TableCell>
                  <Link className="font-semibold underline-offset-4 hover:underline" href={`/members/${member.id}`}>
                    {member.fullName}
                  </Link>
                </TableCell>
                <TableCell>{member.agentName}</TableCell>
                <TableCell>{member.branchName}</TableCell>
                <TableCell>{member.phone}</TableCell>
                <TableCell>
                  <StatusBadge>{member.status}</StatusBadge>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 ? (
              <AdminTableEmptyRow colSpan={6} description="No live members were found yet." />
            ) : null}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </SectionCard>
    </AdminShell>
  );
}
