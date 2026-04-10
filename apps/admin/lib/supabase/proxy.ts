import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseEnv, hasSupabaseEnv } from "./env";

const publicPaths = new Set(["/login"]);
const branchManagerSetupPath = "/setup";
const branchManagerBlockedPath = "/workstation-blocked";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (!hasSupabaseEnv()) {
    return response;
  }

  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const claimsResult = await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims ?? null;

  const isAuthenticated = typeof claims?.sub === "string";
  const { pathname } = request.nextUrl;
  const isPublicPath = publicPaths.has(pathname);
  let role: string | null = null;

  if (isAuthenticated) {
    const { data: profileRows } = await supabase.rpc("get_my_profile");
    const profile = Array.isArray(profileRows) ? profileRows[0] : null;
    role = typeof profile?.role === "string" ? profile.role : null;

    if (role === "branch_manager") {
      const setupIncomplete =
        profile?.must_change_password === true || profile?.requires_pin_setup === true;

      if (pathname === "/login") {
        return NextResponse.redirect(
          new URL(setupIncomplete ? branchManagerSetupPath : "/branch", request.url),
        );
      }

      if (setupIncomplete && pathname !== branchManagerSetupPath) {
        return NextResponse.redirect(new URL(branchManagerSetupPath, request.url));
      }

      if (!setupIncomplete && pathname === branchManagerSetupPath) {
        return NextResponse.redirect(new URL("/branch", request.url));
      }

      if (setupIncomplete && pathname === branchManagerBlockedPath) {
        return NextResponse.redirect(new URL(branchManagerSetupPath, request.url));
      }
    }
  }

  const isWebRole = role === "admin" || role === "branch_manager";

  if (!isAuthenticated && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthenticated && pathname === "/login" && isWebRole) {
    return NextResponse.redirect(new URL(role === "branch_manager" ? "/branch" : "/", request.url));
  }

  if (isAuthenticated && !isWebRole && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("reason", "unauthorized");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
