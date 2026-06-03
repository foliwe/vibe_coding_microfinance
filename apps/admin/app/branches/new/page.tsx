import { createBranchAction } from "../../actions";
import { AdminFieldGrid, AdminFormField } from "../../../components/admin-form-field";
import { AdminShell } from "../../../components/admin-shell";
import { ResultNotice } from "../../../components/notice";
import { SectionCard } from "../../../components/section-card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { NativeSelect, NativeSelectOption } from "../../../components/ui/native-select";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import { getOnboardingPageContext } from "../../../lib/onboarding-data";

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
        <ResultNotice
          detail={params?.detail}
          errorFallback="Something went wrong."
          result={params?.result}
          successFallback="Saved successfully."
        />
        <form action={createBranchAction}>
          <AdminFieldGrid className="mb-5">
            <AdminFormField htmlFor="name" label="Branch Name">
              <Input id="name" name="name" placeholder="Enter branch name" required />
            </AdminFormField>
            <AdminFormField htmlFor="code" label="Branch Code">
              <Input
                id="code"
                maxLength={3}
                name="code"
                pattern="[A-Za-z0-9]{3}"
                placeholder="Code"
                required
              />
            </AdminFormField>
            <AdminFormField htmlFor="city" label="City">
              <Input id="city" name="city" placeholder="Enter city" />
            </AdminFormField>
            <AdminFormField htmlFor="region" label="Region">
              <Input id="region" name="region" placeholder="Enter region" />
            </AdminFormField>
            <AdminFormField htmlFor="phone" label="Phone">
              <Input id="phone" name="phone" placeholder="Enter phone number" />
            </AdminFormField>
            <AdminFormField htmlFor="managerProfileId" label="Branch Manager">
              <NativeSelect defaultValue="" id="managerProfileId" name="managerProfileId">
                <NativeSelectOption value="">Assign later</NativeSelectOption>
                {managers.map((manager) => (
                  <NativeSelectOption key={manager.id} value={manager.id}>
                    {manager.fullName} · {manager.branchName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </AdminFormField>
          </AdminFieldGrid>
          <Button type="submit">Create Branch</Button>
        </form>
      </SectionCard>
    </AdminShell>
  );
}
