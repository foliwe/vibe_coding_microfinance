"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

import { createClient } from "../lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    const nextPath = searchParams.get("next") || "/";
    window.location.assign(nextPath.startsWith("/") ? nextPath : "/");
  }

  return (
    <form className="login-card" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Admin access</p>
        <h1>Sign in to the admin panel</h1>
        <p className="muted">
          Only `admin` and `branch_manager` accounts should use this interface.
        </p>
      </div>

      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="manager@creditunion.com"
          type="email"
          value={email}
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          type="password"
          value={password}
        />
      </label>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <button className="button" disabled={isLoading} type="submit">
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
