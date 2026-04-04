import { redirectIfSignedIn } from "../../lib/auth";
import { hasSupabaseEnv } from "../../lib/supabase/env";
import { LoginForm } from "../../components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  if (!hasSupabaseEnv()) {
    return (
      <main className="login-page">
        <section className="login-card">
          <p className="eyebrow">Configuration required</p>
          <h1>Supabase credentials are missing</h1>
          <p className="muted">
            Add `NEXT_PUBLIC_SUPABASE_URL` and
            `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to your environment, then restart
            the admin app.
          </p>
        </section>
      </main>
    );
  }

  await redirectIfSignedIn();
  const params = await searchParams;
  const showUnauthorized = params?.reason === "unauthorized";
  const showProfileMissing = params?.reason === "profile-missing";
  const showWorkstationRebind = params?.reason === "workstation-rebind";

  return (
    <main className="login-page">
      <div className="login-stack">
        {showUnauthorized ? (
          <section className="login-card">
            <p className="eyebrow">Access denied</p>
            <h1>This web panel is for admins and branch managers only</h1>
            <p className="muted">
              Agent and member accounts should use the Expo mobile app instead of the admin
              panel.
            </p>
          </section>
        ) : null}
        {showProfileMissing ? (
          <section className="login-card">
            <p className="eyebrow">Profile missing</p>
            <h1>This user authenticated, but no matching admin profile was found</h1>
            <p className="muted">
              Make sure the user has a row in `public.profiles` with the same Auth user ID and
              a role of `admin` or `branch_manager`.
            </p>
          </section>
        ) : null}
        {showWorkstationRebind ? (
          <section className="login-card">
            <p className="eyebrow">Workstation check failed</p>
            <h1>Refresh and sign in again to rebind this workstation token</h1>
            <p className="muted">
              The secure workstation token could not be validated. Retry sign-in to create a new
              trusted workstation binding.
            </p>
          </section>
        ) : null}
        <LoginForm />
      </div>
    </main>
  );
}
