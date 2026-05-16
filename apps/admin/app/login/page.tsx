import { redirectIfSignedIn } from "../../lib/auth";
import {
  AuthCard,
  AuthCardContent,
  AuthCardHeader,
  AuthShell,
} from "../../components/auth-shell";
import { hasSupabaseEnv } from "../../lib/supabase/env";
import { LoginForm } from "../../components/login-form";
import { Notice } from "../../components/notice";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  if (!hasSupabaseEnv()) {
    return (
      <AuthShell>
        <AuthCard>
          <AuthCardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Configuration required
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Supabase credentials are missing
            </h1>
            <p className="text-sm text-muted-foreground">
              Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
              to your environment, then restart the admin app.
            </p>
          </AuthCardHeader>
        </AuthCard>
      </AuthShell>
    );
  }

  await redirectIfSignedIn();
  const params = await searchParams;
  const showUnauthorized = params?.reason === "unauthorized";
  const showProfileMissing = params?.reason === "profile-missing";
  const showWorkstationConfigMissing = params?.reason === "workstation-config-missing";
  const showWorkstationRebind = params?.reason === "workstation-rebind";

  return (
    <AuthShell>
      <div className="flex flex-col gap-4">
        {showUnauthorized ? (
          <Notice title="Access denied" tone="warning">
            <p>This web panel is for admins and branch managers only.</p>
            <p>Agent and member accounts should use the Expo mobile app instead.</p>
          </Notice>
        ) : null}
        {showProfileMissing ? (
          <Notice title="Profile missing" tone="warning">
            <p>This user authenticated, but no matching admin profile was found.</p>
            <p>
              Make sure the user has a row in `public.profiles` with the same Auth user ID
              and a role of `admin` or `branch_manager`.
            </p>
          </Notice>
        ) : null}
        {showWorkstationConfigMissing ? (
          <Notice title="Security configuration required" tone="warning">
            <p>Workstation token signing is not configured.</p>
            <p>
              Add `STAFF_DEVICE_TOKEN_SECRET` to the admin app environment, then restart
              the app before branch managers sign in again.
            </p>
          </Notice>
        ) : null}
        {showWorkstationRebind ? (
          <Notice title="Workstation check failed" tone="error">
            <p>Refresh and sign in again to rebind this workstation token.</p>
            <p>
              The secure workstation token could not be validated. Retry sign-in to create
              a new trusted workstation binding.
            </p>
          </Notice>
        ) : null}
        <LoginForm />
      </div>
    </AuthShell>
  );
}
