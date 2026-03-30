import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { getBranchDashboardData } from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";

export default async function ReconciliationPage() {
  const { isLive, profile, summary } = await getBranchDashboardData();
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Reconciliation")])}
      currentBranchLabel={summary.branchName}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Reconciliation"
      subtitle="Daily cash drawer review and variance tracking for the branch."
    >
      <SectionCard title="Branch Cash Summary">
        <table className="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Expected Cash Today</td>
              <td>{prettyCurrency(summary.expectedCashToday)}</td>
            </tr>
            <tr>
              <td>Cash Variance</td>
              <td>{prettyCurrency(summary.cashVariance)}</td>
            </tr>
            <tr>
              <td>Pending Approvals</td>
              <td>{summary.pendingApprovals}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
