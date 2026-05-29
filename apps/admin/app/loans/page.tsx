import Link from "next/link";
import type { Route } from "next";
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  PlusIcon,
  SearchIcon,
  WalletCardsIcon,
} from "lucide-react";

import {
  approveLoanApplicationAction,
  createLoanApplicationAction,
  rejectLoanApplicationAction,
  startLoanApplicationReviewAction,
} from "../actions";
import { AdminFieldGrid, AdminFormField } from "../../components/admin-form-field";
import { AdminShell } from "../../components/admin-shell";
import { AdminTableEmptyRow, AdminTableFrame } from "../../components/admin-table";
import { ResultNotice } from "../../components/notice";
import { SectionCard } from "../../components/section-card";
import { StatCard } from "../../components/stat-card";
import { StatusBadge } from "../../components/status-badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { NativeSelect, NativeSelectOption } from "../../components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Textarea } from "../../components/ui/textarea";
import { breadcrumb, withDashboardBreadcrumbs } from "../../lib/breadcrumbs";
import { getLoansPageData, type LoanRegistryRow } from "../../lib/dashboard-data";
import { prettyCurrency } from "../../lib/format";
import { getAdminTransactionPageContext } from "../../lib/onboarding-data";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function prettyDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function percentLabel(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function loanStatusFilterMatches(loan: LoanRegistryRow, status?: string | null) {
  if (!status || status === "all") {
    return true;
  }

  if (status === "overdue") {
    return loan.isOverdue;
  }

  return loan.status === status;
}

function getRiskClassName(riskLabel: LoanRegistryRow["riskLabel"]) {
  if (riskLabel === "High") {
    return "border-destructive/20 bg-destructive/10 text-destructive dark:text-destructive";
  }

  if (riskLabel === "Medium") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

export default async function LoansPage({
  searchParams,
}: {
  searchParams?: Promise<{
    branchId?: string | string[];
    detail?: string | string[];
    q?: string | string[];
    result?: string | string[];
    status?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const context = await getAdminTransactionPageContext();
  const { applications, isLive, loans, summary } = await getLoansPageData();
  const role = context.profile.role === "admin" ? "admin" : "branch_manager";
  const detail = firstParam(params?.detail);
  const result = firstParam(params?.result);
  const query = firstParam(params?.q)?.trim() ?? "";
  const selectedStatus = firstParam(params?.status) ?? "all";
  const selectedBranchId = firstParam(params?.branchId) ?? "all";
  const branchOptions = Array.from(
    new Map(
      loans
        .map((loan) => [loan.branchId, loan.branchName] as const)
        .concat(applications.map((application) => [application.branchId, application.branchName] as const)),
    ),
  ).map(([id, name]) => ({ id, name }));
  const normalizedQuery = query.toLowerCase();
  const filteredLoans = loans.filter((loan) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [loan.id, loan.memberName, loan.branchName, loan.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesBranch = selectedBranchId === "all" || loan.branchId === selectedBranchId;

    return matchesQuery && matchesBranch && loanStatusFilterMatches(loan, selectedStatus);
  });
  const upcomingLoans = loans
    .filter((loan) => loan.isOverdue || loan.riskLabel === "Medium")
    .sort((left, right) => new Date(left.nextDueAt).getTime() - new Date(right.nextDueAt).getTime())
    .slice(0, 5);

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Loans")])}
      currentBranchLabel={context.currentBranchLabel}
      currentUserName={context.profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Loan Overview"
      subtitle="Monitor portfolio health, overdue loans, and upcoming repayments from one overview."
    >
      <ResultNotice
        detail={detail}
        errorFallback="Something went wrong while processing the loan workflow."
        result={result}
        successFallback="Loan workflow updated."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          description="Approved principal across the current branch scope."
          icon={CircleDollarSignIcon}
          label="Total Portfolio"
          value={prettyCurrency(summary.totalPortfolio)}
        />
        <StatCard
          description="Principal still outstanding across active loans."
          icon={WalletCardsIcon}
          label="Outstanding"
          value={prettyCurrency(summary.outstandingPrincipal)}
        />
        <StatCard
          description="Loans with repayment dates already past due."
          icon={AlertTriangleIcon}
          label="Overdue Loans"
          tone={summary.overdueLoans > 0 ? "danger" : "success"}
          value={String(summary.overdueLoans)}
        />
        <StatCard
          description="Loans with a payment expected in the next seven days."
          icon={CalendarClockIcon}
          label="Due This Week"
          tone={summary.dueThisWeek > 0 ? "warning" : "success"}
          value={String(summary.dueThisWeek)}
        />
        <StatCard
          description="Estimated interest expected on next scheduled payments."
          icon={CheckCircle2Icon}
          label="Interest Due"
          value={prettyCurrency(summary.interestDue)}
        />
      </div>

      <SectionCard
        title="Portfolio Filters"
        description="Filter the overview before opening an individual loan workspace."
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]" method="get">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search loans"
                className="pl-9"
                defaultValue={query}
                name="q"
                placeholder="Search by member, loan ID, branch, or status"
              />
            </div>
            <NativeSelect aria-label="Status filter" defaultValue={selectedStatus} name="status">
              <NativeSelectOption value="all">All statuses</NativeSelectOption>
              <NativeSelectOption value="active">Active</NativeSelectOption>
              <NativeSelectOption value="disbursed">Disbursed</NativeSelectOption>
              <NativeSelectOption value="approved">Approved</NativeSelectOption>
              <NativeSelectOption value="overdue">Overdue</NativeSelectOption>
              <NativeSelectOption value="closed">Closed</NativeSelectOption>
            </NativeSelect>
            <NativeSelect aria-label="Branch filter" defaultValue={selectedBranchId} name="branchId">
              <NativeSelectOption value="all">All branches</NativeSelectOption>
              {branchOptions.map((branch) => (
                <NativeSelectOption key={branch.id} value={branch.id}>
                  {branch.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button type="submit">Apply Filters</Button>
          </form>

          <Sheet>
            <SheetTrigger asChild>
              <Button className="justify-center xl:min-w-44" type="button">
                <PlusIcon />
                Create Application
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
              <SheetHeader className="border-b border-border/60 px-6 py-5">
                <SheetTitle>Create Application</SheetTitle>
                <SheetDescription>
                  Capture a member request without leaving the loan overview.
                </SheetDescription>
              </SheetHeader>
              <form action={createLoanApplicationAction} className="space-y-5 px-6 py-2">
                <AdminFieldGrid className="md:grid-cols-1">
                  <AdminFormField htmlFor="memberProfileId" label="Member">
                    <NativeSelect defaultValue="" id="memberProfileId" name="memberProfileId" required>
                      <NativeSelectOption disabled value="">
                        Select member
                      </NativeSelectOption>
                      {context.members.map((member) => (
                        <NativeSelectOption key={member.id} value={member.id}>
                          {member.fullName} · {member.branchName}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </AdminFormField>

                  <AdminFormField htmlFor="requestedAmount" label="Requested amount">
                    <Input
                      id="requestedAmount"
                      min="0.01"
                      name="requestedAmount"
                      placeholder="80000"
                      required
                      step="0.01"
                      type="number"
                    />
                  </AdminFormField>

                  <AdminFormField htmlFor="monthlyInterestRate" label="Monthly interest rate">
                    <Input
                      id="monthlyInterestRate"
                      min="0"
                      name="monthlyInterestRate"
                      placeholder="0.03"
                      required
                      step="0.000001"
                      type="number"
                    />
                  </AdminFormField>

                  <AdminFormField htmlFor="termMonths" label="Term (months)">
                    <Input id="termMonths" min="1" name="termMonths" placeholder="12" required step="1" type="number" />
                  </AdminFormField>

                  <AdminFormField htmlFor="collateralRequired" label="Collateral required">
                    <NativeSelect defaultValue="false" id="collateralRequired" name="collateralRequired">
                      <NativeSelectOption value="false">No</NativeSelectOption>
                      <NativeSelectOption value="true">Yes</NativeSelectOption>
                    </NativeSelect>
                  </AdminFormField>

                  <AdminFormField htmlFor="branchScope" label="Branch scope">
                    <Input disabled id="branchScope" value={context.currentBranchLabel} />
                  </AdminFormField>
                </AdminFieldGrid>

                <AdminFormField htmlFor="collateralNotes" label="Collateral notes">
                  <Textarea
                    id="collateralNotes"
                    name="collateralNotes"
                    placeholder="Describe collateral details or supporting documents when required."
                  />
                </AdminFormField>

                <AdminFormField htmlFor="note" label="Application note">
                  <Textarea id="note" name="note" placeholder="Optional branch-office review context." />
                </AdminFormField>

                <SheetFooter className="px-0 pb-0">
                  <Button type="submit">Create Loan Application</Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <SectionCard
          title="Loan Portfolio"
          description="Each row opens a dedicated page for schedule, repayments, and loan actions."
        >
          <AdminTableFrame>
            <Table className="min-w-[1040px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead>Interest Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.length ? (
                  filteredLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">
                        {loan.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>{loan.memberName}</TableCell>
                      <TableCell>{loan.branchName}</TableCell>
                      <TableCell>{prettyCurrency(loan.approvedPrincipal)}</TableCell>
                      <TableCell>{prettyCurrency(loan.remainingPrincipal)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{loan.nextDueLabel}</span>
                          <span className="text-xs text-muted-foreground">
                            Payment #{loan.repaymentCount + 1}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{prettyCurrency(loan.nextInterestDue)}</TableCell>
                      <TableCell>
                        <StatusBadge>{loan.status}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge className={getRiskClassName(loan.riskLabel)}>
                          {loan.riskLabel}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/loans/${loan.id}` as Route}>Open Loan</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <AdminTableEmptyRow
                    colSpan={10}
                    description="No loans match the current overview filters."
                  />
                )}
              </TableBody>
            </Table>
          </AdminTableFrame>
        </SectionCard>

        <aside className="space-y-6">
          <SectionCard
            contentClassName="space-y-3 pt-5"
            title="Upcoming Payments"
            description="Overdue and near-term repayment work."
          >
            {upcomingLoans.length ? (
              upcomingLoans.map((loan) => (
                <Link
                  className="block rounded-xl border border-border/70 bg-background/70 p-4 transition hover:border-primary/50 hover:bg-primary/5"
                  href={`/loans/${loan.id}` as Route}
                  key={loan.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {loan.memberName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {loan.nextDueLabel} · {loan.branchName}
                      </p>
                    </div>
                    <StatusBadge className={getRiskClassName(loan.isOverdue ? "High" : "Medium")}>
                      {loan.isOverdue ? "Overdue" : "Due soon"}
                    </StatusBadge>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Interest due
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {prettyCurrency(loan.nextInterestDue)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No overdue or upcoming loan payments were found in the current scope.
              </p>
            )}
          </SectionCard>
        </aside>
      </div>

      <SectionCard
        title="Application Queue"
        description="Review submitted applications, approve principal, or reject with branch context."
      >
        <AdminTableFrame>
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Application ID</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Monthly Rate</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length ? (
                applications.map((application) => {
                  const actionable =
                    application.status === "application_submitted" ||
                    application.status === "under_review";

                  return (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">
                        {application.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>{prettyDateTime(application.createdAt)}</TableCell>
                      <TableCell>{application.memberName}</TableCell>
                      <TableCell>{application.branchName}</TableCell>
                      <TableCell>{prettyCurrency(application.requestedAmount)}</TableCell>
                      <TableCell>{percentLabel(application.monthlyInterestRate)}</TableCell>
                      <TableCell>{application.termMonths} months</TableCell>
                      <TableCell>
                        <StatusBadge>{application.status}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        {actionable ? (
                          <div className="space-y-3 min-w-[17rem]">
                            {application.status === "application_submitted" ? (
                              <form action={startLoanApplicationReviewAction}>
                                <input name="applicationId" type="hidden" value={application.id} />
                                <Button size="sm" type="submit">
                                  Mark In Review
                                </Button>
                              </form>
                            ) : null}

                            <form action={approveLoanApplicationAction} className="space-y-2">
                              <input name="applicationId" type="hidden" value={application.id} />
                              <Input
                                aria-label={`Approved principal for ${application.memberName}`}
                                defaultValue={application.requestedAmount.toFixed(2)}
                                min="0.01"
                                name="approvedPrincipal"
                                step="0.01"
                                type="number"
                              />
                              <Textarea
                                aria-label={`Approval note for ${application.memberName}`}
                                name="note"
                                placeholder="Optional approval note."
                              />
                              <Button size="sm" type="submit">
                                Approve Application
                              </Button>
                            </form>

                            <form action={rejectLoanApplicationAction} className="space-y-2">
                              <input name="applicationId" type="hidden" value={application.id} />
                              <Textarea
                                aria-label={`Rejection note for ${application.memberName}`}
                                name="note"
                                placeholder="Optional rejection note."
                              />
                              <Button size="sm" type="submit" variant="outline">
                                Reject Application
                              </Button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No further action on this application.
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <AdminTableEmptyRow
                  colSpan={9}
                  description="No loan applications have been submitted yet."
                />
              )}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </SectionCard>

    </AdminShell>
  );
}
