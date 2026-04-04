import { redirect } from "next/navigation";

import { completeBranchManagerSetupAction, signOutAction } from "../actions";
import { WorkstationIdentityFields } from "../../components/workstation-identity-bootstrap";
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

    redirect(assertion.access === "blocked" ? "/workstation-blocked" : "/branch");
  }

  const showError = params?.result === "error" && params.detail;

  return (
    <main className="login-page">
      <div className="login-stack">
        <section className="login-card">
          <p className="eyebrow">Secure this workstation</p>
          <h1>Finish branch-manager security setup</h1>
          <p className="muted">
            Change the temporary password, create the transaction PIN, and then this
            browser profile will be trusted for branch-manager access.
          </p>
        </section>

        <section className="login-card">
          <form action={completeBranchManagerSetupAction} className="space-y-4">
            <WorkstationIdentityFields />

            {profile.must_change_password ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="currentPassword">
                    Current Temporary Password
                  </label>
                  <input
                    autoComplete="current-password"
                    id="currentPassword"
                    name="currentPassword"
                    placeholder="Enter current temporary password"
                    required
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="newPassword">
                    New Password
                  </label>
                  <input
                    autoComplete="new-password"
                    id="newPassword"
                    minLength={8}
                    name="newPassword"
                    placeholder="Choose a permanent password"
                    required
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="confirmNewPassword">
                    Confirm New Password
                  </label>
                  <input
                    autoComplete="new-password"
                    id="confirmNewPassword"
                    minLength={8}
                    name="confirmNewPassword"
                    placeholder="Re-enter the new password"
                    required
                    type="password"
                  />
                </div>
              </>
            ) : null}

            {profile.requires_pin_setup ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="transactionPin">
                    Transaction PIN
                  </label>
                  <input
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="confirmTransactionPin">
                    Confirm Transaction PIN
                  </label>
                  <input
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
                </div>
              </>
            ) : null}

            {showError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {params?.detail}
              </div>
            ) : null}

            <button className="button w-full" type="submit">
              Complete Security Setup
            </button>
          </form>

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
