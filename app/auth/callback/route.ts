import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GitHub OAuth callback handler.
 *
 * Supabase redirects here after the user authorises the GitHub app.
 * `exchangeCodeForSession(code)` stores the session (including
 * `provider_token` — the GitHub access token) in the auth cookie so that
 * server routes can read it via `supabase.auth.getSession()`.
 *
 * Without this step, `session.provider_token` is always undefined.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // Optional: redirect to a specific page after login
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[CodeOrbit] auth/callback – exchangeCodeForSession failed", error);
      // Redirect to login with error message
      return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, request.url));
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
