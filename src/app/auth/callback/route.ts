import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath, isPlausibleAuthCode } from "@/lib/security/redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error_description");

  // A direct navigation (no code, no error) should never land here.
  if (!code && !errorParam) {
    return NextResponse.redirect(`${origin}/login?error=invalid_callback`);
  }

  const nextPath = sanitizeNextPath(searchParams.get("next"));

  if (code && isPlausibleAuthCode(code)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${nextPath}`);
    }
  }

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorParam)}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=sign_in_failed`);
}