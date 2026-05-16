import Link from "next/link";

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
import { ClosedDrawerApprovalModal } from "../../components/closed-drawer-approval-modal";

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

function FilterForm({
  branchLabel,
  branches,
  filters,
  isAdmin,
  agents,
}: {
  agents: Array<{ id: string; fullName: string }>;
  branchLabel: string;
  branches: Array<{ id: string; name: string }>;
  filters: TransactionPageFilters;
  isAdmin: boolean;
}) {
  return (
    <SectionCard
      title="Filters"
      description="Narrow both the pending queue and full history with the same transaction filters."
    >
      <form method="get">
        <AdminFieldGrid className="mb-5 md:grid-cols-4">
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
          <Button type="submit">Apply Filters</Button>
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
    <AdminTableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Member</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Status</TableHead>
            {showActions ? <TableHead>Action</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
        {transactions.length ? (
          transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{transaction.id.toUpperCase()}</TableCell>
              <TableCell>{prettyDateTime(transaction.createdAt)}</TableCell>
              <TableCell>{transaction.branchName}</TableCell>
              <TableCell>{transaction.memberName}</TableCell>
              <TableCell>{transaction.accountType}</TableCell>
              <TableCell>{transaction.type}</TableCell>
              <TableCell>{prettyCurrency(transaction.amount)}</TableCell>
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

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Transactions")])}
      currentBranchLabel={branchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Transactions"
      subtitle="Pending approvals stay pinned at the top while full transaction history remains searchable below."
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
      <ActionBar>
        <Button asChild>
          <Link href="/transactions/deposit">New Deposit</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/transactions/withdrawal">New Withdrawal</Link>
        </Button>
      </ActionBar>

      <FilterForm
        agents={agents}
        branchLabel={branchLabel}
        branches={branches}
        filters={filters}
        isAdmin={profile.role === "admin"}
      />

      <SectionCard
        title="Pending Approval Queue"
        description="Agent-originated transactions still waiting for branch or admin review."
      >
        <TransactionTable
          emptyMessage="No pending transactions match the current filters."
          showActions
          transactions={pendingTransactions}
        />
      </SectionCard>

      <SectionCard
        title="Transaction History"
        description="All scoped transaction records except the still-pending approval queue above."
      >
        <TransactionTable
          emptyMessage="No transaction history matches the current filters."
          showActions={false}
          transactions={historyTransactions}
        />
      </SectionCard>
    </AdminShell>
  );
}
