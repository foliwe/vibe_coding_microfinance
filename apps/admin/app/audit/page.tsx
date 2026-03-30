import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
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
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Reference</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.time}-${row.reference}-${row.actor}-${row.action}-${index}`}>
                <td>{row.time}</td>
                <td>{row.actor}</td>
                <td>{row.action}</td>
                <td>{row.reference}</td>
                <td>{row.result}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="muted" colSpan={5}>
                  No live audit events were found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
