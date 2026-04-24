import { cookies } from "next/headers";
import Link from "next/link";

import { AdminShell } from "../../../components/admin-shell";
import { PasswordResetNotice } from "../../../components/password-reset-notice";
import { SectionCard } from "../../../components/section-card";
import { StatCard } from "../../../components/stat-card";
import { resetLoginPasswordAction } from "../../actions";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import type { PasswordResetFlash } from "../../../lib/password-reset";
import { getManagerDetailPageData } from "../../../lib/dashboard-data";
import { prettyCurrency } from "../../../lib/format";

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

export default async function ManagerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ detail?: string; result?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();
  const flashValue = cookieStore.get("password_reset_flash")?.value;
  const passwordResetFlash =
    resolvedSearchParams?.result === "success" && flashValue
      ? (() => {
          try {
            return JSON.parse(flashValue) as PasswordResetFlash;
          } catch {
            return null;
          }
        })()
      : null;
  const { branch, currentBranchLabel, isLive, manager, profile } =
    await getManagerDetailPageData(id);

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs("admin", [
        breadcrumb("People"),
        breadcrumb("Managers", "/managers"),
        breadcrumb(manager?.fullName ?? "Manager Detail"),
      ])}
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title={manager?.fullName ?? "Manager Detail"}
      subtitle="Branch manager profile with assigned branch context and quick operational summary."
    >
      {manager ? (
        <>
          <div className="grid grid-4">
            <StatCard label="Assigned Branch" value={branch?.name ?? "Unassigned"} />
            <StatCard label="Members" value={String(branch?.memberCount ?? 0)} />
            <StatCard label="Agents" value={String(branch?.agentCount ?? 0)} />
            <StatCard
              label="Pending Approvals"
              value={String(branch?.pendingApprovals ?? 0)}
              tone="warning"
            />
          </div>

          <div className="grid grid-2">
            <SectionCard
              title="Manager Profile"
              description="Identity, contact information, and current assignment for this branch manager."
            >
              <div className="list">
                <div className="list-item">
                  <strong>Email</strong>
                  <span>{manager.email ?? "No email"}</span>
                </div>
                <div className="list-item">
                  <strong>Phone</strong>
                  <span>{manager.phone}</span>
                </div>
                <div className="list-item">
                  <strong>Status</strong>
                  <span className="chip">{manager.status}</span>
                </div>
                <div className="list-item">
                  <strong>Assigned Branch</strong>
                  <span>
                    {manager.branchId && branch ? (
                      <Link
                        className="font-semibold underline-offset-4 hover:underline"
                        href={`/branches/${manager.branchId}`}
                      >
                        {branch.name}
                      </Link>
                    ) : (
                      manager.branchName
                    )}
                  </span>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Manager Actions"
              description="Common follow-up links for branch ownership and staffing workflows."
            >
              <div className="actions">
                <Link className="button" href="/managers">
                  Back to Managers
                </Link>
                {manager.branchId ? (
                  <Link className="button-secondary" href={`/branches/${manager.branchId}`}>
                    View Branch
                  </Link>
                ) : null}
                <Link className="button-secondary" href="/managers/new">
                  Create Manager
                </Link>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Reset Login Password"
            description="Generate a new temporary password for this branch manager. The password must be changed at next login and the current transaction PIN stays unchanged."
          >
            <Notice detail={resolvedSearchParams?.detail} result={resolvedSearchParams?.result} />
            {passwordResetFlash ? <PasswordResetNotice {...passwordResetFlash} /> : null}
            <form action={resetLoginPasswordAction}>
              <input name="targetProfileId" type="hidden" value={manager.id} />
              <input name="targetRole" type="hidden" value="branch_manager" />
              <div className="actions">
                <button className="button-secondary" type="submit">
                  Reset Login Password
                </button>
              </div>
            </form>
          </SectionCard>

          <div className="grid grid-4">
            <StatCard
              label="Branch Savings"
              value={prettyCurrency(branch?.totalSavings ?? 0)}
              tone="success"
            />
            <StatCard label="Branch Deposits" value={prettyCurrency(branch?.totalDeposits ?? 0)} />
            <StatCard label="Outstanding Principal" value={prettyCurrency(branch?.outstandingPrincipal ?? 0)} />
            <StatCard label="Cash Variance" value={prettyCurrency(branch?.cashVariance ?? 0)} />
          </div>

          <SectionCard
            title="Assigned Branch Summary"
            description="High-level branch posture for the manager's current operational scope."
          >
            {branch ? (
              <div className="list">
                <div className="list-item">
                  <strong>Branch</strong>
                  <span>{branch.name}</span>
                </div>
                <div className="list-item">
                  <strong>Manager</strong>
                  <span>{branch.managerName}</span>
                </div>
                <div className="list-item">
                  <strong>Total Loans</strong>
                  <span>{prettyCurrency(branch.totalLoans)}</span>
                </div>
                <div className="list-item">
                  <strong>Pending Approvals</strong>
                  <span>{branch.pendingApprovals}</span>
                </div>
              </div>
            ) : (
              <p className="muted">This manager is not assigned to a branch yet.</p>
            )}
          </SectionCard>
        </>
      ) : (
        <SectionCard title="Manager not found">
          <p className="muted">No live manager record matches this route.</p>
        </SectionCard>
      )}
    </AdminShell>
  );
}
