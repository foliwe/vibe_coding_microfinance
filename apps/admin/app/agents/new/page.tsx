import { createAgentAction } from "../../actions";
import { AdminShell } from "../../../components/admin-shell";
import { SectionCard } from "../../../components/section-card";
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

export default async function CreateAgentPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const { branches, currentBranchLabel, isLive, profile } = await getOnboardingPageContext([
    "admin",
    "branch_manager",
  ]);
  const role = profile.role === "admin" ? "admin" : "branch_manager";

  return (
    <AdminShell
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role={role}
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Create Agent"
      subtitle="Create a field agent account with branch assignment and first-login credentials."
    >
      <SectionCard
        title="Agent Setup"
        description="Admins can assign any branch. Branch managers can create agents only for their own branch."
      >
        <Notice detail={params?.detail} result={params?.result} />
        <form action={createAgentAction}>
          <div className="form-grid">
            <label className="field">
              <span>Full Name</span>
              <input name="fullName" placeholder="Field Agent One" required />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" placeholder="agent@example.com" required type="email" />
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="phone" placeholder="+2376..." required />
            </label>
            <label className="field">
              <span>Temporary Password</span>
              <input minLength={8} name="password" placeholder="Agent123456!" required />
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
          </div>
          <div className="actions">
            <button className="button" type="submit">
              Create Agent
            </button>
          </div>
        </form>
      </SectionCard>
    </AdminShell>
  );
}
