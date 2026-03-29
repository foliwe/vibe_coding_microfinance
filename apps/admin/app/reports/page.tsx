import { requestReportAction } from "../actions";
import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { getReportsPageData } from "../../lib/dashboard-data";

function Notice({
  detail,
  result,
}: {
  detail?: string;
  result?: string;
}) {
  if (!result) {
    return null;
  }

  return (
    <p className={`notice ${result === "success" ? "notice-success" : "notice-error"}`}>
      {detail ?? (result === "success" ? "Saved successfully." : "Something went wrong.")}
    </p>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const { branches, currentBranchLabel, isLive, profile, rows } = await getReportsPageData();
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Reports"
      subtitle="Queue branch or institution-wide export requests and track their delivery status."
    >
      <SectionCard
        title="Queue Report"
        description="This now records a live report job in Supabase instead of showing a dead placeholder button."
      >
        <Notice detail={params?.detail} result={params?.result} />
        <form action={requestReportAction}>
          <div className="form-grid">
            <label className="field">
              <span>Report Type</span>
              <select defaultValue="daily_collections" name="reportType">
                <option value="daily_collections">Daily Collections</option>
                <option value="member_statement">Member Statement</option>
                <option value="loan_portfolio">Loan Portfolio</option>
                <option value="arrears_default">Arrears / Default</option>
                <option value="reconciliation_variance">Reconciliation Variance</option>
                <option value="audit_trail">Audit Trail</option>
              </select>
            </label>
            <label className="field">
              <span>Branch</span>
              <select
                defaultValue={profile.role === "branch_manager" ? profile.branch_id ?? "" : ""}
                name="branchId"
              >
                {profile.role === "admin" ? <option value="">All Branches</option> : null}
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date From</span>
              <input name="dateFrom" type="date" />
            </label>
            <label className="field">
              <span>Date To</span>
              <input name="dateTo" type="date" />
            </label>
            <label className="field">
              <span>Export Format</span>
              <select defaultValue="csv" name="exportFormat">
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
                <option value="pdf">Printable / PDF</option>
              </select>
            </label>
          </div>
          <div className="actions">
            <button className="button" type="submit">
              Queue Report
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Recent Report Jobs" description="Latest queued exports in the visible scope.">
        <table className="table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Requested</th>
              <th>File</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.reportType}</td>
                <td>{row.branchName}</td>
                <td>
                  <span className="chip">{row.status}</span>
                </td>
                <td>{row.requestedAt}</td>
                <td>{row.filePath ?? "Pending export"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="muted" colSpan={5}>
                  No report jobs have been queued yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
