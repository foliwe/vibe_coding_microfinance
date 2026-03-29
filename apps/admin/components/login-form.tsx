import { redirect } from "next/navigation";

import { createClient } from "../lib/supabase/server";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

async function signInAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/login?reason=invalid-credentials");
  }

  const supabase = await createClient();
  const result = await supabase.auth.signInWithPassword({ email, password });

  if (result.error) {
    redirect("/login?reason=invalid-credentials");
  }

  const { data: profileRows } = await supabase.rpc("get_my_profile");
  const profile = Array.isArray(profileRows) ? profileRows[0] : null;
  const role = profile?.role;

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
        <form action={signInAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input autoComplete="email" id="email" name="email" placeholder="admin@example.com" required type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              autoComplete="current-password"
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              type="password"
            />
          </div>
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
