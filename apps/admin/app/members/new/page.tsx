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
      subtitle="Create the member with minimum identification now, then let the member complete the rest from the mobile profile page after first login."
    >
      <SectionCard
        title="Member Onboarding Form"
        description="This form creates the member account, assignment, and member accounts from only the core identity fields. Sign-in code and temporary password are generated automatically."
      >
        <Notice detail={params?.detail} result={params?.result} />
        <form action={createMemberAction}>
          <div className="form-grid">
            <label className="field">
              <span>Full Name</span>
              <input name="fullName" placeholder="John Nkem" required />
            </label>
            <label className="field">
              <span>Phone Number</span>
              <input name="phone" placeholder="+2376..." required />
            </label>
            <label className="field">
              <span>ID Card Number</span>
              <input name="idNumber" placeholder="CM123456789" required />
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
