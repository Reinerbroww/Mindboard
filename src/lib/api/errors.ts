import { NextResponse } from "next/server";
import { AiServiceError, type AiErrorCategory } from "@/lib/ai/model";

/** Error that can safely have its `message` shown to the user. */
export class UserFacingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserFacingError";
    this.status = status;
  }
}

const AI_ERROR_MESSAGES: Record<AiErrorCategory, { message: string; status: number }> = {
  rate_limit: {
    message:
      "Mindboard's AI service is temporarily rate-limited. Please try again in a moment.",
    status: 429,
  },
  service_unavailable: {
    message:
      "Mindboard's AI service is busy right now. Please try again in a few seconds.",
    status: 503,
  },
  timeout: {
    message:
      "The AI took too long to generate this map. Try using a shorter material or try again.",
    status: 504,
  },
  invalid_request: {
    message: "The material could not be processed. Please try another document or shorter input.",
    status: 400,
  },
  auth_permission: {
    message: "The AI service configuration is unavailable. Please contact the administrator.",
    status: 500,
  },
  model_unavailable: {
    message:
      "Mindboard's AI model is temporarily unavailable. Please try again in a moment.",
    status: 503,
  },
  unknown: {
    message: "The AI could not complete the request. Please try again in a moment.",
    status: 502,
  },
};

/**
 * Return a JSON error response. Only user-facing messages pass through;
 * anything else is masked so internal details never leak to clients.
 */
export function errorResponse(err: unknown, fallback = "Something went wrong."): NextResponse {
  if (err instanceof UserFacingError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (err instanceof AiServiceError) {
    const info = AI_ERROR_MESSAGES[err.category] ?? AI_ERROR_MESSAGES.unknown;
    console.error(
      `[api] AI request failed (category=${err.category}, status=${err.status ?? "-"}, model=${err.model ?? "-"}). Underlying: ${err.message}`,
    );
    return NextResponse.json({ error: info.message }, { status: info.status });
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

  console.error("[api]", err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}