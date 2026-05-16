import { redirect } from "next/navigation";

import { completeBranchManagerSetupAction, signOutAction } from "../actions";
import { AdminFormField } from "../../components/admin-form-field";
import {
  AuthCard,
  AuthCardContent,
  AuthCardHeader,
  AuthShell,
} from "../../components/auth-shell";
import { Notice } from "../../components/notice";
import { WorkstationIdentityFields } from "../../components/workstation-identity-bootstrap";
import { Button } from "../../components/ui/button";
import { FieldGroup } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { getCurrentProfileOrNull } from "../../lib/auth";
import {
  ensureCurrentWorkstationAccess,
  isBranchManagerSetupComplete,
} from "../../lib/staff-device";

export default async function BranchManagerSetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ detail?: string; result?: string }>;
}) {
  const { profile, supabase } = await getCurrentProfileOrNull();
  const params = await searchParams;

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/");
  }

  if (profile.role !== "branch_manager") {
    redirect("/login?reason=unauthorized");
  }

  if (isBranchManagerSetupComplete(profile)) {
    const assertion = await ensureCurrentWorkstationAccess(supabase);

    redirect(assertion.access === "allowed" ? "/branch" : "/workstation-blocked");
  }

  const showError = params?.result === "error" && params.detail;

  return (
    <AuthShell>
      <div className="flex flex-col gap-4">
        <AuthCard>
          <AuthCardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Secure this workstation
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Finish branch-manager security setup
            </h1>
            <p className="text-sm text-muted-foreground">
              Change the temporary password, create the transaction PIN, and then this
              browser profile will be trusted for branch-manager access.
            </p>
          </AuthCardHeader>
        </AuthCard>

        <AuthCard>
          <AuthCardContent>
            <form action={completeBranchManagerSetupAction}>
              <WorkstationIdentityFields />
              <FieldGroup className="gap-4">
                {profile.must_change_password ? (
                  <>
                    <AdminFormField
                      htmlFor="currentPassword"
                      label="Current Temporary Password"
                    >
                      <Input
                        autoComplete="current-password"
                        id="currentPassword"
                        name="currentPassword"
                        placeholder="Enter current temporary password"
                        required
                        type="password"
                      />
                    </AdminFormField>
                    <AdminFormField htmlFor="newPassword" label="New Password">
                      <Input
                        autoComplete="new-password"
                        id="newPassword"
                        minLength={8}
                        name="newPassword"
                        placeholder="Choose a permanent password"
                        required
                        type="password"
                      />
                    </AdminFormField>
                    <AdminFormField
                      htmlFor="confirmNewPassword"
                      label="Confirm New Password"
                    >
                      <Input
                        autoComplete="new-password"
                        id="confirmNewPassword"
                        minLength={8}
                        name="confirmNewPassword"
                        placeholder="Re-enter the new password"
                        required
                        type="password"
                      />
                    </AdminFormField>
                  </>
                ) : null}

                {profile.requires_pin_setup ? (
                  <>
                    <AdminFormField htmlFor="transactionPin" label="Transaction PIN">
                      <Input
                        id="transactionPin"
                        inputMode="numeric"
                        maxLength={4}
                        minLength={4}
                        name="transactionPin"
                        pattern="[0-9]{4}"
                        placeholder="Create a 4-digit PIN"
                        required
                        type="password"
                      />
                    </AdminFormField>
                    <AdminFormField
                      htmlFor="confirmTransactionPin"
                      label="Confirm Transaction PIN"
                    >
                      <Input
                        id="confirmTransactionPin"
                        inputMode="numeric"
                        maxLength={4}
                        minLength={4}
                        name="confirmTransactionPin"
                        pattern="[0-9]{4}"
                        placeholder="Re-enter the 4-digit PIN"
                        required
                        type="password"
                      />
                    </AdminFormField>
                  </>
                ) : null}

                {showError ? <Notice tone="error">{params?.detail}</Notice> : null}

                <Button className="w-full" type="submit">
                  Complete Security Setup
                </Button>
              </FieldGroup>
            </form>

            <form action={signOutAction} className="mt-4">
              <Button className="w-full" type="submit" variant="outline">
                Sign Out
              </Button>
            </form>
          </AuthCardContent>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
