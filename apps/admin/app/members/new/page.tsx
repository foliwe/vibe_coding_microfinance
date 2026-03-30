import { createMemberAction } from "../../actions";
import { AdminShell } from "../../../components/admin-shell";
import { SectionCard } from "../../../components/section-card";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import { getOnboardingPageContext } from "../../../lib/onboarding-data";

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

export default async function CreateMemberPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const { agents, branches, currentBranchLabel, isLive, profile } =
    await getOnboardingPageContext(["admin", "branch_manager"]);
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs(role, [
        breadcrumb("People"),
        breadcrumb("Members", "/members"),
        breadcrumb("Create Member"),
      ])}
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Create Member"
      subtitle="Onboard a new member with branch assignment, agent ownership, accounts, and first-login credentials."
    >
      <SectionCard
        title="Member Onboarding Form"
        description="This form now creates the Auth user, profile, member registry row, agent assignment, and savings and deposit accounts."
      >
        <Notice detail={params?.detail} result={params?.result} />
        <form action={createMemberAction}>
          <div className="form-grid">
            <label className="field">
              <span>Full Name</span>
              <input name="fullName" placeholder="John Nkem" required />
            </label>
            <label className="field">
              <span>Login Email</span>
              <input name="email" placeholder="member@example.com" required type="email" />
            </label>
            <label className="field">
              <span>Temporary Password</span>
              <input minLength={8} name="password" placeholder="Member123456!" required />
            </label>
            <label className="field">
              <span>Phone Number</span>
              <input name="phone" placeholder="+2376..." required />
            </label>
            <label className="field">
              <span>Date Of Birth</span>
              <input name="dateOfBirth" placeholder="1990-08-24" type="date" />
            </label>
            <label className="field">
              <span>Gender</span>
              <select defaultValue="" name="gender">
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label className="field">
              <span>Occupation</span>
              <input name="occupation" placeholder="Trader" />
            </label>
            <label className="field">
              <span>ID Type</span>
              <input name="idType" placeholder="National ID" />
            </label>
            <label className="field">
              <span>ID Number</span>
              <input name="idNumber" placeholder="CM123456789" />
            </label>
            <label className="field">
              <span>Branch</span>
              <select
                defaultValue={profile.role === "branch_manager" ? profile.branch_id ?? "" : ""}
                name="branchId"
                required
              >
                <option value="" disabled>
                  Select branch
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Assigned Agent</span>
              <select defaultValue="" name="assignedAgentId" required>
                <option value="" disabled>
                  Select agent
                </option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName} · {agent.branchName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Next Of Kin Name</span>
              <input name="nextOfKinName" placeholder="Jane Nkem" />
            </label>
            <label className="field">
              <span>Next Of Kin Phone</span>
              <input name="nextOfKinPhone" placeholder="+2376..." />
            </label>
            <label className="field">
              <span>Next Of Kin Address</span>
              <input name="nextOfKinAddress" placeholder="Mile 4 Nkwen" />
            </label>
            <label className="field">
              <span>Savings Account Number</span>
              <input name="savingsAccountNumber" placeholder="Auto-generate if left blank" />
            </label>
            <label className="field">
              <span>Deposit Account Number</span>
              <input name="depositAccountNumber" placeholder="Auto-generate if left blank" />
            </label>
            <label className="field">
              <span>Residential Address</span>
              <textarea name="residentialAddress" placeholder="Mile 4 Nkwen" />
            </label>
          </div>
          <div className="actions">
            <button className="button" type="submit">
              Save Member
            </button>
          </div>
        </form>
      </SectionCard>
    </AdminShell>
  );
}
