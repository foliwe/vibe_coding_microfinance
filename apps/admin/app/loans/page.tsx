import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { getLoansPageData } from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";

export default async function LoansPage() {
  const { isLive, loans, profile } = await getLoansPageData();
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Loans")])}
      currentBranchLabel={profile.branch_id ?? "Branch"}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Loans"
      subtitle="Loan review, disbursement preparation, and principal/interest monitoring."
    >
      <SectionCard title="Active Loan Snapshot" description="Interest is calculated monthly on remaining principal.">
        <table className="table">
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Member</th>
              <th>Approved Principal</th>
              <th>Remaining Principal</th>
              <th>Monthly Rate</th>
              <th>Next Interest Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id}>
                <td>{loan.id.toUpperCase()}</td>
                <td>{loan.memberName}</td>
                <td>{prettyCurrency(loan.approvedPrincipal)}</td>
                <td>{prettyCurrency(loan.remainingPrincipal)}</td>
                <td>{loan.monthlyInterestRate * 100}%</td>
                <td>{prettyCurrency(loan.nextInterestDue)}</td>
                <td>
                  <span className="chip">{loan.status}</span>
                </td>
              </tr>
            ))}
            {loans.length === 0 ? (
              <tr>
                <td className="muted" colSpan={7}>
                  No live loans were found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
