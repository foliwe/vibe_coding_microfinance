import { members } from "@credit-union/shared";

import { AdminShell } from "../../../components/admin-shell";
import { SectionCard } from "../../../components/section-card";

export default function MemberDetailPage() {
  const member = members[0];

  return (
    <AdminShell
      role="branch_manager"
      title="Member Detail"
      subtitle="Profile, branch assignment, and summary context for one member."
    >
      <SectionCard title={member.fullName}>
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
            <span>{member.address}</span>
          </div>
        </div>
      </SectionCard>
    </AdminShell>
  );
}
