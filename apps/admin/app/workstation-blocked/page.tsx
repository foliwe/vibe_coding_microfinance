import { redirect } from "next/navigation";

import { rebindCurrentWorkstationAction, signOutAction } from "../actions";
import { WorkstationIdentityFields } from "../../components/workstation-identity-bootstrap";
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
    <main className="login-page">
      <div className="login-stack">
        <section className="login-card">
          <p className="eyebrow">Workstation blocked</p>
          <h1>
            {resetNeedsRebind
              ? "This workstation needs to be trusted again for this account"
              : "This account is not trusted on this workstation/browser profile"}
          </h1>
          <p className="muted">
            {resetNeedsRebind
              ? "No active trusted workstation is registered for this account. Trust this browser profile again to continue."
              : "Ask an admin or permitted branch manager to reset the trusted workstation binding for this staff account, then sign in again to rebind."}
          </p>
        </section>

        <section className="login-card">
          {resetNeedsRebind ? (
            <form action={rebindCurrentWorkstationAction} className="space-y-4">
              <WorkstationIdentityFields />
              <button className="button w-full" type="submit">
                Trust This Workstation
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Active trusted workstation:
              {" "}
              <strong>{assertion.activeDeviceName ?? "Another browser profile"}</strong>
            </p>
          )}

          <form action={signOutAction} className="mt-4">
            <button className="button-secondary w-full" type="submit">
              Sign Out
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
