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
import { getMemberDetailPageData } from "../../../lib/dashboard-data";
import { formatElapsedTime, prettyCurrency, prettyDate } from "../../../lib/format";

export default async function MemberDetailPage({
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
  const { accounts, activityTrend, currentBranchLabel, isLive, member, profile, recentTransactions } =
    await getMemberDetailPageData(id);
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [
        breadcrumb("People"),
        breadcrumb("Members", "/members"),
        breadcrumb(member?.fullName ?? "Member Detail"),
      ])}
      currentBranchLabel={member?.branchName ?? currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title={member?.fullName ?? "Member Detail"}
      subtitle="Profile context, linked ownership, account balances, and recent member activity."
    >
      {member ? (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <StatCard
              description="Current savings balance for this member."
              label="Savings Balance"
              tone="success"
              value={prettyCurrency(member.savingsBalance)}
            />
            <StatCard
              description="Current deposit balance for this member."
              label="Deposit Balance"
              value={prettyCurrency(member.depositBalance)}
            />
            <StatCard
              description="Transactions still waiting to be processed."
              label="Pending Transactions"
              tone="warning"
              value={String(member.pendingTransactions)}
            />
            <StatCard
              description="Outstanding balance across active loans."
              label="Outstanding Loan Balance"
              value={prettyCurrency(member.outstandingLoanBalance)}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Member Profile" description="Contact, branch, and assignment information for this member.">
              <AdminDetailList>
                <AdminDetailItem label="Branch" value={member.branchName} />
                <AdminDetailItem
                  label="Assigned Agent"
                  value={
                    member.agentId ? (
                      <Link className="font-semibold underline-offset-4 hover:underline" href={`/agents/${member.agentId}`}>
                        {member.agentName}
                      </Link>
                    ) : (
                      member.agentName
                    )
                  }
                />
                <AdminDetailItem label="Phone" value={member.phone} />
                <AdminDetailItem
                  label="Status"
                  value={<StatusBadge>{member.status}</StatusBadge>}
                />
                <AdminDetailItem
                  label="Created"
                  value={member.createdAt ? prettyDate(member.createdAt) : "Unknown"}
                />
                <AdminDetailItem
                  label="Member Since"
                  value={
                    member.createdAt
                      ? `${prettyDate(member.createdAt)} (${formatElapsedTime(member.createdAt)} ago)`
                      : "Unknown"
                  }
                />
                <AdminDetailItem
                  label="Occupation"
                  value={member.occupation ?? "No occupation"}
                />
                <AdminDetailItem label="Address" value={member.address ?? "No address"} />
              </AdminDetailList>
            </SectionCard>

            <SectionCard title="Account Summary" description="Savings and deposit accounts linked to this member.">
              <AdminDetailList>
                {accounts.map((account) => (
                  <AdminDetailItem
                    key={account.id}
                    label={
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {account.accountType === "savings" ? "Savings" : "Deposit"} Account
                        </p>
                        <p className="text-sm text-muted-foreground">{account.accountNumber}</p>
                      </div>
                    }
                    value={
                      <div className="space-y-1 text-left sm:text-right">
                        <p className="font-medium text-foreground">
                          {prettyCurrency(account.balance)}
                        </p>
                        <p className="text-sm text-muted-foreground">{account.status}</p>
                      </div>
                    }
                  />
                ))}
                {accounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No live accounts were found for this member yet.
                  </p>
                ) : null}
                <AdminDetailItem label="Active Loans" value={member.activeLoanCount} />
                <AdminDetailItem
                  label="Outstanding Loan Balance"
                  value={prettyCurrency(member.outstandingLoanBalance)}
                />
              </AdminDetailList>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Transaction Trend" description="Deposit and withdrawal request movement across the most recent seven days.">
              {recentTransactions.length ? (
                <ActivityTrendChart data={activityTrend} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent member transaction activity is available yet.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Balance Mix" description="Savings and deposit balances compared side-by-side.">
              {accounts.length ? (
                <ChartBars
                  data={[
                    { label: "Savings", value: member.savingsBalance },
                    { label: "Deposit", value: member.depositBalance },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Balance charts will appear after accounts are created.
                </p>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Reset Login Password"
            description="Generate a new temporary password for this member. The password must be changed at next login and any existing transaction PIN setup stays unchanged."
          >
            <ResultNotice
              detail={resolvedSearchParams?.detail}
              errorFallback="Something went wrong."
              result={resolvedSearchParams?.result}
              successFallback="Saved successfully."
            />
            {passwordResetFlash ? <PasswordResetNotice {...passwordResetFlash} /> : null}
            <form action={resetLoginPasswordAction}>
              <input name="targetProfileId" type="hidden" value={member.id} />
              <input name="targetRole" type="hidden" value="member" />
              <ActionBar>
                <Button type="submit" variant="outline">
                  Reset Login Password
                </Button>
              </ActionBar>
            </form>
          </SectionCard>

          <SectionCard title="Recent Transactions" description="Latest transaction requests for this member.">
            {recentTransactions.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>{transaction.accountType}</TableCell>
                      <TableCell>
                        <Link className="underline-offset-4 hover:underline" href={`/agents/${transaction.agentId}`}>
                          {transaction.agentName}
                        </Link>
                      </TableCell>
                      <TableCell>{transaction.status}</TableCell>
                      <TableCell>{prettyCurrency(transaction.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No transaction requests have been recorded for this member yet.
              </p>
            )}
          </SectionCard>
        </>
      ) : (
        <SectionCard title="Member not found">
          <p className="text-sm text-muted-foreground">
            No live member record matches this route or your current branch scope.
          </p>
        </SectionCard>
      )}
    </AdminShell>
  );
}
