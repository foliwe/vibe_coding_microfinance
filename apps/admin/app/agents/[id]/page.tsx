import { cookies } from "next/headers";
import Link from "next/link";

import { ActivityTrendChart, ChartBars } from "../../../components/chart-bars";
import { ActionBar } from "../../../components/action-bar";
import { AdminDetailItem, AdminDetailList } from "../../../components/admin-detail-list";
import { AdminShell } from "../../../components/admin-shell";
import { PasswordResetNotice } from "../../../components/password-reset-notice";
import { ResultNotice } from "../../../components/notice";
import { SectionCard } from "../../../components/section-card";
import { StatCard } from "../../../components/stat-card";
import { StatusBadge } from "../../../components/status-badge";
import { Button } from "../../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { resetLoginPasswordAction } from "../../actions";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import type { PasswordResetFlash } from "../../../lib/password-reset";
import { getAgentDetailPageData } from "../../../lib/dashboard-data";
import { prettyCurrency } from "../../../lib/format";

export default async function AgentDetailPage({
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
  const { activityTrend, agent, currentBranchLabel, isLive, members, profile, recentTransactions } =
    await getAgentDetailPageData(id);
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [
        breadcrumb("People"),
        breadcrumb("Agents", "/agents"),
        breadcrumb(agent?.fullName ?? "Agent Detail"),
      ])}
      currentBranchLabel={agent?.branchName ?? currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title={agent?.fullName ?? "Agent Detail"}
      subtitle="Profile context, assigned member relationships, and recent field activity for one agent."
    >
      {agent ? (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <StatCard
              description="Members currently assigned to this agent."
              label="Assigned Members"
              value={String(agent.assignedMemberCount)}
            />
            <StatCard
              description="Collections handled today."
              label="Collections Today"
              tone="success"
              value={prettyCurrency(agent.collectionsToday)}
            />
            <StatCard
              description="Transactions awaiting review."
              label="Pending Approvals"
              tone="warning"
              value={String(agent.pendingApprovals)}
            />
            <StatCard
              description="Current cash variance for this agent."
              label="Cash Variance"
              value={prettyCurrency(agent.cashVariance)}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Agent Profile" description="Branch ownership, contact details, and current status.">
              <AdminDetailList>
                <AdminDetailItem label="Branch" value={agent.branchName} />
                <AdminDetailItem label="Phone" value={agent.phone} />
                <AdminDetailItem
                  label="Status"
                  value={<StatusBadge>{agent.status}</StatusBadge>}
                />
                <AdminDetailItem
                  label="Total Recent Collections"
                  value={prettyCurrency(agent.collectionsTotal)}
                />
              </AdminDetailList>
            </SectionCard>

            <SectionCard title="Activity Snapshot" description="Quick bar view of member coverage and approval pressure.">
              <ChartBars
                data={[
                  { label: "Members", value: agent.assignedMemberCount },
                  { label: "Pending", value: agent.pendingApprovals },
                  { label: "Today", value: agent.collectionsToday },
                ]}
              />
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Collections Trend" description="Deposit and withdrawal activity for the most recent seven days.">
              {recentTransactions.length ? (
                <ActivityTrendChart data={activityTrend} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent transaction activity is available for this agent yet.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Assigned Members" description="Members currently assigned to this agent.">
              {members.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Occupation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <Link className="underline-offset-4 hover:underline" href={`/members/${member.id}`}>
                            {member.fullName}
                          </Link>
                        </TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>{member.status}</TableCell>
                        <TableCell>{member.occupation ?? "No occupation"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No members are assigned to this agent yet.
                </p>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Reset Login Password"
            description="Generate a new temporary password for this agent. The password must be changed at next login and the current transaction PIN stays unchanged."
          >
            <ResultNotice
              detail={resolvedSearchParams?.detail}
              errorFallback="Something went wrong."
              result={resolvedSearchParams?.result}
              successFallback="Saved successfully."
            />
            {passwordResetFlash ? <PasswordResetNotice {...passwordResetFlash} /> : null}
            <form action={resetLoginPasswordAction}>
              <input name="targetProfileId" type="hidden" value={agent.id} />
              <input name="targetRole" type="hidden" value="agent" />
              <ActionBar>
                <Button type="submit" variant="outline">
                  Reset Login Password
                </Button>
              </ActionBar>
            </form>
          </SectionCard>

          <SectionCard title="Recent Transactions" description="Latest transaction requests handled by this agent.">
            {recentTransactions.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <Link className="underline-offset-4 hover:underline" href={`/members/${transaction.memberId}`}>
                          {transaction.memberName}
                        </Link>
                      </TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>{transaction.status}</TableCell>
                      <TableCell>{prettyCurrency(transaction.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No transactions have been recorded for this agent yet.
              </p>
            )}
          </SectionCard>
        </>
      ) : (
        <SectionCard title="Agent not found">
          <p className="text-sm text-muted-foreground">
            No live agent record matches this route or your current branch scope.
          </p>
        </SectionCard>
      )}
    </AdminShell>
  );
}
