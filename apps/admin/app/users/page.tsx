import Link from "next/link";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { getUsersPageData } from "../../lib/dashboard-data";

export default async function UsersPage() {
  const { isLive, profile, users } = await getUsersPageData();

  return (
    <AdminShell
      currentBranchLabel="All branches"
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Users"
      subtitle="High-level user registry across staff and members."
    >
      <SectionCard title="User Actions" description="Create branch managers from here, then assign them to branches.">
        <div className="actions">
          <Link className="button" href="/users/new">
            Create Manager
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="User Snapshot">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td>{user.role}</td>
                <td>{user.branchName}</td>
                <td>{user.status}</td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td className="muted" colSpan={4}>
                  No live users were found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
