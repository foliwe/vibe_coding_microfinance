import { cookies } from "next/headers";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowUpRightIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  Clock3Icon,
  LandmarkIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  WalletCardsIcon,
} from "lucide-react";

import { ActivityTrendChart } from "../../../components/charts/activity-trend-chart";
import { ChartBars } from "../../../components/charts/collection-bars";
import { ActionBar } from "../../../components/action-bar";
import { AdminShell } from "../../../components/admin-shell";
import { PasswordResetNotice } from "../../../components/password-reset-notice";
import { ResultNotice } from "../../../components/notice";
import { SectionCard } from "../../../components/section-card";
import { StatCard } from "../../../components/stat-card";
import { StatusBadge } from "../../../components/status-badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { resetLoginPasswordAction } from "../../actions";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import { getMemberDetailPageData } from "../../../lib/dashboard-data";
import { formatElapsedTime, prettyCurrency, prettyDate } from "../../../lib/format";
import type { PasswordResetFlash } from "../../../lib/password-reset";

type MemberDetailAccount = Awaited<
  ReturnType<typeof getMemberDetailPageData>
>["accounts"][number];

type MemberDetailTransaction = Awaited<
  ReturnType<typeof getMemberDetailPageData>
>["recentTransactions"][number];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatAccountType(accountType: MemberDetailAccount["accountType"]) {
  return accountType === "savings" ? "Savings" : "Deposit";
}

function formatTransactionType(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function MemberMetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/70 px-4 py-3">
      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <div className="text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

function SidebarMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 text-lg font-semibold text-foreground">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function AccountsTable({
  accounts,
  totalBalance,
}: {
  accounts: MemberDetailAccount[];
  totalBalance: number;
}) {
  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No live accounts were found for this member yet.
      </p>
    );
  }

  return (
    <Table className="min-w-[680px]">
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead className="text-right">Portfolio Share</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => {
          const share = totalBalance > 0 ? (account.balance / totalBalance) * 100 : 0;

          return (
            <TableRow key={account.id}>
              <TableCell className="font-medium">
                <div className="space-y-1">
                  <p>{account.accountNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatAccountType(account.accountType)} wallet
                  </p>
                </div>
              </TableCell>
              <TableCell>{formatAccountType(account.accountType)}</TableCell>
              <TableCell>
                <StatusBadge>{account.status}</StatusBadge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {prettyCurrency(account.balance)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {share.toFixed(1)}%
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function TransactionsTable({
  compact = false,
  transactions,
}: {
  compact?: boolean;
  transactions: MemberDetailTransaction[];
}) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No transaction requests have been recorded for this member yet.
      </p>
    );
  }

  return (
    <Table className={compact ? "min-w-[620px]" : "min-w-[880px]"}>
      <TableHeader>
        <TableRow>
          <TableHead>Reference</TableHead>
          {!compact ? <TableHead>Date</TableHead> : null}
          <TableHead>Type</TableHead>
          {!compact ? <TableHead>Account</TableHead> : null}
          <TableHead>Agent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell className="font-medium">
              {transaction.id.slice(0, 8).toUpperCase()}
            </TableCell>
            {!compact ? (
              <TableCell className="text-muted-foreground">
                {prettyDate(transaction.createdAt)}
              </TableCell>
            ) : null}
            <TableCell>{formatTransactionType(transaction.type)}</TableCell>
            {!compact ? <TableCell>{formatAccountType(transaction.accountType)}</TableCell> : null}
            <TableCell>
              <Link className="underline-offset-4 hover:underline" href={`/agents/${transaction.agentId}`}>
                {transaction.agentName}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge>{transaction.status}</StatusBadge>
            </TableCell>
            <TableCell className="text-right font-medium">
              {prettyCurrency(transaction.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

  if (!member) {
    return (
      <AdminShell
        breadcrumbs={withDashboardBreadcrumbs(role, [
          breadcrumb("People"),
          breadcrumb("Members", "/members"),
          breadcrumb("Member Detail"),
        ])}
        currentBranchLabel={currentBranchLabel}
        currentUserName={profile.full_name}
        role={role}
        statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
        title="Member Detail"
        subtitle="Profile context, linked ownership, account balances, and recent member activity."
      >
        <SectionCard title="Member not found">
          <p className="text-sm text-muted-foreground">
            No live member record matches this route or your current branch scope.
          </p>
        </SectionCard>
      </AdminShell>
    );
  }

  const overviewTransactions = recentTransactions.slice(0, 6);
  const totalBalance = member.savingsBalance + member.depositBalance;
  const latestTransactionDate = recentTransactions[0]?.createdAt ?? null;
  const memberSince = member.createdAt
    ? `${prettyDate(member.createdAt)} (${formatElapsedTime(member.createdAt)} ago)`
    : "Unknown";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [
        breadcrumb("People"),
        breadcrumb("Members", "/members"),
        breadcrumb(member.fullName),
      ])}
      currentBranchLabel={member.branchName ?? currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title={member.fullName}
      subtitle="Profile context, linked ownership, account balances, and recent member activity."
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <Card className="border border-border/70 bg-card/95 shadow-sm xl:sticky xl:top-24">
            <CardContent className="space-y-6 pt-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                  {getInitials(member.fullName)}
                </div>
                <StatusBadge>{member.status}</StatusBadge>
              </div>

              <div className="space-y-3">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {member.fullName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Member profile workspace with account, activity, and security controls.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Member</Badge>
                  <Badge variant="outline">{accounts.length} accounts</Badge>
                  <Badge variant="outline">{member.activeLoanCount} active loans</Badge>
                </div>
              </div>

              <div className="grid gap-3">
                <MemberMetaRow
                  icon={Building2Icon}
                  label="Branch"
                  value={member.branchName}
                />
                <MemberMetaRow
                  icon={UserRoundIcon}
                  label="Assigned Agent"
                  value={
                    member.agentId ? (
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`/agents/${member.agentId}`}
                      >
                        {member.agentName}
                      </Link>
                    ) : (
                      member.agentName
                    )
                  }
                />
                <MemberMetaRow
                  icon={PhoneIcon}
                  label="Phone"
                  value={member.phone}
                />
                <MemberMetaRow
                  icon={Clock3Icon}
                  label="Member Since"
                  value={memberSince}
                />
                <MemberMetaRow
                  icon={BriefcaseBusinessIcon}
                  label="Occupation"
                  value={member.occupation ?? "No occupation"}
                />
                <MemberMetaRow
                  icon={MapPinIcon}
                  label="Address"
                  value={member.address ?? "No address"}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SidebarMetric
                  helper="Combined savings and deposit balance."
                  label="Portfolio Value"
                  value={prettyCurrency(totalBalance)}
                />
                <SidebarMetric
                  helper="Most recent request recorded for this member."
                  label="Last Activity"
                  value={latestTransactionDate ? prettyDate(latestTransactionDate) : "No activity"}
                />
              </div>

              <ActionBar>
                <Button asChild className="w-full justify-between" variant="outline">
                  <Link href="/members">
                    Back to Members
                    <ArrowUpRightIcon />
                  </Link>
                </Button>
                {member.agentId ? (
                  <Button asChild className="w-full justify-between" variant="outline">
                    <Link href={`/agents/${member.agentId}`}>
                      Open Agent
                      <ArrowUpRightIcon />
                    </Link>
                  </Button>
                ) : null}
              </ActionBar>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
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

          <Tabs className="gap-6" defaultValue="overview">
            <TabsList
              className="w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card/95 p-2"
              variant="line"
            >
              <TabsTrigger className="px-3 py-1.5" value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="accounts">
                Accounts
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="transactions">
                Transactions
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="loans">
                Loans
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="security">
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-6" value="overview">
              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <SectionCard
                  description="Deposit and withdrawal request movement across the most recent seven days."
                  title="Transaction Trend"
                >
                  {recentTransactions.length ? (
                    <ActivityTrendChart data={activityTrend} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No recent member transaction activity is available yet.
                    </p>
                  )}
                </SectionCard>

                <SectionCard
                  description="Savings and deposit balances compared side-by-side."
                  title="Balance Mix"
                >
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

              <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard
                  actions={<Badge variant="outline">{accounts.length} linked</Badge>}
                  description="Savings and deposit accounts linked to this member."
                  title="Linked Accounts"
                >
                  <AccountsTable accounts={accounts} totalBalance={totalBalance} />
                </SectionCard>

                <SectionCard
                  actions={<Badge variant="outline">{overviewTransactions.length} latest</Badge>}
                  description="Most recent transaction requests in this member timeline."
                  title="Recent Transactions"
                >
                  <TransactionsTable compact transactions={overviewTransactions} />
                </SectionCard>
              </div>
            </TabsContent>

            <TabsContent className="space-y-6" value="accounts">
              <SectionCard
                actions={<Badge variant="outline">{accounts.length} accounts</Badge>}
                description="Full account registry for this member, including live balances and portfolio share."
                title="Account Portfolio"
              >
                <AccountsTable accounts={accounts} totalBalance={totalBalance} />
              </SectionCard>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <SectionCard
                  description="Savings and deposit balances compared side-by-side."
                  title="Balance Distribution"
                >
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

                <SectionCard
                  description="Operational rollup for account ownership and balances."
                  title="Portfolio Snapshot"
                >
                  <div className="grid gap-3">
                    <SidebarMetric
                      helper="All linked member accounts."
                      label="Total Accounts"
                      value={accounts.length}
                    />
                    <SidebarMetric
                      helper="Combined live balance across linked accounts."
                      label="Total Balance"
                      value={prettyCurrency(totalBalance)}
                    />
                    <SidebarMetric
                      helper="Current active loan count tied to this member."
                      label="Active Loans"
                      value={member.activeLoanCount}
                    />
                  </div>
                </SectionCard>
              </div>
            </TabsContent>

            <TabsContent className="space-y-6" value="transactions">
              <SectionCard
                actions={<Badge variant="outline">{recentTransactions.length} records</Badge>}
                description="Latest transaction requests for this member with agent and account context."
                title="Transaction History"
              >
                <TransactionsTable transactions={recentTransactions} />
              </SectionCard>

              <div className="grid gap-6 xl:grid-cols-3">
                <SidebarMetric
                  helper="Requests waiting for approval or rejection."
                  label="Pending Queue"
                  value={member.pendingTransactions}
                />
                <SidebarMetric
                  helper="Timestamp of the latest recorded member request."
                  label="Latest Request"
                  value={latestTransactionDate ? prettyDate(latestTransactionDate) : "No activity"}
                />
                <SidebarMetric
                  helper="Current assigned agent for transaction handling."
                  label="Operating Agent"
                  value={member.agentName}
                />
              </div>
            </TabsContent>

            <TabsContent className="space-y-6" value="loans">
              <div className="grid gap-6 md:grid-cols-2">
                <SectionCard
                  description="Current credit exposure for this member."
                  title="Loan Position"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SidebarMetric
                      helper="Loans with remaining principal above zero."
                      label="Active Loans"
                      value={member.activeLoanCount}
                    />
                    <SidebarMetric
                      helper="Outstanding principal across live loans."
                      label="Outstanding Principal"
                      value={prettyCurrency(member.outstandingLoanBalance)}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  description="Credit context available on the member profile today."
                  title="Loan Workspace"
                >
                  <div className="grid gap-3">
                    <MemberMetaRow
                      icon={LandmarkIcon}
                      label="Borrowing Status"
                      value={
                        member.activeLoanCount > 0
                          ? `${member.activeLoanCount} active loan${member.activeLoanCount === 1 ? "" : "s"}`
                          : "No active loans"
                      }
                    />
                    <MemberMetaRow
                      icon={WalletCardsIcon}
                      label="Outstanding Balance"
                      value={prettyCurrency(member.outstandingLoanBalance)}
                    />
                  </div>
                </SectionCard>
              </div>
            </TabsContent>

            <TabsContent className="space-y-6" value="security">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <SectionCard
                  description="Generate a new temporary password for this member. The password must be changed at next login and any existing transaction PIN setup stays unchanged."
                  title="Reset Login Password"
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

                <SectionCard
                  description="Operational context for access and identity management."
                  title="Access Notes"
                >
                  <div className="grid gap-3">
                    <MemberMetaRow
                      icon={ShieldCheckIcon}
                      label="Access Scope"
                      value={role === "admin" ? "Admin-managed member profile" : "Branch-managed member profile"}
                    />
                    <MemberMetaRow
                      icon={PhoneIcon}
                      label="Recovery Contact"
                      value={member.phone}
                    />
                    <MemberMetaRow
                      icon={Building2Icon}
                      label="Branch Ownership"
                      value={member.branchName}
                    />
                  </div>
                </SectionCard>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminShell>
  );
}
