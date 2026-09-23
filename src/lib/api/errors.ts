import { NextResponse } from "next/server";
import { isTransientAiError } from "@/lib/ai/model";

/** Error that can safely have its `message` shown to the user. */
export class UserFacingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserFacingError";
    this.status = status;
  }
}

/**
 * Return a JSON error response. Only user-facing messages pass through;
 * anything else is masked so internal details never leak to clients.
 */
export function errorResponse(err: unknown, fallback = "Something went wrong."): NextResponse {
  if (err instanceof UserFacingError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  const message = err instanceof Error ? err.message : "";

  if (/Missing GOOGLE_GENERATIVE_AI_API_KEY/.test(message)) {
    console.error("[api]", err);
    return NextResponse.json(
      {
        error:
          "Server setup error: the Google AI API key is missing. Add GOOGLE_GENERATIVE_AI_API_KEY to the Vercel environment variables and redeploy.",
      },
      { status: 500 },
    );
  }

  if (/model/i.test(message) && /not found|not supported|unavailable|no such/.test(message)) {
    console.error("[api]", err);
    return NextResponse.json(
      {
        error:
          "Server setup error: the AI model in GEMINI_MODEL is not available. Set it to gemini-3.6-flash in the Vercel environment variables and redeploy.",
      },
      { status: 500 },
    );
  }

  if (isTransientAiError(err)) {
    return NextResponse.json(
      { error: "The AI service is busy right now. Please try again in a few seconds." },
      { status: 503 },
    );
  }

  console.error("[api]", err);
  return NextResponse.json(
    { error: fallback, detail: message || "unknown" },
    { status: 500 },
  );
}