import { cookies } from "next/headers";
import { createMemberAction } from "../../actions";
import { AdminFieldGrid, AdminFormField } from "../../../components/admin-form-field";
import { AdminShell } from "../../../components/admin-shell";
import { Notice, ResultNotice } from "../../../components/notice";
import { SectionCard } from "../../../components/section-card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { NativeSelect, NativeSelectOption } from "../../../components/ui/native-select";
import { breadcrumb, withDashboardBreadcrumbs } from "../../../lib/breadcrumbs";
import { getOnboardingPageContext } from "../../../lib/onboarding-data";

function CredentialNotice({
  fullName,
  signInCode,
  temporaryPassword,
}: {
  fullName: string;
  signInCode: string;
  temporaryPassword: string;
}) {
  return (
    <Notice title={`Secure member credentials for ${fullName}`} tone="success">
      <p>Sign-in code: {signInCode}</p>
      <p>Temporary password: {temporaryPassword}</p>
    </Notice>
  );
}

export default async function CreateMemberPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const flashValue = cookieStore.get("member_creation_flash")?.value;
  const memberCreationFlash =
    params?.result === "success" && flashValue
      ? (() => {
          try {
            return JSON.parse(flashValue) as {
              fullName: string;
              signInCode: string;
              temporaryPassword: string;
            };
          } catch {
            return null;
          }
        })()
      : null;
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
        <ResultNotice
          detail={params?.detail}
          errorFallback="Something went wrong."
          result={params?.result}
          successFallback="Saved successfully."
        />
        {memberCreationFlash ? (
          <CredentialNotice
            fullName={memberCreationFlash.fullName}
            signInCode={memberCreationFlash.signInCode}
            temporaryPassword={memberCreationFlash.temporaryPassword}
          />
        ) : null}
        <form action={createMemberAction}>
          <AdminFieldGrid className="mb-5">
            <AdminFormField htmlFor="fullName" label="Full Name">
              <Input id="fullName" name="fullName" placeholder="John Nkem" required />
            </AdminFormField>
            <AdminFormField htmlFor="phone" label="Phone Number">
              <Input id="phone" name="phone" placeholder="+2376..." required />
            </AdminFormField>
            <AdminFormField htmlFor="idNumber" label="ID Card Number">
              <Input
                id="idNumber"
                name="idNumber"
                placeholder="CM123456789"
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
            <AdminFormField htmlFor="assignedAgentId" label="Assigned Agent">
              <NativeSelect defaultValue="" id="assignedAgentId" name="assignedAgentId" required>
                <NativeSelectOption value="" disabled>
                  Select agent
                </NativeSelectOption>
                {agents.map((agent) => (
                  <NativeSelectOption key={agent.id} value={agent.id}>
                    {agent.fullName} · {agent.branchName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </AdminFormField>
          </AdminFieldGrid>
          <Button type="submit">Save Member</Button>
        </form>
      </SectionCard>
    </AdminShell>
  );
}
