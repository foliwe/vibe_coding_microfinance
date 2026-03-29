import Link from "next/link";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { getMembersPageData } from "../../lib/dashboard-data";

export default async function MembersPage() {
  const { isLive, members, profile } = await getMembersPageData();

  return (
    <AdminShell
      currentBranchLabel={profile.branch_id ?? "Branch"}
      currentUserName={profile.full_name}
      role={profile.role === "admin" ? "admin" : "branch_manager"}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Members"
      subtitle="Branch-scoped member list with assignment, branch, and status visibility."
    >
      <SectionCard title="Member Actions" description="Onboard new members into the currently visible branch scope.">
        <div className="actions">
          <Link className="button" href="/members/new">
            Create Member
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Member Registry" description="Members are always tied to one branch and one active agent in v1.">
        <table className="table">
          <thead>
            <tr>
              <th>Member ID</th>
              <th>Name</th>
              <th>Agent</th>
              <th>Branch</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.id.toUpperCase()}</td>
                <td>{member.fullName}</td>
                <td>{member.agentName}</td>
                <td>{member.branchName}</td>
                <td>{member.phone}</td>
                <td>
                  <span className="chip">{member.status}</span>
                </td>
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td className="muted" colSpan={6}>
                  No live members were found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
