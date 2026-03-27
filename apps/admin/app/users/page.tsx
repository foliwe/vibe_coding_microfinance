import { members } from "@credit-union/shared";

import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";

export default function UsersPage() {
  return (
    <AdminShell
      role="admin"
      title="Users"
      subtitle="High-level user registry across staff and members."
    >
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
            <tr>
              <td>Rose M.</td>
              <td>Branch Manager</td>
              <td>Bamenda Central</td>
              <td>Active</td>
            </tr>
            <tr>
              <td>Amina</td>
              <td>Agent</td>
              <td>Bamenda Central</td>
              <td>Active</td>
            </tr>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.fullName}</td>
                <td>Member</td>
                <td>{member.branchName}</td>
                <td>{member.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
