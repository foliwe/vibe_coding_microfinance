import { createManagerAction } from "../../actions";
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

export default async function CreateManagerPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const { branches, currentBranchLabel, isLive, profile } = await getOnboardingPageContext([
    "admin",
  ]);

  return (
    <AdminShell
      breadcrumbs={withDashboardBreadcrumbs("admin", [
        breadcrumb("People"),
        breadcrumb("Managers", "/managers"),
        breadcrumb("Create Manager"),
      ])}
      currentBranchLabel={currentBranchLabel}
      currentUserName={profile.full_name}
      role="admin"
      statusBadge={isLive ? "Live Supabase" : "Supabase setup needed"}
      title="Create Branch Manager"
      subtitle="Create a branch manager account and attach it to an existing branch."
    >
      <SectionCard
        title="Manager Setup"
        description="This creates the Auth user, branch-manager profile, staff record, and assigns the selected branch."
      >
        <Notice detail={params?.detail} result={params?.result} />
        <form action={createManagerAction}>
          <div className="form-grid">
            <label className="field">
              <span>Full Name</span>
              <input name="fullName" placeholder="Bamenda Manager" required />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" placeholder="manager@example.com" required type="email" />
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="phone" placeholder="+2376..." required />
            </label>
            <label className="field">
              <span>Temporary Password</span>
              <input minLength={8} name="password" placeholder="Manager123456!" required />
            </label>
            <label className="field">
              <span>Branch</span>
              <select defaultValue="" name="branchId" required>
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
              Create Branch Manager
            </button>
          </div>
        </form>
      </SectionCard>
    </AdminShell>
  );
}
