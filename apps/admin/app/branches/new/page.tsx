import { createBranchAction } from "../../actions";
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

export default async function CreateBranchPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const { currentBranchLabel, isLive, managers, profile } = await getOnboardingPageContext([
    "admin",
  ]);

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs("admin", [
        breadcrumb("Branches", "/branches"),
        breadcrumb("Create Branch"),
      ])}
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Create Branch"
      subtitle="Register a new branch, assign an existing manager if needed, and establish the 3-character branch code used by downstream member credentials."
    >
      <SectionCard
        title="Branch Setup"
        description="Admins create branches. Branch codes must be exactly 3 uppercase letters or numbers. A manager can be assigned now or later from the branch-manager creation flow."
      >
        <Notice detail={params?.detail} result={params?.result} />
        <form action={createBranchAction}>
          <div className="form-grid">
            <label className="field">
              <span>Branch Name</span>
              <input name="name" placeholder="Bamenda Central" required />
            </label>
            <label className="field">
              <span>Branch Code</span>
              <input maxLength={3} name="code" pattern="[A-Za-z0-9]{3}" placeholder="BAM" required />
            </label>
            <label className="field">
              <span>City</span>
              <input name="city" placeholder="Bamenda" />
            </label>
            <label className="field">
              <span>Region</span>
              <input name="region" placeholder="Northwest" />
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="phone" placeholder="+2376..." />
            </label>
            <label className="field">
              <span>Branch Manager</span>
              <select defaultValue="" name="managerProfileId">
                <option value="">Assign later</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName} · {manager.branchName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="actions">
            <button className="button" type="submit">
              Create Branch
            </button>
          </div>
        </form>
      </SectionCard>
    </AdminShell>
  );
}
