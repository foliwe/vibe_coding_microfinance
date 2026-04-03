import {
  reviewCashReconciliationAction,
} from "../actions";
import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import {
  getReconciliationPageData,
  type ReconciliationReviewRow,
} from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function prettyDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ReconciliationResultNotice({
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
    <p className={result === "error" ? "notice notice-error" : "notice notice-success"}>
      {detail ?? (result === "error" ? "The reconciliation review failed." : "Reconciliation review recorded.")}
    </p>
  );
}

function ReconciliationTable({
  emptyMessage,
  rows,
  showActions,
}: {
  emptyMessage: string;
  rows: ReconciliationReviewRow[];
  showActions: boolean;
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Reference</th>
          <th>Submitted</th>
          <th>Business Date</th>
          <th>Branch</th>
          <th>Agent</th>
          <th>Expected</th>
          <th>Counted</th>
          <th>Variance</th>
          <th>Status</th>
          <th>Notes</th>
          {showActions ? <th>Action</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id.toUpperCase()}</td>
              <td>{prettyDateTime(row.submittedAt)}</td>
              <td>{row.businessDate}</td>
              <td>{row.branchName}</td>
              <td>{row.agentName}</td>
              <td>{prettyCurrency(row.expectedCash)}</td>
              <td>{prettyCurrency(row.countedCash)}</td>
              <td>{prettyCurrency(row.variance)}</td>
              <td>
                <span className="chip">{row.status}</span>
              </td>
              <td>
                <div className="space-y-2">
                  <p>{row.varianceReason || "No variance note."}</p>
                  {!showActions && row.reviewNote ? <p className="muted">Review note: {row.reviewNote}</p> : null}
                  {!showActions && row.reviewedAt ? <p className="muted">Reviewed {prettyDateTime(row.reviewedAt)}</p> : null}
                </div>
              </td>
              {showActions ? (
                <td>
                  <form action={reviewCashReconciliationAction} className="space-y-2 min-w-[18rem]">
                    <input name="reconciliationId" type="hidden" value={row.id} />
                    <Input
                      aria-label={`Variance note for ${row.agentName}`}
                      disabled
                      value={row.varianceReason ?? "No variance note."}
                    />
                    <Textarea
                      aria-label={`Review note for ${row.agentName}`}
                      name="reviewNote"
                      placeholder="Optional review note."
                    />
                    <div className="table-actions">
                      <button className="button table-button" name="reviewAction" type="submit" value="approve">
                        Approve
                      </button>
                      <button
                        className="button-secondary table-button"
                        name="reviewAction"
                        type="submit"
                        value="reject"
                      >
                        Reject
                      </button>
                    </div>
                  </form>
                </td>
              ) : null}
            </tr>
          ))
        ) : (
          <tr>
            <td className="muted" colSpan={showActions ? 11 : 10}>
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams?: Promise<{
    detail?: string | string[];
    result?: string | string[];
  }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const { currentBranchLabel, isLive, pendingRows, profile, recentRows, summary } =
    await getReconciliationPageData();
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Reconciliation")])}
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Reconciliation"
      subtitle="Daily cash drawer review, pending submissions, and recent branch decisions."
    >
      <ReconciliationResultNotice
        detail={firstParam(params?.detail)}
        result={firstParam(params?.result)}
      />

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

      <SectionCard
        title="Pending Reconciliation Reviews"
        description="Agents submit counted cash from mobile. Approve or reject the submission here."
      >
        <ReconciliationTable
          emptyMessage="No cash reconciliations are waiting for review."
          rows={pendingRows}
          showActions
        />
      </SectionCard>

      <SectionCard
        title="Recent Decisions"
        description="Most recent approved or rejected reconciliations across the current scope."
      >
        <ReconciliationTable
          emptyMessage="No reviewed cash reconciliations are recorded yet."
          rows={recentRows}
          showActions={false}
        />
      </SectionCard>
    </AdminShell>
  );
}
