import { redirect } from "next/navigation";

import {
  getCurrentWorkstationIdentity,
  isWorkstationTokenConfigurationError,
  isBranchManagerSetupComplete,
  syncWorkstationIdentityFromFormData,
} from "../lib/staff-device";
import { recordStaffAuthEvent } from "../lib/fraud";
import { createClient } from "../lib/supabase/server";
import { AdminFormField } from "./admin-form-field";
import { WorkstationIdentityFields } from "./workstation-identity-bootstrap";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { FieldGroup } from "./ui/field";
import { Input } from "./ui/input";

async function signInAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/login?reason=invalid-credentials");
  }

  try {
    await syncWorkstationIdentityFromFormData(formData);
  } catch (error) {
    if (isWorkstationTokenConfigurationError(error)) {
      redirect("/login?reason=workstation-config-missing");
    }

    throw error;
  }

  const supabase = await createClient();
  const result = await supabase.auth.signInWithPassword({ email, password });

  if (result.error) {
    redirect("/login?reason=invalid-credentials");
  }

  const { data: profileRows, error: profileError } = await supabase.rpc("get_my_profile");
  const profile = Array.isArray(profileRows) ? profileRows[0] : null;
  const role = profile?.role;

  if (profileError || !profile) {
    await supabase.auth.signOut();
    redirect("/login?reason=profile-missing");
  }

  if (role !== "admin" && role !== "branch_manager") {
    await supabase.auth.signOut();
    redirect("/login?reason=unauthorized");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?reason=unauthorized");
  }

  const identity = await getCurrentWorkstationIdentity();
  await recordStaffAuthEvent(supabase, {
    channel: "admin_web",
    deviceId: identity.id,
    deviceKind: identity.kind,
    deviceName: identity.name,
  });

  if (role === "branch_manager" && profile && !isBranchManagerSetupComplete(profile)) {
    redirect("/setup");
  }

  redirect(role === "branch_manager" ? "/branch" : "/");
}

export function LoginForm() {
  return (
    <Card className="border border-border/70 bg-card/95 shadow-sm backdrop-blur">
      <CardHeader>
        <CardTitle>Sign in to the admin console</CardTitle>
        <CardDescription>
          Use an admin or branch-manager account. Agent and member access stays in the mobile app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signInAction}>
          <WorkstationIdentityFields />
          <FieldGroup className="mt-4 gap-4">
            <AdminFormField htmlFor="email" label="Email">
              <Input
                autoComplete="email"
                id="email"
                name="email"
                placeholder="Enter email address"
                required
                type="email"
              />
            </AdminFormField>
            <AdminFormField htmlFor="password" label="Password">
              <Input
                autoComplete="current-password"
                id="password"
                name="password"
                placeholder="Enter your password"
                required
                type="password"
              />
            </AdminFormField>
            <Button className="w-full" type="submit">
              Sign in
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
