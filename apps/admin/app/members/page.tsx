import { members } from "@credit-union/shared";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";

export default function MembersPage() {
  return (
    <AdminShell
      role="branch_manager"
      title="Members"
      subtitle="Branch-scoped member list with assignment, branch, and status visibility."
    >
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
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
