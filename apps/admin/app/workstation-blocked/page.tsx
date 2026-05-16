import { redirect } from "next/navigation";

import { rebindCurrentWorkstationAction, signOutAction } from "../actions";
import {
  AuthCard,
  AuthCardContent,
  AuthCardHeader,
  AuthShell,
} from "../../components/auth-shell";
import { WorkstationIdentityFields } from "../../components/workstation-identity-bootstrap";
import { Button } from "../../components/ui/button";
import { getCurrentProfileOrNull } from "../../lib/auth";
import {
  assertCurrentWorkstationAccess,
  isBranchManagerSetupComplete,
} from "../../lib/staff-device";

export default async function WorkstationBlockedPage() {
  const { profile, supabase } = await getCurrentProfileOrNull();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/");
  }

  if (profile.role !== "branch_manager") {
    redirect("/login?reason=unauthorized");
  }

  if (!isBranchManagerSetupComplete(profile)) {
    redirect("/setup");
  }

  const assertion = await assertCurrentWorkstationAccess(supabase);

  if (assertion.access === "allowed") {
    redirect("/branch");
  }

  const resetNeedsRebind = assertion.access === "needs_binding";

  return (
    <AuthShell>
      <div className="flex flex-col gap-4">
        <AuthCard>
          <AuthCardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Workstation blocked
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
            {resetNeedsRebind
              ? "This workstation needs to be trusted again for this account"
              : "This account is not trusted on this workstation/browser profile"}
            </h1>
            <p className="text-sm text-muted-foreground">
            {resetNeedsRebind
              ? "No active trusted workstation is registered for this account. Trust this browser profile again to continue."
              : "Ask an admin or permitted branch manager to reset the trusted workstation binding for this staff account, then sign in again to rebind."}
            </p>
          </AuthCardHeader>
        </AuthCard>

        <AuthCard>
          <AuthCardContent>
          {resetNeedsRebind ? (
            <form action={rebindCurrentWorkstationAction} className="space-y-4">
              <WorkstationIdentityFields />
              <Button className="w-full" type="submit">
                Trust This Workstation
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Active trusted workstation:
              {" "}
              <strong>{assertion.activeDeviceName ?? "Another browser profile"}</strong>
            </p>
          )}

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
