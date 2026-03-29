import { AdminShell } from "../../../components/admin-shell";
import { SectionCard } from "../../../components/section-card";
import { getMemberDetailPageData } from "../../../lib/dashboard-data";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { isLive, member, profile } = await getMemberDetailPageData(id);

  return (
    <AdminShell
      currentBranchLabel={profile.branch_id ?? "Branch"}
      currentUserName={profile.full_name}
      role={profile.role === "admin" ? "admin" : "branch_manager"}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Member Detail"
      subtitle="Profile, branch assignment, and summary context for one member."
    >
      <SectionCard title={member?.fullName ?? "Member not found"}>
        {member ? (
          <div className="list">
            <div className="list-item">
              <strong>Branch</strong>
              <span>{member.branchName}</span>
            </div>
            <div className="list-item">
              <strong>Assigned Agent</strong>
              <span>{member.agentName}</span>
            </div>
            <div className="list-item">
              <strong>Phone</strong>
              <span>{member.phone}</span>
            </div>
            <div className="list-item">
              <strong>Address</strong>
              <span>{member.address ?? "No address"}</span>
            </div>
          </div>
        ) : (
          <p className="muted">No live member record matches this route.</p>
        )}
      </SectionCard>
    </AdminShell>
  );
}
