import { cookies } from "next/headers";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowUpRightIcon,
  BadgeDollarSignIcon,
  Building2Icon,
  Clock3Icon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react";

import { ActivityTrendChart, ChartBars } from "../../../components/chart-bars";
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
import { getAgentDetailPageData } from "../../../lib/dashboard-data";
import { prettyCurrency, prettyDate } from "../../../lib/format";
import type { PasswordResetFlash } from "../../../lib/password-reset";

type AgentDetailMember = Awaited<
  ReturnType<typeof getAgentDetailPageData>
>["members"][number];

type AgentDetailTransaction = Awaited<
  ReturnType<typeof getAgentDetailPageData>
>["recentTransactions"][number];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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

function AssignedMembersTable({ members }: { members: AgentDetailMember[] }) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No members are assigned to this agent yet.
      </p>
    );
  }

  return (
    <Table className="min-w-[820px]">
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Occupation</TableHead>
          <TableHead>Address</TableHead>
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
            <TableCell>
              <StatusBadge>{member.status}</StatusBadge>
            </TableCell>
            <TableCell>{member.occupation ?? "No occupation"}</TableCell>
            <TableCell className="max-w-[240px] truncate text-muted-foreground">
              {member.address ?? "No address"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TransactionsTable({
  compact = false,
  transactions,
}: {
  compact?: boolean;
  transactions: AgentDetailTransaction[];
}) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No transactions have been recorded for this agent yet.
      </p>
    );
  }

  return (
    <Table className={compact ? "min-w-[720px]" : "min-w-[920px]"}>
      <TableHeader>
        <TableRow>
          <TableHead>Reference</TableHead>
          {!compact ? <TableHead>Date</TableHead> : null}
          <TableHead>Member</TableHead>
          <TableHead>Type</TableHead>
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
            <TableCell>
              <Link className="underline-offset-4 hover:underline" href={`/members/${transaction.memberId}`}>
                {transaction.memberName}
              </Link>
            </TableCell>
            <TableCell>{formatTransactionType(transaction.type)}</TableCell>
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

  if (!agent) {
    return (
      <AdminShell
        breadcrumbs={withDashboardBreadcrumbs(role, [
          breadcrumb("People"),
          breadcrumb("Agents", "/agents"),
          breadcrumb("Agent Detail"),
        ])}
        currentBranchLabel={currentBranchLabel}
        currentUserName={profile.full_name}
        role={role}
        statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
        title="Agent Detail"
        subtitle="Profile context, assigned member relationships, and recent field activity for one agent."
      >
        <SectionCard title="Agent not found">
          <p className="text-sm text-muted-foreground">
            No live agent record matches this route or your current branch scope.
          </p>
        </SectionCard>
      </AdminShell>
    );
  }

  const overviewTransactions = recentTransactions.slice(0, 6);
  const latestTransactionDate = recentTransactions[0]?.createdAt ?? null;
  const activeMembers = members.filter((member) => member.status === "active").length;

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [
        breadcrumb("People"),
        breadcrumb("Agents", "/agents"),
        breadcrumb(agent.fullName),
      ])}
      currentBranchLabel={agent.branchName ?? currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title={agent.fullName}
      subtitle="Profile context, assigned member relationships, and recent field activity for one agent."
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <Card className="border border-border/70 bg-card/95 shadow-sm xl:sticky xl:top-24">
            <CardContent className="space-y-6 pt-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                  {getInitials(agent.fullName)}
                </div>
                <StatusBadge>{agent.status}</StatusBadge>
              </div>

              <div className="space-y-3">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {agent.fullName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Agent workspace with member coverage, collections, and access controls.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Agent</Badge>
                  <Badge variant="outline">{members.length} members</Badge>
                  <Badge variant="outline">{agent.pendingApprovals} pending</Badge>
                </div>
              </div>

              <div className="grid gap-3">
                <MemberMetaRow
                  icon={Building2Icon}
                  label="Branch"
                  value={agent.branchName}
                />
                <MemberMetaRow
                  icon={PhoneIcon}
                  label="Phone"
                  value={agent.phone}
                />
                <MemberMetaRow
                  icon={UsersIcon}
                  label="Assigned Members"
                  value={`${agent.assignedMemberCount} active relationships`}
                />
                <MemberMetaRow
                  icon={BadgeDollarSignIcon}
                  label="Collections Total"
                  value={prettyCurrency(agent.collectionsTotal)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SidebarMetric
                  helper="Latest recorded transaction handled by this agent."
                  label="Last Activity"
                  value={latestTransactionDate ? prettyDate(latestTransactionDate) : "No activity"}
                />
                <SidebarMetric
                  helper="Members currently marked active under this agent."
                  label="Active Members"
                  value={activeMembers}
                />
              </div>

              <ActionBar>
                <Button asChild className="w-full justify-between" variant="outline">
                  <Link href="/agents">
                    Back to Agents
                    <ArrowUpRightIcon />
                  </Link>
                </Button>
                <Button asChild className="w-full justify-between" variant="outline">
                  <Link href="/transactions">
                    Open Transactions
                    <ArrowUpRightIcon />
                  </Link>
                </Button>
              </ActionBar>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
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

          <Tabs className="gap-6" defaultValue="overview">
            <TabsList
              className="w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card/95 p-2"
              variant="line"
            >
              <TabsTrigger className="px-3 py-1.5" value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="members">
                Members
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="transactions">
                Transactions
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="performance">
                Performance
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="security">
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-6" value="overview">
              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <SectionCard
                  description="Deposit and withdrawal activity for the most recent seven days."
                  title="Collections Trend"
                >
                  {recentTransactions.length ? (
                    <ActivityTrendChart data={activityTrend} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No recent transaction activity is available for this agent yet.
                    </p>
                  )}
                </SectionCard>

                <SectionCard
                  description="Quick view of member coverage and approval pressure."
                  title="Activity Snapshot"
                >
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
                <SectionCard
                  actions={<Badge variant="outline">{members.length} assigned</Badge>}
                  description="Members currently assigned to this agent."
                  title="Assigned Members"
                >
                  <AssignedMembersTable members={members.slice(0, 6)} />
                </SectionCard>

                <SectionCard
                  actions={<Badge variant="outline">{overviewTransactions.length} latest</Badge>}
                  description="Latest transaction requests handled by this agent."
                  title="Recent Transactions"
                >
                  <TransactionsTable compact transactions={overviewTransactions} />
                </SectionCard>
              </div>
            </TabsContent>

            <TabsContent className="space-y-6" value="members">
              <SectionCard
                actions={<Badge variant="outline">{members.length} members</Badge>}
                description="Full member coverage table for this field agent."
                title="Member Coverage"
              >
                <AssignedMembersTable members={members} />
              </SectionCard>

              <div className="grid gap-6 xl:grid-cols-3">
                <SidebarMetric
                  helper="Members currently assigned under this agent."
                  label="Assigned Count"
                  value={agent.assignedMemberCount}
                />
                <SidebarMetric
                  helper="Active member profiles inside this assignment set."
                  label="Active Member Count"
                  value={activeMembers}
                />
                <SidebarMetric
                  helper="Members requiring attention due to non-active status."
                  label="Attention Needed"
                  value={Math.max(agent.assignedMemberCount - activeMembers, 0)}
                />
              </div>
            </TabsContent>

            <TabsContent className="space-y-6" value="transactions">
              <SectionCard
                actions={<Badge variant="outline">{recentTransactions.length} records</Badge>}
                description="Full transaction history for requests created by this agent."
                title="Transaction History"
              >
                <TransactionsTable transactions={recentTransactions} />
              </SectionCard>

              <div className="grid gap-6 xl:grid-cols-3">
                <SidebarMetric
                  helper="Requests still waiting for review."
                  label="Pending Queue"
                  value={agent.pendingApprovals}
                />
                <SidebarMetric
                  helper="Combined total from recent requests shown on this page."
                  label="Recent Volume"
                  value={prettyCurrency(agent.collectionsTotal)}
                />
                <SidebarMetric
                  helper="Collections created on the current business date."
                  label="Today"
                  value={prettyCurrency(agent.collectionsToday)}
                />
              </div>
            </TabsContent>

            <TabsContent className="space-y-6" value="performance">
              <div className="grid gap-6 md:grid-cols-2">
                <SectionCard
                  description="Operational metrics for this agent's current workload."
                  title="Performance Snapshot"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SidebarMetric
                      helper="Total assigned member relationships."
                      label="Member Load"
                      value={agent.assignedMemberCount}
                    />
                    <SidebarMetric
                      helper="Requests still waiting to be processed."
                      label="Approval Pressure"
                      value={agent.pendingApprovals}
                    />
                    <SidebarMetric
                      helper="Collections created today."
                      label="Collections Today"
                      value={prettyCurrency(agent.collectionsToday)}
                    />
                    <SidebarMetric
                      helper="Current cash variance across today's drawer records."
                      label="Cash Variance"
                      value={prettyCurrency(agent.cashVariance)}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  description="Field operations context for branch and member management."
                  title="Operations Notes"
                >
                  <div className="grid gap-3">
                    <MemberMetaRow
                      icon={Building2Icon}
                      label="Branch Ownership"
                      value={agent.branchName}
                    />
                    <MemberMetaRow
                      icon={Clock3Icon}
                      label="Latest Activity"
                      value={latestTransactionDate ? prettyDate(latestTransactionDate) : "No activity"}
                    />
                    <MemberMetaRow
                      icon={WalletCardsIcon}
                      label="Collections Total"
                      value={prettyCurrency(agent.collectionsTotal)}
                    />
                  </div>
                </SectionCard>
              </div>
            </TabsContent>

            <TabsContent className="space-y-6" value="security">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <SectionCard
                  description="Generate a new temporary password for this agent. The password must be changed at next login and the current transaction PIN stays unchanged."
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
                    <input name="targetProfileId" type="hidden" value={agent.id} />
                    <input name="targetRole" type="hidden" value="agent" />
                    <ActionBar>
                      <Button type="submit" variant="outline">
                        Reset Login Password
                      </Button>
                    </ActionBar>
                  </form>
                </SectionCard>

                <SectionCard
                  description="Operational context for identity and access management."
                  title="Access Notes"
                >
                  <div className="grid gap-3">
                    <MemberMetaRow
                      icon={ShieldCheckIcon}
                      label="Access Scope"
                      value={role === "admin" ? "Admin-managed agent profile" : "Branch-managed agent profile"}
                    />
                    <MemberMetaRow
                      icon={PhoneIcon}
                      label="Recovery Contact"
                      value={agent.phone}
                    />
                    <MemberMetaRow
                      icon={MapPinIcon}
                      label="Branch Assignment"
                      value={agent.branchName}
                    />
                    <MemberMetaRow
                      icon={UserRoundIcon}
                      label="Coverage"
                      value={`${agent.assignedMemberCount} assigned members`}
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
