import Link from "next/link";

import {
  approveTransactionRequestAction,
  rejectTransactionRequestAction,
} from "../actions";
import { SectionCard } from "../../components/section-card";
import { AdminShell } from "../../components/admin-shell";
import {
  getTransactionQueuePageData,
  type TransactionPageFilters,
} from "../../lib/dashboard-data";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { prettyCurrency } from "../../lib/format";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "../../components/ui/native-select";
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

function TransactionResultNotice({
  detail,
  result,
}: {
  detail?: string;
  result?: string;
}) {
  if (!result) {
    return null;
  }

  const isError = result === "error";
  const message =
    detail ??
    (isError
      ? "The transaction action failed."
      : result === "approved"
        ? "Transaction approved and posted to the ledger."
        : "Transaction rejected and preserved in history.");

  return <p className={isError ? "notice notice-error" : "notice notice-success"}>{message}</p>;
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
      <form className="space-y-5" method="get">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="type">Transaction type</label>
            <NativeSelect defaultValue={filters.type ?? ""} id="type" name="type">
              <NativeSelectOption value="">All types</NativeSelectOption>
              <NativeSelectOption value="deposit">Deposit</NativeSelectOption>
              <NativeSelectOption value="withdrawal">Withdrawal</NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <label htmlFor="accountType">Account type</label>
            <NativeSelect defaultValue={filters.accountType ?? ""} id="accountType" name="accountType">
              <NativeSelectOption value="">All accounts</NativeSelectOption>
              <NativeSelectOption value="savings">Savings</NativeSelectOption>
              <NativeSelectOption value="deposit">Deposit</NativeSelectOption>
            </NativeSelect>
          </div>

          {isAdmin ? (
            <div className="space-y-2">
              <label htmlFor="branchId">Branch</label>
              <NativeSelect defaultValue={filters.branchId ?? ""} id="branchId" name="branchId">
                <NativeSelectOption value="">All branches</NativeSelectOption>
                {branches.map((branch) => (
                  <NativeSelectOption key={branch.id} value={branch.id}>
                    {branch.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="branchScope">Branch</label>
              <Input disabled id="branchScope" value={branchLabel} />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="agentId">Agent</label>
            <NativeSelect defaultValue={filters.agentId ?? ""} id="agentId" name="agentId">
              <NativeSelectOption value="">All agents</NativeSelectOption>
              {agents.map((agent) => (
                <NativeSelectOption key={agent.id} value={agent.id}>
                  {agent.fullName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="actions">
          <Button type="submit">Apply Filters</Button>
          <Link className="button-secondary" href="/transactions">
            Clear Filters
          </Link>
        </div>
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
    <table className="table">
      <thead>
        <tr>
          <th>Reference</th>
          <th>Submitted</th>
          <th>Branch</th>
          <th>Member</th>
          <th>Account</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Agent</th>
          <th>Status</th>
          {showActions ? <th>Action</th> : null}
        </tr>
      </thead>
      <tbody>
        {transactions.length ? (
          transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>{transaction.id.toUpperCase()}</td>
              <td>{prettyDateTime(transaction.createdAt)}</td>
              <td>{transaction.branchName}</td>
              <td>{transaction.memberName}</td>
              <td>{transaction.accountType}</td>
              <td>{transaction.type}</td>
              <td>{prettyCurrency(transaction.amount)}</td>
              <td>{transaction.agentName}</td>
              <td>
                <span className="chip">{transaction.status}</span>
              </td>
              {showActions ? (
                <td>
                  <div className="table-actions">
                    <form action={approveTransactionRequestAction}>
                      <input name="requestId" type="hidden" value={transaction.id} />
                      <button className="button table-button" type="submit">
                        Approve
                      </button>
                    </form>
                    <form action={rejectTransactionRequestAction}>
                      <input name="requestId" type="hidden" value={transaction.id} />
                      <button className="button-secondary table-button" type="submit">
                        Reject
                      </button>
                    </form>
                  </div>
                </td>
              ) : null}
            </tr>
          ))
        ) : (
          <tr>
            <td className="muted" colSpan={showActions ? 10 : 9}>
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
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
      {!showClosedDrawerModal ? <TransactionResultNotice detail={detail} result={result} /> : null}
      <div className="actions">
        <Link className="button" href="/transactions/deposit">
          New Deposit
        </Link>
        <Link className="button-secondary" href="/transactions/withdrawal">
          New Withdrawal
        </Link>
      </div>

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
