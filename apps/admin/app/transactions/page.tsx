import Link from "next/link";
import {
  ArrowRightLeftIcon,
  BanknoteArrowDownIcon,
  BanknoteArrowUpIcon,
  Building2Icon,
  Clock3Icon,
  FilterIcon,
  LandmarkIcon,
  ScanSearchIcon,
  UserRoundIcon,
} from "lucide-react";

import {
  approveTransactionRequestAction,
  rejectTransactionRequestAction,
} from "../actions";
import { ActionBar } from "../../components/action-bar";
import { AdminFieldGrid, AdminFormField } from "../../components/admin-form-field";
import { SectionCard } from "../../components/section-card";
import { AdminShell } from "../../components/admin-shell";
import { AdminTableEmptyRow, AdminTableFrame } from "../../components/admin-table";
import {
  getTransactionQueuePageData,
  type TransactionPageFilters,
} from "../../lib/dashboard-data";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { prettyCurrency } from "../../lib/format";
import { ResultNotice } from "../../components/notice";
import { StatusBadge } from "../../components/status-badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "../../components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { ClosedDrawerApprovalModal } from "../../components/closed-drawer-approval-modal";
import { StatCard } from "../../components/stat-card";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function isDrawerStatus(value?: string): value is "closed" | "pending_review" {
  return value === "closed" || value === "pending_review";
}

function isTransactionType(value?: string): value is "deposit" | "withdrawal" {
  return value === "deposit" || value === "withdrawal";
}

function toFilters(
  params?: {
    accountType?: string | string[];
    agentId?: string | string[];
    branchId?: string | string[];
    detail?: string | string[];
    result?: string | string[];
    type?: string | string[];
  },
): TransactionPageFilters {
  const type = firstParam(params?.type);
  const accountType = firstParam(params?.accountType);
  const branchId = firstParam(params?.branchId);
  const agentId = firstParam(params?.agentId);

  return {
    accountType:
      accountType === "savings" || accountType === "deposit"
        ? accountType
        : undefined,
    agentId: agentId || undefined,
    branchId: branchId || undefined,
    type: type === "deposit" || type === "withdrawal" ? type : undefined,
  };
}

function prettyDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTransactionType(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAccountType(value: "savings" | "deposit") {
  return value === "savings" ? "Savings" : "Deposit";
}

function getFilterLabel({
  agents,
  branches,
  branchLabel,
  filters,
  isAdmin,
}: {
  agents: Array<{ id: string; fullName: string }>;
  branches: Array<{ id: string; name: string }>;
  branchLabel: string;
  filters: TransactionPageFilters;
  isAdmin: boolean;
}) {
  const branchName = filters.branchId
    ? branches.find((branch) => branch.id === filters.branchId)?.name ?? "Selected branch"
    : isAdmin
      ? "All branches"
      : branchLabel;
  const agentName = filters.agentId
    ? agents.find((agent) => agent.id === filters.agentId)?.fullName ?? "Selected agent"
    : "All agents";
  const typeLabel = filters.type ? formatTransactionType(filters.type) : "All types";
  const accountLabel = filters.accountType ? formatAccountType(filters.accountType) : "All accounts";

  return { accountLabel, agentName, branchName, typeLabel };
}

function summarizeTransactions(
  transactions: Awaited<ReturnType<typeof getTransactionQueuePageData>>["pendingTransactions"],
) {
  const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const latestAt = transactions[0]?.createdAt ?? null;
  const depositCount = transactions.filter((transaction) => transaction.type === "deposit").length;
  const withdrawalCount = transactions.filter(
    (transaction) => transaction.type === "withdrawal",
  ).length;

  return {
    count: transactions.length,
    depositCount,
    latestAt,
    totalAmount,
    withdrawalCount,
  };
}

function ScopeChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2Icon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="text-sm font-medium text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function FilterDock({
  agents,
  branchLabel,
  branches,
  filters,
  isAdmin,
}: {
  agents: Array<{ id: string; fullName: string }>;
  branchLabel: string;
  branches: Array<{ id: string; name: string }>;
  filters: TransactionPageFilters;
  isAdmin: boolean;
}) {
  const { accountLabel, agentName, branchName, typeLabel } = getFilterLabel({
    agents,
    branches,
    branchLabel,
    filters,
    isAdmin,
  });

  return (
    <SectionCard
      className="mb-4 border border-border/70 bg-card/95 shadow-sm xl:mb-6"
      contentClassName="space-y-6 pt-6"
      description="One shared control surface for the approval queue and the posted ledger below."
      title="Command Filters"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ScopeChip icon={ArrowRightLeftIcon} label="Transaction Type" value={typeLabel} />
        <ScopeChip icon={LandmarkIcon} label="Account Type" value={accountLabel} />
        <ScopeChip icon={Building2Icon} label="Branch Scope" value={branchName} />
        <ScopeChip icon={UserRoundIcon} label="Agent Scope" value={agentName} />
      </div>

      <form className="space-y-6" method="get">
        <AdminFieldGrid className="gap-y-5 xl:grid-cols-4">
          <AdminFormField htmlFor="type" label="Transaction type">
            <NativeSelect defaultValue={filters.type ?? ""} id="type" name="type">
              <NativeSelectOption value="">All types</NativeSelectOption>
              <NativeSelectOption value="deposit">Deposit</NativeSelectOption>
              <NativeSelectOption value="withdrawal">Withdrawal</NativeSelectOption>
            </NativeSelect>
          </AdminFormField>

          <AdminFormField htmlFor="accountType" label="Account type">
            <NativeSelect defaultValue={filters.accountType ?? ""} id="accountType" name="accountType">
              <NativeSelectOption value="">All accounts</NativeSelectOption>
              <NativeSelectOption value="savings">Savings</NativeSelectOption>
              <NativeSelectOption value="deposit">Deposit</NativeSelectOption>
            </NativeSelect>
          </AdminFormField>

          {isAdmin ? (
            <AdminFormField htmlFor="branchId" label="Branch">
              <NativeSelect defaultValue={filters.branchId ?? ""} id="branchId" name="branchId">
                <NativeSelectOption value="">All branches</NativeSelectOption>
                {branches.map((branch) => (
                  <NativeSelectOption key={branch.id} value={branch.id}>
                    {branch.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </AdminFormField>
          ) : (
            <AdminFormField htmlFor="branchScope" label="Branch">
              <Input disabled id="branchScope" value={branchLabel} />
            </AdminFormField>
          )}

          <AdminFormField htmlFor="agentId" label="Agent">
            <NativeSelect defaultValue={filters.agentId ?? ""} id="agentId" name="agentId">
              <NativeSelectOption value="">All agents</NativeSelectOption>
              {agents.map((agent) => (
                <NativeSelectOption key={agent.id} value={agent.id}>
                  {agent.fullName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </AdminFormField>
        </AdminFieldGrid>

        <ActionBar>
          <Button type="submit">
            <FilterIcon />
            Apply Filters
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions">Clear Filters</Link>
          </Button>
        </ActionBar>
      </form>
    </SectionCard>
  );
}

function TransactionTable({
  emptyMessage,
  showActions,
  transactions,
}: {
  emptyMessage: string;
  showActions: boolean;
  transactions: Awaited<ReturnType<typeof getTransactionQueuePageData>>["pendingTransactions"];
}) {
  return (
    <AdminTableFrame className="border-border/60 bg-card/90">
      <Table className="min-w-[1080px]">
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Member</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Status</TableHead>
            {showActions ? <TableHead>Action</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length ? (
            transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {transaction.id.slice(0, 8).toUpperCase()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {prettyDateTime(transaction.createdAt)}
                </TableCell>
                <TableCell>{transaction.branchName}</TableCell>
                <TableCell>
                  <Link className="underline-offset-4 hover:underline" href={`/members/${transaction.memberId}`}>
                    {transaction.memberName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{formatAccountType(transaction.accountType)}</Badge>
                </TableCell>
                <TableCell>{formatTransactionType(transaction.type)}</TableCell>
                <TableCell className="text-right font-medium">
                  {prettyCurrency(transaction.amount)}
                </TableCell>
                <TableCell>{transaction.agentName}</TableCell>
                <TableCell>
                  <StatusBadge>{transaction.status}</StatusBadge>
                </TableCell>
                {showActions ? (
                  <TableCell>
                    <ActionBar>
                      <form action={approveTransactionRequestAction}>
                        <input name="requestId" type="hidden" value={transaction.id} />
                        <Button size="sm" type="submit">
                          Approve
                        </Button>
                      </form>
                      <form action={rejectTransactionRequestAction}>
                        <input name="requestId" type="hidden" value={transaction.id} />
                        <Button size="sm" type="submit" variant="outline">
                          Reject
                        </Button>
                      </form>
                    </ActionBar>
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          ) : (
            <AdminTableEmptyRow
              colSpan={showActions ? 10 : 9}
              description={emptyMessage}
            />
          )}
        </TableBody>
      </Table>
    </AdminTableFrame>
  );
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    accountType?: string | string[];
    agentId?: string | string[];
    branchId?: string | string[];
    businessDate?: string | string[];
    detail?: string | string[];
    drawerStatus?: string | string[];
    modal?: string | string[];
    nextApprovalAt?: string | string[];
    result?: string | string[];
    transactionType?: string | string[];
    type?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const filterValues = toFilters(params);
  const {
    agents,
    branchLabel,
    branches,
    filters,
    historyTransactions,
    isLive,
    pendingTransactions,
    profile,
  } = await getTransactionQueuePageData(filterValues);
  const result = firstParam(params?.result);
  const detail = firstParam(params?.detail);
  const modal = firstParam(params?.modal);
  const businessDate = firstParam(params?.businessDate);
  const drawerStatus = firstParam(params?.drawerStatus);
  const nextApprovalAt = firstParam(params?.nextApprovalAt);
  const transactionType = firstParam(params?.transactionType);
  const role = profile.role === "admin" ? "admin" : "branch_manager";
  const showClosedDrawerModal =
    modal === "drawer-closed" &&
    Boolean(businessDate) &&
    Boolean(nextApprovalAt) &&
    isDrawerStatus(drawerStatus) &&
    isTransactionType(transactionType);

  const pendingSummary = summarizeTransactions(pendingTransactions);
  const historySummary = summarizeTransactions(historyTransactions);
  const latestAt = pendingSummary.latestAt ?? historySummary.latestAt;

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Transactions")])}
      currentBranchLabel={branchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Transactions"
      subtitle="Approval operations, posted history, and filter controls are organized into one cleaner control room."
    >
      {showClosedDrawerModal && businessDate && nextApprovalAt ? (
        <ClosedDrawerApprovalModal
          businessDate={businessDate}
          drawerStatus={drawerStatus}
          nextApprovalAt={nextApprovalAt}
          transactionType={transactionType}
        />
      ) : null}

      {!showClosedDrawerModal ? (
        <ResultNotice
          detail={detail}
          errorFallback="The transaction action failed."
          result={result}
          successFallback={
            result === "approved"
              ? "Transaction approved and posted to the ledger."
              : "Transaction rejected and preserved in history."
          }
        />
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] xl:items-start">
        <Card className="border border-border/70 bg-card/95 shadow-sm">
          <CardContent className="space-y-8 pt-3">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Approval desk</Badge>
                  <Badge variant="outline">{profile.role === "admin" ? "Admin scope" : "Branch scope"}</Badge>
                  {latestAt ? <Badge variant="outline">Latest {prettyDateTime(latestAt)}</Badge> : null}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    Transaction Control Room
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Review pending cash movements, track posted history, and narrow the workspace without losing queue context.
                  </p>
                </div>
              </div>

              <ActionBar>
                <Button asChild>
                  <Link href="/transactions/deposit">
                    <BanknoteArrowUpIcon />
                    New Deposit
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/transactions/withdrawal">
                    <BanknoteArrowDownIcon />
                    New Withdrawal
                  </Link>
                </Button>
              </ActionBar>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ScopeChip
                icon={ScanSearchIcon}
                label="Pending Queue"
                value={`${pendingSummary.count} awaiting review`}
              />
              <ScopeChip
                icon={LandmarkIcon}
                label="Pending Volume"
                value={prettyCurrency(pendingSummary.totalAmount)}
              />
              <ScopeChip
                icon={ArrowRightLeftIcon}
                label="Posted History"
                value={`${historySummary.count} processed records`}
              />
              <ScopeChip
                icon={Clock3Icon}
                label="History Volume"
                value={prettyCurrency(historySummary.totalAmount)}
              />
            </div>
          </CardContent>
        </Card>

        <FilterDock
          agents={agents}
          branchLabel={branchLabel}
          branches={branches}
          filters={filters}
          isAdmin={profile.role === "admin"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          description="Requests still waiting for a branch or admin decision."
          label="Pending Approvals"
          tone="warning"
          value={String(pendingSummary.count)}
        />
        <StatCard
          description="Total amount currently blocked in the live approval queue."
          label="Queue Exposure"
          value={prettyCurrency(pendingSummary.totalAmount)}
        />
        <StatCard
          description="Scoped deposit requests across queue and posted history."
          label="Deposits In Scope"
          tone="success"
          value={String(pendingSummary.depositCount + historySummary.depositCount)}
        />
        <StatCard
          description="Scoped withdrawal requests across queue and posted history."
          label="Withdrawals In Scope"
          value={String(pendingSummary.withdrawalCount + historySummary.withdrawalCount)}
        />
      </div>

      <Tabs className="gap-8 pt-2" defaultValue="queue">
        <TabsList
          className="w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-border/80 bg-card p-2 shadow-sm"
          variant="line"
        >
          <TabsTrigger
            className="rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-foreground/80 data-active:border-border data-active:bg-background data-active:text-foreground data-active:shadow-sm"
            value="queue"
          >
            Pending Queue
          </TabsTrigger>
          <TabsTrigger
            className="rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-foreground/80 data-active:border-border data-active:bg-background data-active:text-foreground data-active:shadow-sm"
            value="history"
          >
            Posted History
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-8" value="queue">
          <SectionCard
            actions={<Badge variant="outline">{pendingSummary.count} live items</Badge>}
            contentClassName="pt-6"
            description="Agent-originated transactions still waiting for branch or admin review."
            title="Pending Approval Queue"
          >
            <TransactionTable
              emptyMessage="No pending transactions match the current filters."
              showActions
              transactions={pendingTransactions}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent className="space-y-8" value="history">
          <SectionCard
            actions={<Badge variant="outline">{historySummary.count} posted records</Badge>}
            contentClassName="pt-6"
            description="All scoped transaction records except the still-pending approval queue."
            title="Transaction History"
          >
            <TransactionTable
              emptyMessage="No transaction history matches the current filters."
              showActions={false}
              transactions={historyTransactions}
            />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}
