import { cookies } from "next/headers";
import Link from "next/link";

import { ActivityTrendChart, ChartBars } from "../../../components/chart-bars";
import { AdminShell } from "../../../components/admin-shell";
import { PasswordResetNotice } from "../../../components/password-reset-notice";
import { SectionCard } from "../../../components/section-card";
import { StatCard } from "../../../components/stat-card";
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
          <div className="grid grid-4">
            <StatCard label="Savings Balance" value={prettyCurrency(member.savingsBalance)} tone="success" />
            <StatCard label="Deposit Balance" value={prettyCurrency(member.depositBalance)} />
            <StatCard label="Pending Transactions" value={String(member.pendingTransactions)} tone="warning" />
            <StatCard label="Outstanding Loan Balance" value={prettyCurrency(member.outstandingLoanBalance)} />
          </div>

          <div className="grid grid-2">
            <SectionCard title="Member Profile" description="Contact, branch, and assignment information for this member.">
              <div className="list">
                <div className="list-item">
                  <strong>Branch</strong>
                  <span>{member.branchName}</span>
                </div>
                <div className="list-item">
                  <strong>Assigned Agent</strong>
                  <span>
                    {member.agentId ? (
                      <Link className="font-semibold underline-offset-4 hover:underline" href={`/agents/${member.agentId}`}>
                        {member.agentName}
                      </Link>
                    ) : (
                      member.agentName
                    )}
                  </span>
                </div>
                <div className="list-item">
                  <strong>Phone</strong>
                  <span>{member.phone}</span>
                </div>
                <div className="list-item">
                  <strong>Status</strong>
                  <span className="chip">{member.status}</span>
                </div>
                <div className="list-item">
                  <strong>Occupation</strong>
                  <span>{member.occupation ?? "No occupation"}</span>
                </div>
                <div className="list-item">
                  <strong>Address</strong>
                  <span>{member.address ?? "No address"}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Account Summary" description="Savings and deposit accounts linked to this member.">
              <div className="list">
                {accounts.map((account) => (
                  <div className="list-item" key={account.id}>
                    <div>
                      <strong>{account.accountType === "savings" ? "Savings" : "Deposit"} Account</strong>
                      <p className="muted">{account.accountNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{prettyCurrency(account.balance)}</p>
                      <p className="muted">{account.status}</p>
                    </div>
                  </div>
                ))}
                {accounts.length === 0 ? (
                  <p className="muted">No live accounts were found for this member yet.</p>
                ) : null}
                <div className="list-item">
                  <strong>Active Loans</strong>
                  <span>{member.activeLoanCount}</span>
                </div>
                <div className="list-item">
                  <strong>Outstanding Loan Balance</strong>
                  <span>{prettyCurrency(member.outstandingLoanBalance)}</span>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-2">
            <SectionCard title="Transaction Trend" description="Deposit and withdrawal request movement across the most recent seven days.">
              {recentTransactions.length ? (
                <ActivityTrendChart data={activityTrend} />
              ) : (
                <p className="muted">No recent member transaction activity is available yet.</p>
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
                <p className="muted">Balance charts will appear after accounts are created.</p>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Reset Login Password"
            description="Generate a new temporary password for this member. The password must be changed at next login and any existing transaction PIN setup stays unchanged."
          >
            <Notice detail={resolvedSearchParams?.detail} result={resolvedSearchParams?.result} />
            {passwordResetFlash ? <PasswordResetNotice {...passwordResetFlash} /> : null}
            <form action={resetLoginPasswordAction}>
              <input name="targetProfileId" type="hidden" value={member.id} />
              <input name="targetRole" type="hidden" value="member" />
              <div className="actions">
                <button className="button-secondary" type="submit">
                  Reset Login Password
                </button>
              </div>
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
              <p className="muted">No transaction requests have been recorded for this member yet.</p>
            )}
          </SectionCard>
        </>
      ) : (
        <SectionCard title="Member not found">
          <p className="muted">No live member record matches this route or your current branch scope.</p>
        </SectionCard>
      )}
    </AdminShell>
  );
}
