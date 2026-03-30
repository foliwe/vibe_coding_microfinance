import Link from "next/link";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
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
        <div className="actions">
          <Link className="button" href="/managers/new">
            Create Manager
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Manager Registry">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Branch</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((manager) => (
              <tr key={manager.id}>
                <td>
                  <Link className="font-semibold underline-offset-4 hover:underline" href={`/managers/${manager.id}`}>
                    {manager.fullName}
                  </Link>
                </td>
                <td>{manager.branchName}</td>
                <td>{manager.phone}</td>
                <td>
                  <span className="chip">{manager.status}</span>
                </td>
              </tr>
            ))}
            {managers.length === 0 ? (
              <tr>
                <td className="muted" colSpan={4}>
                  No live branch managers were found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
