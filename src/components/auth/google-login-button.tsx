"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { sanitizeNextPath } from "@/lib/security/redirect";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.59-5.17 3.59-8.81Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.25 0 5.97-1.08 7.96-2.92l-3.87-3c-1.08.72-2.45 1.15-4.09 1.15-3.14 0-5.8-2.12-6.75-4.97H1.28v3.09A12 12 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.25 14.26a7.2 7.2 0 0 1 0-4.52V6.65H1.28a12 12 0 0 0 0 10.7l3.97-3.09Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.43-3.43A12 12 0 0 0 1.28 6.65l3.97 3.09C6.2 6.89 8.86 4.77 12 4.77Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleLoginButton({
  label = "Continue with Google",
}: {
  label?: string;
}) {
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get("next"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleGoogle}
        disabled={loading}
      >
        <GoogleIcon />
        {loading ? "Redirecting to Google..." : label}
      </Button>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}