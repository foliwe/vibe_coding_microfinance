import {
  approveLoanApplicationAction,
  createLoanApplicationAction,
  disburseLoanAction,
  recordLoanRepaymentAction,
  rejectLoanApplicationAction,
  startLoanApplicationReviewAction,
} from "../actions";
import { ActionBar } from "../../components/action-bar";
import { AdminFieldGrid, AdminFormField } from "../../components/admin-form-field";
import { AdminShell } from "../../components/admin-shell";
import { AdminTableEmptyRow, AdminTableFrame } from "../../components/admin-table";
import { ResultNotice } from "../../components/notice";
import { SectionCard } from "../../components/section-card";
import { StatusBadge } from "../../components/status-badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { NativeSelect, NativeSelectOption } from "../../components/ui/native-select";
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
import { getLoansPageData } from "../../lib/dashboard-data";
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

export default async function LoansPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const context = await getAdminTransactionPageContext();
  const { applications, isLive, loans } = await getLoansPageData();
  const role = context.profile.role === "admin" ? "admin" : "branch_manager";
  const detail = firstParam(params?.detail);
  const result = firstParam(params?.result);

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [breadcrumb("Loans")])}
      currentBranchLabel={context.currentBranchLabel}
      currentUserName={context.profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Loans"
      subtitle="Create applications, review decisions, disburse approved loans, and post repayments from one branch-office workflow."
    >
      <ResultNotice
        detail={detail}
        errorFallback="Something went wrong while processing the loan workflow."
        result={result}
        successFallback="Loan workflow updated."
      />

      <SectionCard
        title="New Loan Application"
        description="Capture the member request first. Approval and disbursement remain separate actions."
      >
        <form action={createLoanApplicationAction} className="space-y-5">
          <AdminFieldGrid>
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
              <Input id="requestedAmount" min="0.01" name="requestedAmount" placeholder="80000" required step="0.01" type="number" />
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

          <Button type="submit">Create Loan Application</Button>
        </form>
      </SectionCard>

      <SectionCard
        title="Application Queue"
        description="Move submitted applications into review, then approve or reject them with an explicit principal decision."
      >
        <AdminTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application ID</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Monthly Rate</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Collateral</TableHead>
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
                    <TableCell>{application.id.toUpperCase()}</TableCell>
                    <TableCell>{prettyDateTime(application.createdAt)}</TableCell>
                    <TableCell>{application.memberName}</TableCell>
                    <TableCell>{prettyCurrency(application.requestedAmount)}</TableCell>
                    <TableCell>{percentLabel(application.monthlyInterestRate)}</TableCell>
                    <TableCell>{application.termMonths} months</TableCell>
                    <TableCell>
                      {application.collateralRequired
                        ? application.collateralNotes || "Required"
                        : "Not required"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge>{application.status}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      {actionable ? (
                        <div className="space-y-3 min-w-[18rem]">
                          {application.status === "application_submitted" ? (
                            <form action={startLoanApplicationReviewAction}>
                              <input name="applicationId" type="hidden" value={application.id} />
                              <Button size="sm" type="submit">Mark In Review</Button>
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
                            <Button size="sm" type="submit">Approve Application</Button>
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

      <SectionCard
        title="Issued Loans"
        description="Approved loans can be disbursed from an agent cash drawer. Disbursed and active loans can accept repayments."
      >
        <AdminTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Approved Principal</TableHead>
                <TableHead>Remaining Principal</TableHead>
                <TableHead>Monthly Rate</TableHead>
                <TableHead>Next Interest Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {loans.length ? (
              loans.map((loan) => {
                const canDisburse = loan.status === "approved";
                const canRepay =
                  loan.status === "disbursed" ||
                  loan.status === "active" ||
                  loan.status === "defaulted";
                const branchAgents = context.agents.filter(
                  (agent) => agent.branchId === loan.branchId,
                );

                return (
                  <TableRow key={loan.id}>
                    <TableCell>{loan.id.toUpperCase()}</TableCell>
                    <TableCell>{prettyDateTime(loan.createdAt)}</TableCell>
                    <TableCell>{loan.memberName}</TableCell>
                    <TableCell>{prettyCurrency(loan.approvedPrincipal)}</TableCell>
                    <TableCell>{prettyCurrency(loan.remainingPrincipal)}</TableCell>
                    <TableCell>{percentLabel(loan.monthlyInterestRate)}</TableCell>
                    <TableCell>{prettyCurrency(loan.nextInterestDue)}</TableCell>
                    <TableCell>
                      <StatusBadge>{loan.status}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      {canDisburse ? (
                        <form action={disburseLoanAction} className="space-y-2 min-w-[18rem]">
                          <input name="loanId" type="hidden" value={loan.id} />
                          <NativeSelect defaultValue="" name="cashAgentProfileId" required>
                            <NativeSelectOption disabled value="">
                              Select cash drawer agent
                            </NativeSelectOption>
                            {branchAgents.map((agent) => (
                              <NativeSelectOption key={agent.id} value={agent.id}>
                                {agent.fullName} · {agent.branchName}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          <Textarea
                            aria-label={`Disbursement note for ${loan.memberName}`}
                            name="note"
                            placeholder="Optional disbursement note."
                          />
                          <Button size="sm" type="submit">Disburse Loan</Button>
                        </form>
                      ) : canRepay ? (
                        <form action={recordLoanRepaymentAction} className="space-y-2 min-w-[18rem]">
                          <input name="loanId" type="hidden" value={loan.id} />
                          <NativeSelect defaultValue="" name="cashAgentProfileId" required>
                            <NativeSelectOption disabled value="">
                              Select cash drawer agent
                            </NativeSelectOption>
                            {branchAgents.map((agent) => (
                              <NativeSelectOption key={agent.id} value={agent.id}>
                                {agent.fullName} · {agent.branchName}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          <Input
                            aria-label={`Repayment amount for ${loan.memberName}`}
                            min="0.01"
                            name="amount"
                            placeholder="2500"
                            required
                            step="0.01"
                            type="number"
                          />
                          <NativeSelect defaultValue="interest_plus_principal" name="repaymentMode">
                            <NativeSelectOption value="interest_plus_principal">
                              Interest plus principal
                            </NativeSelectOption>
                            <NativeSelectOption value="interest_only">Interest only</NativeSelectOption>
                          </NativeSelect>
                          <Textarea
                            aria-label={`Repayment note for ${loan.memberName}`}
                            name="note"
                            placeholder="Optional repayment note."
                          />
                          <Button size="sm" type="submit">Record Repayment</Button>
                        </form>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {loan.disbursedAt
                            ? "No action required."
                            : "Awaiting the next workflow stage."}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <AdminTableEmptyRow colSpan={9} description="No live loans were found yet." />
            )}
            </TableBody>
          </Table>
        </AdminTableFrame>
      </SectionCard>
    </AdminShell>
  );
}
