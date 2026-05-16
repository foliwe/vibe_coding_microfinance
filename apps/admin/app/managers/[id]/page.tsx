import { cookies } from "next/headers";
import Link from "next/link";

import { ActionBar } from "../../../components/action-bar";
import { AdminDetailItem, AdminDetailList } from "../../../components/admin-detail-list";
import { AdminShell } from "../../../components/admin-shell";
import { PasswordResetNotice } from "../../../components/password-reset-notice";
import { ResultNotice } from "../../../components/notice";
import { SectionCard } from "../../../components/section-card";
import { StatCard } from "../../../components/stat-card";
import { StatusBadge } from "../../../components/status-badge";
import { Button } from "../../../components/ui/button";
import { resetLoginPasswordAction } from "../../actions";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import type { PasswordResetFlash } from "../../../lib/password-reset";
import { getManagerDetailPageData } from "../../../lib/dashboard-data";
import { prettyCurrency } from "../../../lib/format";

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
          <div className="grid gap-4 xl:grid-cols-4">
            <StatCard
              description="Current branch assignment for this manager."
              label="Assigned Branch"
              value={branch?.name ?? "Unassigned"}
            />
            <StatCard
              description="Members in the assigned branch."
              label="Members"
              value={String(branch?.memberCount ?? 0)}
            />
            <StatCard
              description="Agents working inside the assigned branch."
              label="Agents"
              value={String(branch?.agentCount ?? 0)}
            />
            <StatCard
              description="Pending approvals inside the branch."
              label="Pending Approvals"
              value={String(branch?.pendingApprovals ?? 0)}
              tone="warning"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="Manager Profile"
              description="Identity, contact information, and current assignment for this branch manager."
            >
              <AdminDetailList>
                <AdminDetailItem label="Email" value={manager.email ?? "No email"} />
                <AdminDetailItem label="Phone" value={manager.phone} />
                <AdminDetailItem
                  label="Status"
                  value={<StatusBadge>{manager.status}</StatusBadge>}
                />
                <AdminDetailItem
                  label="Assigned Branch"
                  value={
                    manager.branchId && branch ? (
                      <Link
                        className="font-semibold underline-offset-4 hover:underline"
                        href={`/branches/${manager.branchId}`}
                      >
                        {branch.name}
                      </Link>
                    ) : (
                      manager.branchName
                    )
                  }
                />
              </AdminDetailList>
            </SectionCard>

            <SectionCard
              title="Manager Actions"
              description="Common follow-up links for branch ownership and staffing workflows."
            >
              <ActionBar>
                <Button asChild>
                  <Link href="/managers">Back to Managers</Link>
                </Button>
                {manager.branchId ? (
                  <Button asChild variant="outline">
                    <Link href={`/branches/${manager.branchId}`}>View Branch</Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline">
                  <Link href="/managers/new">Create Manager</Link>
                </Button>
              </ActionBar>
            </SectionCard>
          </div>

          <SectionCard
            title="Reset Login Password"
            description="Generate a new temporary password for this branch manager. The password must be changed at next login and the current transaction PIN stays unchanged."
          >
            <ResultNotice
              detail={resolvedSearchParams?.detail}
              errorFallback="Something went wrong."
              result={resolvedSearchParams?.result}
              successFallback="Saved successfully."
            />
            {passwordResetFlash ? <PasswordResetNotice {...passwordResetFlash} /> : null}
            <form action={resetLoginPasswordAction}>
              <input name="targetProfileId" type="hidden" value={manager.id} />
              <input name="targetRole" type="hidden" value="branch_manager" />
              <ActionBar>
                <Button type="submit" variant="outline">
                  Reset Login Password
                </Button>
              </ActionBar>
            </form>
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-4">
            <StatCard
              description="Savings balance currently held in branch accounts."
              label="Branch Savings"
              value={prettyCurrency(branch?.totalSavings ?? 0)}
              tone="success"
            />
            <StatCard
              description="Deposit balances at branch scope."
              label="Branch Deposits"
              value={prettyCurrency(branch?.totalDeposits ?? 0)}
            />
            <StatCard
              description="Loan principal still outstanding."
              label="Outstanding Principal"
              value={prettyCurrency(branch?.outstandingPrincipal ?? 0)}
            />
            <StatCard
              description="Current cash variance in the branch."
              label="Cash Variance"
              value={prettyCurrency(branch?.cashVariance ?? 0)}
            />
          </div>

          <SectionCard
            title="Assigned Branch Summary"
            description="High-level branch posture for the manager's current operational scope."
          >
            {branch ? (
              <AdminDetailList>
                <AdminDetailItem label="Branch" value={branch.name} />
                <AdminDetailItem label="Manager" value={branch.managerName} />
                <AdminDetailItem
                  label="Total Loans"
                  value={prettyCurrency(branch.totalLoans)}
                />
                <AdminDetailItem
                  label="Pending Approvals"
                  value={branch.pendingApprovals}
                />
              </AdminDetailList>
            ) : (
              <p className="text-sm text-muted-foreground">
                This manager is not assigned to a branch yet.
              </p>
            )}
          </SectionCard>
        </>
      ) : (
        <SectionCard title="Manager not found">
          <p className="text-sm text-muted-foreground">
            No live manager record matches this route.
          </p>
        </SectionCard>
      )}
    </AdminShell>
  );
}
