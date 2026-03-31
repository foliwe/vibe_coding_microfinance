import {
  approveLoanApplicationAction,
  createLoanApplicationAction,
  disburseLoanAction,
  recordLoanRepaymentAction,
  rejectLoanApplicationAction,
  startLoanApplicationReviewAction,
} from "../actions";
import { AdminShell } from "../../components/admin-shell";
import { SectionCard } from "../../components/section-card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { NativeSelect, NativeSelectOption } from "../../components/ui/native-select";
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

function LoanResultNotice({
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
    <p className={result === "success" ? "notice notice-success" : "notice notice-error"}>
      {detail ??
        (result === "success"
          ? "Loan workflow updated."
          : "Something went wrong while processing the loan workflow.")}
    </p>
  );
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
      <LoanResultNotice detail={detail} result={result} />

      <SectionCard
        title="New Loan Application"
        description="Capture the member request first. Approval and disbursement remain separate actions."
      >
        <form action={createLoanApplicationAction} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="memberProfileId">Member</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestedAmount">Requested amount</Label>
              <Input id="requestedAmount" min="0.01" name="requestedAmount" placeholder="80000" required step="0.01" type="number" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyInterestRate">Monthly interest rate</Label>
              <Input
                id="monthlyInterestRate"
                min="0"
                name="monthlyInterestRate"
                placeholder="0.03"
                required
                step="0.000001"
                type="number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termMonths">Term (months)</Label>
              <Input id="termMonths" min="1" name="termMonths" placeholder="12" required step="1" type="number" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collateralRequired">Collateral required</Label>
              <NativeSelect defaultValue="false" id="collateralRequired" name="collateralRequired">
                <NativeSelectOption value="false">No</NativeSelectOption>
                <NativeSelectOption value="true">Yes</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchScope">Branch scope</Label>
              <Input disabled id="branchScope" value={context.currentBranchLabel} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="collateralNotes">Collateral notes</Label>
            <Textarea
              id="collateralNotes"
              name="collateralNotes"
              placeholder="Describe collateral details or supporting documents when required."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Application note</Label>
            <Textarea id="note" name="note" placeholder="Optional branch-office review context." />
          </div>

          <button className="button" type="submit">
            Create Loan Application
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Application Queue"
        description="Move submitted applications into review, then approve or reject them with an explicit principal decision."
      >
        <table className="table">
          <thead>
            <tr>
              <th>Application ID</th>
              <th>Submitted</th>
              <th>Member</th>
              <th>Requested</th>
              <th>Monthly Rate</th>
              <th>Term</th>
              <th>Collateral</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.length ? (
              applications.map((application) => {
                const actionable =
                  application.status === "application_submitted" ||
                  application.status === "under_review";

                return (
                  <tr key={application.id}>
                    <td>{application.id.toUpperCase()}</td>
                    <td>{prettyDateTime(application.createdAt)}</td>
                    <td>{application.memberName}</td>
                    <td>{prettyCurrency(application.requestedAmount)}</td>
                    <td>{percentLabel(application.monthlyInterestRate)}</td>
                    <td>{application.termMonths} months</td>
                    <td>
                      {application.collateralRequired
                        ? application.collateralNotes || "Required"
                        : "Not required"}
                    </td>
                    <td>
                      <span className="chip">{application.status}</span>
                    </td>
                    <td>
                      {actionable ? (
                        <div className="space-y-3 min-w-[18rem]">
                          {application.status === "application_submitted" ? (
                            <form action={startLoanApplicationReviewAction}>
                              <input name="applicationId" type="hidden" value={application.id} />
                              <button className="button table-button" type="submit">
                                Mark In Review
                              </button>
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
                            <button className="button table-button" type="submit">
                              Approve Application
                            </button>
                          </form>

                          <form action={rejectLoanApplicationAction} className="space-y-2">
                            <input name="applicationId" type="hidden" value={application.id} />
                            <Textarea
                              aria-label={`Rejection note for ${application.memberName}`}
                              name="note"
                              placeholder="Optional rejection note."
                            />
                            <button className="button-secondary table-button" type="submit">
                              Reject Application
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="muted">No further action on this application.</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="muted" colSpan={9}>
                  No loan applications have been submitted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard
        title="Issued Loans"
        description="Approved loans can be disbursed from an agent cash drawer. Disbursed and active loans can accept repayments."
      >
        <table className="table">
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Booked</th>
              <th>Member</th>
              <th>Approved Principal</th>
              <th>Remaining Principal</th>
              <th>Monthly Rate</th>
              <th>Next Interest Due</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
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
                  <tr key={loan.id}>
                    <td>{loan.id.toUpperCase()}</td>
                    <td>{prettyDateTime(loan.createdAt)}</td>
                    <td>{loan.memberName}</td>
                    <td>{prettyCurrency(loan.approvedPrincipal)}</td>
                    <td>{prettyCurrency(loan.remainingPrincipal)}</td>
                    <td>{percentLabel(loan.monthlyInterestRate)}</td>
                    <td>{prettyCurrency(loan.nextInterestDue)}</td>
                    <td>
                      <span className="chip">{loan.status}</span>
                    </td>
                    <td>
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
                          <button className="button table-button" type="submit">
                            Disburse Loan
                          </button>
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
                          <button className="button table-button" type="submit">
                            Record Repayment
                          </button>
                        </form>
                      ) : (
                        <span className="muted">
                          {loan.disbursedAt
                            ? "No action required."
                            : "Awaiting the next workflow stage."}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="muted" colSpan={9}>
                  No live loans were found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionCard>
    </AdminShell>
  );
}
