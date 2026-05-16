import {
  reviewCashReconciliationAction,
} from "../actions";
import { ActionBar } from "../../components/action-bar";
import { AdminShell } from "../../components/admin-shell";
import { AdminTableEmptyRow, AdminTableFrame } from "../../components/admin-table";
import { Notice, ResultNotice } from "../../components/notice";
import { SectionCard } from "../../components/section-card";
import { Input } from "../../components/ui/input";
import { StatusBadge } from "../../components/status-badge";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
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
    <AdminTableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Business Date</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Counted</TableHead>
            <TableHead>Variance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
            {showActions ? <TableHead>Action</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
        {rows.length ? (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.id.toUpperCase()}</TableCell>
              <TableCell>{prettyDateTime(row.submittedAt)}</TableCell>
              <TableCell>{row.businessDate}</TableCell>
              <TableCell>{row.branchName}</TableCell>
              <TableCell>{row.agentName}</TableCell>
              <TableCell>{prettyCurrency(row.expectedCash)}</TableCell>
              <TableCell>{prettyCurrency(row.countedCash)}</TableCell>
              <TableCell>{prettyCurrency(row.variance)}</TableCell>
              <TableCell>
                <StatusBadge>{row.status}</StatusBadge>
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <p>{row.varianceReason || "No variance note."}</p>
                  {!showActions && row.reviewNote ? (
                    <p className="text-sm text-muted-foreground">
                      Review note: {row.reviewNote}
                    </p>
                  ) : null}
                  {!showActions && row.reviewedAt ? (
                    <p className="text-sm text-muted-foreground">
                      Reviewed {prettyDateTime(row.reviewedAt)}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              {showActions ? (
                <TableCell>
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
                    <ActionBar>
                      <Button name="reviewAction" size="sm" type="submit" value="approve">
                        Approve
                      </Button>
                      <Button
                        name="reviewAction"
                        size="sm"
                        type="submit"
                        value="reject"
                        variant="outline"
                      >
                        Reject
                      </Button>
                    </ActionBar>
                  </form>
                </TableCell>
              ) : null}
            </TableRow>
          ))
        ) : (
          <AdminTableEmptyRow
            colSpan={showActions ? 11 : 10}
            description={emptyMessage}
          />
        )}
        </TableBody>
      </Table>
    </AdminTableFrame>
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
      <ResultNotice
        detail={firstParam(params?.detail)}
        errorFallback="The reconciliation review failed."
        result={firstParam(params?.result)}
        successFallback="Reconciliation review recorded."
      />

      <SectionCard title="Branch Cash Summary">
        <AdminTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Expected Cash Today</TableCell>
                <TableCell>{prettyCurrency(summary.expectedCashToday)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cash Variance</TableCell>
                <TableCell>{prettyCurrency(summary.cashVariance)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Pending Approvals</TableCell>
                <TableCell>{summary.pendingApprovals}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </AdminTableFrame>
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
