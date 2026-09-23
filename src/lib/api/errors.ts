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

  if (isTransientAiError(err)) {
    return NextResponse.json(
      { error: "The AI service is busy right now. Please try again in a few seconds." },
      { status: 503 },
    );
  }

  console.error("[api]", err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}