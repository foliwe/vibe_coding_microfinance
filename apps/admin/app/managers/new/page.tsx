import { createManagerAction } from "../../actions";
import { AdminFieldGrid, AdminFormField } from "../../../components/admin-form-field";
import { AdminShell } from "../../../components/admin-shell";
import { ResultNotice } from "../../../components/notice";
import { SectionCard } from "../../../components/section-card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { NativeSelect, NativeSelectOption } from "../../../components/ui/native-select";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import { getOnboardingPageContext } from "../../../lib/onboarding-data";

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
        <ResultNotice
          detail={params?.detail}
          errorFallback="Something went wrong."
          result={params?.result}
          successFallback="Saved successfully."
        />
        <form action={createManagerAction}>
          <AdminFieldGrid className="mb-5">
            <AdminFormField htmlFor="fullName" label="Full Name">
              <Input id="fullName" name="fullName" placeholder="Enter manager full name" required />
            </AdminFormField>
            <AdminFormField htmlFor="email" label="Email">
              <Input
                id="email"
                name="email"
                placeholder="Enter email address"
                required
                type="email"
              />
            </AdminFormField>
            <AdminFormField htmlFor="phone" label="Phone">
              <Input id="phone" name="phone" placeholder="Enter phone number" required />
            </AdminFormField>
            <AdminFormField htmlFor="password" label="Temporary Password">
              <Input
                id="password"
                minLength={8}
                name="password"
                placeholder="Enter temporary password"
                required
              />
            </AdminFormField>
            <AdminFormField htmlFor="branchId" label="Branch">
              <NativeSelect defaultValue="" id="branchId" name="branchId" required>
                <NativeSelectOption disabled value="">
                  Select branch
                </NativeSelectOption>
                {branches.map((branch) => (
                  <NativeSelectOption key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </AdminFormField>
          </AdminFieldGrid>
          <Button type="submit">Create Branch Manager</Button>
        </form>
      </SectionCard>
    </AdminShell>
  );
}
