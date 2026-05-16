import { createAgentAction } from "../../actions";
import { AdminFieldGrid, AdminFormField } from "../../../components/admin-form-field";
import { AdminShell } from "../../../components/admin-shell";
import { ResultNotice } from "../../../components/notice";
import { SectionCard } from "../../../components/section-card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { NativeSelect, NativeSelectOption } from "../../../components/ui/native-select";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import { getOnboardingPageContext } from "../../../lib/onboarding-data";

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
      breadcrumbs={withDashboardBreadcrumbs(role, [
        breadcrumb("People"),
        breadcrumb("Agents", "/agents"),
        breadcrumb("Create Agent"),
      ])}
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
        <ResultNotice
          detail={params?.detail}
          errorFallback="Something went wrong."
          result={params?.result}
          successFallback="Saved successfully."
        />
        <form action={createAgentAction}>
          <AdminFieldGrid className="mb-5">
            <AdminFormField htmlFor="fullName" label="Full Name">
              <Input id="fullName" name="fullName" placeholder="Field Agent One" required />
            </AdminFormField>
            <AdminFormField htmlFor="email" label="Email">
              <Input
                id="email"
                name="email"
                placeholder="agent@example.com"
                required
                type="email"
              />
            </AdminFormField>
            <AdminFormField htmlFor="phone" label="Phone">
              <Input id="phone" name="phone" placeholder="+2376..." required />
            </AdminFormField>
            <AdminFormField htmlFor="password" label="Temporary Password">
              <Input
                id="password"
                minLength={8}
                name="password"
                placeholder="Agent123456!"
                required
              />
            </AdminFormField>
            <AdminFormField htmlFor="branchId" label="Branch">
              <NativeSelect
                defaultValue={profile.role === "branch_manager" ? profile.branch_id ?? "" : ""}
                id="branchId"
                name="branchId"
                required
              >
                <NativeSelectOption value="" disabled>
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
          <Button type="submit">Create Agent</Button>
        </form>
      </SectionCard>
    </AdminShell>
  );
}
