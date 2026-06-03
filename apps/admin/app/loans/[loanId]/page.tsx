import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  Clock3Icon,
  FileTextIcon,
  HistoryIcon,
  LandmarkIcon,
  WalletCardsIcon,
} from "lucide-react";

import { disburseLoanAction, recordLoanRepaymentAction } from "../../actions";
import { ActionBar } from "../../../components/action-bar";
import { AdminFormField } from "../../../components/admin-form-field";
import { AdminShell } from "../../../components/admin-shell";
import { AdminTableEmptyRow, AdminTableFrame } from "../../../components/admin-table";
import { ResultNotice } from "../../../components/notice";
import { SectionCard } from "../../../components/section-card";
import { StatCard } from "../../../components/stat-card";
import { StatusBadge } from "../../../components/status-badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { NativeSelect, NativeSelectOption } from "../../../components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Textarea } from "../../../components/ui/textarea";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import {
  getLoanDetailPageData,
  type LoanScheduleRow,
} from "../../../lib/dashboard-data";
import { prettyCurrency } from "../../../lib/format";
import { getAdminTransactionPageContext } from "../../../lib/onboarding-data";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function percentLabel(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function statusClassName(value: string) {
  if (value === "Overdue" || value === "Paid late" || value === "High") {
    return "border-destructive/20 bg-destructive/10 text-destructive dark:text-destructive";
  }

  if (value === "Upcoming" || value === "Pending" || value === "Medium") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function ScheduleBadge({ state }: { state: LoanScheduleRow["state"] }) {
  return (
    <StatusBadge className={statusClassName(state)}>
      {state}
    </StatusBadge>
  );
}

export default async function LoanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ loanId: string }>;
  searchParams?: Promise<{ detail?: string | string[]; result?: string | string[] }>;
}) {
  const { loanId } = await params;
  const resolvedSearchParams = await searchParams;
  const detail = firstParam(resolvedSearchParams?.detail);
  const result = firstParam(resolvedSearchParams?.result);
  const context = await getAdminTransactionPageContext();
  const { auditEvents, currentBranchLabel, isLive, loan, profile, repayments, schedule } =
    await getLoanDetailPageData(loanId);
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  if (!loan) {
    return (
      <AdminShell
        breadcrumbs={withDashboardBreadcrumbs(role, [
          breadcrumb("Loans", "/loans"),
          breadcrumb("Loan Detail"),
        ])}
        currentBranchLabel={currentBranchLabel}
        currentUserName={profile.full_name}
        role={role}
        statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
        title="Loan Detail"
        subtitle="Manage a single loan workspace."
      >
        <SectionCard title="Loan not found">
          <p className="text-sm text-muted-foreground">
            No loan record matches this route or your current branch scope.
          </p>
          <ActionBar>
            <Button asChild variant="outline">
              <Link href="/loans">
                <ArrowLeftIcon />
                Back to Loans
              </Link>
            </Button>
          </ActionBar>
        </SectionCard>
      </AdminShell>
    );
  }

  const returnTo = `/loans/${loan.id}`;
  const branchAgents = context.agents.filter((agent) => agent.branchId === loan.branchId);
  const canDisburse = loan.status === "approved";
  const canRepay =
    loan.status === "disbursed" ||
    loan.status === "active" ||
    loan.status === "defaulted";
  const loanReference = loan.id.slice(0, 8).toUpperCase();
  const nextScheduleRow = schedule.find((row) => row.state === "Upcoming" || row.state === "Overdue");

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [
        breadcrumb("Loans", "/loans"),
        breadcrumb(loanReference),
      ])}
      currentBranchLabel={loan.branchName ?? currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title={`Loan ${loanReference}`}
      subtitle={`${loan.memberName} · ${loan.branchName}`}
    >
      <ResultNotice
        detail={detail}
        errorFallback="Something went wrong while processing this loan."
        result={result}
        successFallback="Loan workflow updated."
      />

      <ActionBar className="justify-between">
        <Button asChild variant="outline">
          <Link href="/loans">
            <ArrowLeftIcon />
            Back to Overview
          </Link>
        </Button>
        <StatusBadge>{loan.status}</StatusBadge>
      </ActionBar>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          description="Principal approved when this loan was created."
          icon={CircleDollarSignIcon}
          label="Approved"
          value={prettyCurrency(loan.approvedPrincipal)}
        />
        <StatCard
          description="Current balance remaining after repayments."
          icon={WalletCardsIcon}
          label="Remaining"
          value={prettyCurrency(loan.remainingPrincipal)}
        />
        <StatCard
          description="Next scheduled payment anchored to the approval date."
          icon={CalendarClockIcon}
          label="Next Payment"
          tone={loan.isOverdue ? "danger" : "warning"}
          value={loan.nextDueLabel}
        />
        <StatCard
          description="Estimated interest for the next scheduled payment."
          icon={CheckCircle2Icon}
          label="Interest Due"
          value={prettyCurrency(loan.nextInterestDue)}
        />
        <StatCard
          description="Monthly rate stored on this loan."
          icon={LandmarkIcon}
          label="Monthly Rate"
          value={percentLabel(loan.monthlyInterestRate)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Tabs className="gap-6" defaultValue="summary">
            <TabsList
              className="w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card/95 p-2"
              variant="line"
            >
              <TabsTrigger className="px-3 py-1.5" value="summary">
                <FileTextIcon />
                Summary
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="schedule">
                <CalendarClockIcon />
                Schedule
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="payments">
                <WalletCardsIcon />
                Payments
              </TabsTrigger>
              <TabsTrigger className="px-3 py-1.5" value="audit">
                <HistoryIcon />
                Audit
              </TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-6" value="summary">
              <SectionCard
                title="Loan Snapshot"
                description="The payment cadence is anchored to the approval date, so early or late repayments do not shift the next due date."
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Member
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">{loan.memberName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sign in code: {loan.signInCode ?? "Not recorded"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Application
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      Requested {prettyCurrency(loan.requestedAmount)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Term {loan.termMonths} months · {loan.applicationStatus ?? "No status"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Collateral
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {loan.collateralRequired ? "Required" : "Not required"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {loan.collateralNotes ?? "No collateral notes recorded."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Current Work
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      Payment #{loan.repaymentCount + 1} due {loan.nextDueLabel}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {loan.isOverdue ? "Payment is overdue." : "Payment is upcoming."}
                    </p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Next Coming Payment"
                description="The next row comes from the fixed monthly schedule."
              >
                {nextScheduleRow ? (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/70 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {nextScheduleRow.dueLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expected interest {prettyCurrency(loan.nextInterestDue)}
                      </p>
                    </div>
                    <ScheduleBadge state={nextScheduleRow.state} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No upcoming payment remains in the visible schedule.
                  </p>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent className="space-y-6" value="schedule">
              <SectionCard
                title="Repayment Schedule"
                description="Schedule rows are calculated from the loan approval date and repayment count."
              >
                <AdminTableFrame>
                  <Table className="min-w-[720px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.length ? (
                        schedule.map((row, index) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">#{index + 1}</TableCell>
                            <TableCell>{row.dueLabel}</TableCell>
                            <TableCell>{row.paidLabel ?? "Not paid"}</TableCell>
                            <TableCell>
                              <ScheduleBadge state={row.state} />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <AdminTableEmptyRow
                          colSpan={4}
                          description="No repayment schedule could be calculated for this loan."
                        />
                      )}
                    </TableBody>
                  </Table>
                </AdminTableFrame>
              </SectionCard>
            </TabsContent>

            <TabsContent className="space-y-6" value="payments">
              <SectionCard
                title="Repayment History"
                description="Payments already recorded against this loan."
              >
                <AdminTableFrame>
                  <Table className="min-w-[840px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Recorded By</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repayments.length ? (
                        repayments.map((repayment) => (
                          <TableRow key={repayment.id}>
                            <TableCell className="font-medium">
                              {repayment.id.slice(0, 8).toUpperCase()}
                            </TableCell>
                            <TableCell>{repayment.dateLabel}</TableCell>
                            <TableCell>{repayment.repaymentMode}</TableCell>
                            <TableCell>{repayment.recordedBy}</TableCell>
                            <TableCell className="text-right">
                              {prettyCurrency(repayment.interestComponent)}
                            </TableCell>
                            <TableCell className="text-right">
                              {prettyCurrency(repayment.principalComponent)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {prettyCurrency(repayment.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <AdminTableEmptyRow
                          colSpan={7}
                          description="No repayments have been recorded for this loan yet."
                        />
                      )}
                    </TableBody>
                  </Table>
                </AdminTableFrame>
              </SectionCard>
            </TabsContent>

            <TabsContent className="space-y-6" value="audit">
              <SectionCard
                title="Audit Snapshot"
                description="Recent workflow events linked to this loan."
              >
                <div className="space-y-3">
                  {auditEvents.length ? (
                    auditEvents.map((event) => (
                      <div
                        className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/70 p-4"
                        key={event.id}
                      >
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <HistoryIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{event.action}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {event.actor} · {event.time}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No audit events were found for this loan.
                    </p>
                  )}
                </div>
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <SectionCard
            contentClassName="space-y-4 pt-5"
            title="Loan Actions"
            description="Manage only this loan from this page."
          >
            {canDisburse ? (
              <form action={disburseLoanAction} className="space-y-4">
                <input name="loanId" type="hidden" value={loan.id} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <AdminFormField htmlFor="cashAgentProfileId" label="Cash drawer agent">
                  <NativeSelect defaultValue="" id="cashAgentProfileId" name="cashAgentProfileId" required>
                    <NativeSelectOption disabled value="">
                      Select cash drawer agent
                    </NativeSelectOption>
                    {branchAgents.map((agent) => (
                      <NativeSelectOption key={agent.id} value={agent.id}>
                        {agent.fullName} · {agent.branchName}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </AdminFormField>
                <AdminFormField htmlFor="disbursementNote" label="Disbursement note">
                  <Textarea id="disbursementNote" name="note" placeholder="Optional disbursement note." />
                </AdminFormField>
                <Button className="w-full" type="submit">
                  Disburse Loan
                </Button>
              </form>
            ) : canRepay ? (
              <form action={recordLoanRepaymentAction} className="space-y-4">
                <input name="loanId" type="hidden" value={loan.id} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <AdminFormField htmlFor="cashAgentProfileId" label="Cash drawer agent">
                  <NativeSelect defaultValue="" id="cashAgentProfileId" name="cashAgentProfileId" required>
                    <NativeSelectOption disabled value="">
                      Select cash drawer agent
                    </NativeSelectOption>
                    {branchAgents.map((agent) => (
                      <NativeSelectOption key={agent.id} value={agent.id}>
                        {agent.fullName} · {agent.branchName}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </AdminFormField>
                <AdminFormField htmlFor="amount" label="Repayment amount">
                  <Input
                    id="amount"
                    min="0.01"
                    name="amount"
                    placeholder={loan.nextInterestDue.toFixed(2)}
                    required
                    step="0.01"
                    type="number"
                  />
                </AdminFormField>
                <AdminFormField htmlFor="repaymentMode" label="Repayment mode">
                  <NativeSelect defaultValue="interest_plus_principal" id="repaymentMode" name="repaymentMode">
                    <NativeSelectOption value="interest_plus_principal">
                      Interest plus principal
                    </NativeSelectOption>
                    <NativeSelectOption value="interest_only">Interest only</NativeSelectOption>
                  </NativeSelect>
                </AdminFormField>
                <AdminFormField htmlFor="repaymentNote" label="Repayment note">
                  <Textarea id="repaymentNote" name="note" placeholder="Optional repayment note." />
                </AdminFormField>
                <Button className="w-full" type="submit">
                  Record Repayment
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                This loan is not in a state that accepts a disbursement or repayment action.
              </p>
            )}
          </SectionCard>

          <SectionCard
            contentClassName="space-y-3 pt-5"
            title="Payment Anchor"
            description="Due dates stay tied to the original approval cadence."
          >
            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/70 p-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Clock3Icon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{loan.nextDueLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Next payment after {loan.repaymentCount} recorded repayment
                  {loan.repaymentCount === 1 ? "" : "s"}.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/70 p-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <FileTextIcon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {prettyCurrency(loan.nextInterestDue)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Current estimated interest due.
                </p>
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </AdminShell>
  );
}
