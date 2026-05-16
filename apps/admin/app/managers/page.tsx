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
import { getManagersPageData } from "../../lib/dashboard-data";

export default async function ManagersPage() {
  const { isLive, managers, profile } = await getManagersPageData();

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs("admin", [
        breadcrumb("People"),
        breadcrumb("Managers"),
      ])}
      currentBranchLabel="All branches"
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Managers"
      subtitle="Branch manager directory with branch ownership, phone, and account status."
    >
      <SectionCard title="Manager Actions" description="Create branch managers from here, then assign them to branches.">
        <ActionBar>
          <Button asChild>
            <Link href="/managers/new">Create Manager</Link>
          </Button>
        </ActionBar>
      </SectionCard>

      <SectionCard title="Manager Registry">
        <AdminTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {managers.map((manager) => (
              <TableRow key={manager.id}>
                <TableCell>
                  <Link className="font-semibold underline-offset-4 hover:underline" href={`/managers/${manager.id}`}>
                    {manager.fullName}
                  </Link>
                </TableCell>
                <TableCell>{manager.branchName}</TableCell>
                <TableCell>{manager.phone}</TableCell>
                <TableCell>
                  <StatusBadge>{manager.status}</StatusBadge>
                </TableCell>
              </TableRow>
            ))}
            {managers.length === 0 ? (
              <AdminTableEmptyRow colSpan={4} description="No live branch managers were found yet." />
            ) : null}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </SectionCard>
    </AdminShell>
  );
}
