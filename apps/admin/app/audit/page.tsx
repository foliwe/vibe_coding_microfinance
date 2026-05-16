import { AdminShell } from "../../components/admin-shell";
import { AdminTableEmptyRow, AdminTableFrame } from "../../components/admin-table";
import { SectionCard } from "../../components/section-card";
import { StatusBadge } from "../../components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { getAuditPageData } from "../../lib/dashboard-data";

export default async function AuditPage() {
  const { isLive, profile, rows } = await getAuditPageData();
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Audit Log")])}
      currentBranchLabel={profile.role === "admin" ? "All branches" : (profile.branch_id ?? "Branch")}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Audit Log"
      subtitle="Immutable operational trail for approvals, member creation, loans, device actions, and high-risk events."
    >
      <SectionCard title="Recent Audit Events">
        <AdminTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${row.time}-${row.reference}-${row.actor}-${row.action}-${index}`}>
                <TableCell>{row.time}</TableCell>
                <TableCell>{row.actor}</TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell>{row.reference}</TableCell>
                <TableCell>
                  <StatusBadge>{row.result}</StatusBadge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <AdminTableEmptyRow colSpan={5} description="No live audit events were found yet." />
            ) : null}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </SectionCard>
    </AdminShell>
  );
}
