import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";

const auditRows = [
  {
    time: "27 Mar 09:12",
    actor: "Rose M.",
    action: "Approved transaction",
    reference: "TXN-00045",
    result: "Success",
  },
  {
    time: "27 Mar 08:53",
    actor: "Amina",
    action: "Submitted deposit",
    reference: "TXN-00045",
    result: "Success",
  },
  {
    time: "27 Mar 08:40",
    actor: "Admin",
    action: "Created branch manager",
    reference: "USR-0022",
    result: "Success",
  },
];

export default function AuditPage() {
  return (
    <AdminShell
      role="admin"
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
            {auditRows.map((row) => (
              <tr key={`${row.time}-${row.reference}`}>
                <td>{row.time}</td>
                <td>{row.actor}</td>
                <td>{row.action}</td>
                <td>{row.reference}</td>
                <td>{row.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
