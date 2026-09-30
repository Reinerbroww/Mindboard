import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_FALLBACK_MODEL = "gemini-3.8-flash";

/**
 * Hard cap for a single AI attempt. A single map generation uses at most two
 * attempts (primary + one fallback), so this bounds worst-case total AI time to
 * roughly 44s and keeps the request well inside the Vercel runtime limit.
 */
export const AI_ATTEMPT_TIMEOUT_MS = 22_000;

export function createAiModel(modelId?: string) {
  const model = modelId || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY.");
  }

  return google(model);
}

/**
 * Returns the ordered, de-duplicated model list for ONE generation:
 * the primary model and at most one known-valid fallback. Fallbacks come from
 * GEMINI_MODELS; when unset, a safe fallback defined in code is used.
 */
export function getAiModelIds(): string[] {
  const primary = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  const configuredFallbacks = (process.env.GEMINI_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m && m !== primary);

  const codeFallback =
    primary === DEFAULT_FALLBACK_MODEL ? DEFAULT_MODEL : DEFAULT_FALLBACK_MODEL;
  const firstFallback = configuredFallbacks[0] ?? codeFallback;

  return Array.from(new Set([primary, firstFallback].filter(Boolean)));
}

export function isTransientAiError(err: unknown): boolean {
  const candidate = err as { statusCode?: number; message?: string };
  if (candidate?.statusCode === 503 || candidate?.statusCode === 429) {
    return true;
  }
  if (typeof candidate?.message === "string") {
    return /high demand|overloaded|rate limit|quota|UNAVAILABLE|RESOURCE_EXHAUSTED|busy|temporarily unavailable/i.test(
      candidate.message,
    );
  }
  return false;
}

export function isParseOrTruncationError(err: unknown): boolean {
  const candidate = err as { name?: string; message?: string; cause?: { message?: string } };
  const msg = (candidate?.message || "") + (candidate?.cause?.message || "");
  return (
    candidate?.name === "AI_NoObjectGeneratedError" ||
    candidate?.name === "AI_JSONParseError" ||
    /JSON|parse|Unterminated string|finishReason|length/i.test(msg)
  );
}

export function isModelUnavailableError(err: unknown): boolean {
  const candidate = err as { statusCode?: number; message?: string };
  if (typeof candidate?.message !== "string") {
    return false;
  }
  if (candidate.statusCode === 404) {
    return true;
  }
  return /no longer available|not found|not supported|does not exist|MODEL_NOT_FOUND/i.test(
    candidate.message,
  );
}

export type AiErrorCategory =
  | "rate_limit"
  | "service_unavailable"
  | "invalid_request"
  | "auth_permission"
  | "model_unavailable"
  | "timeout"
  | "unknown";

export interface AiErrorDetail {
  category: AiErrorCategory;
  status: number | null;
  code: string | null;
  message: string;
  retryAfter: string | null;
}

function extractResponseBody(err: unknown): Record<string, unknown> | null {
  const candidate = err as Record<string, unknown>;
  for (const key of ["responseBody", "body", "errorBody", "data"]) {
    const value = candidate?.[key];
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        /* not JSON */
      }
    }
    if (value && typeof value === "object") {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

function extractRetryAfter(err: unknown): string | null {
  const candidate = err as {
    responseHeaders?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    message?: string;
    cause?: { message?: string };
  };
  const headers = candidate?.responseHeaders ?? candidate?.headers;
  if (headers) {
    const value = headers["retry-after"] ?? headers["Retry-After"];
    if (value != null) return String(value);
  }
  const body = extractResponseBody(err);
  const details = (body as { error?: { details?: { retryDelay?: unknown }[] } })
    ?.error?.details;
  if (Array.isArray(details)) {
    const retry = details.find((entry) => entry?.retryDelay != null);
    if (retry?.retryDelay != null) return String(retry.retryDelay);
  }
  for (const message of [candidate?.message, candidate?.cause?.message]) {
    if (typeof message !== "string") continue;
    const match = message.match(/retry in ([\d.]+)\s*(ms|seconds?|s)\b/i);
    if (match) return `${match[1]}${match[2]}`;
  }
  return null;
}

export function classifyAiError(err: unknown): AiErrorDetail {
  const candidate = err as {
    name?: string;
    code?: string;
    message?: string;
    statusCode?: number;
    status?: number;
    cause?: { statusCode?: number; code?: string; message?: string };
    response?: { status?: number };
  };
  const body = extractResponseBody(err);
  const errorBody = (body?.error ?? {}) as Record<string, unknown>;
  const cause = candidate?.cause;

  const status =
    candidate?.statusCode ??
    candidate?.status ??
    cause?.statusCode ??
    candidate?.response?.status ??
    (typeof errorBody.code === "number" ? errorBody.code : null) ??
    null;

  const code =
    (typeof errorBody.status === "string" ? errorBody.status : null) ??
    (typeof candidate.code === "string" ? candidate.code : null) ??
    (typeof cause?.code === "string" ? cause.code : null) ??
    (typeof errorBody.code === "string" ? errorBody.code : null) ??
    null;

  const message =
    (typeof errorBody.message === "string" ? errorBody.message : null) ??
    candidate?.message ??
    String(err ?? "unknown AI error");

  const retryAfter = extractRetryAfter(err);

  const nameAndMessage = `${candidate?.name ?? ""} ${message}`;
  const isTimeout =
    (status === null || status === undefined) &&
    /timeout|timed out|ETIMEDOUT|UND_ERR|socket hang up|abort/i.test(nameAndMessage);

  const quotaHint =
    /quota|rate limit|rate_limit|RESOURCE_EXHAUSTED|insufficient_quota/i.test(
      `${nameAndMessage} ${JSON.stringify(body ?? {})}`,
    );

  let category: AiErrorCategory;
  if (isModelUnavailableError(err)) {
    category = "model_unavailable";
  } else if (isTimeout) {
    category = "timeout";
  } else if (status === 429 || (status == null && quotaHint)) {
    category = "rate_limit";
  } else if (status === 503) {
    category = "service_unavailable";
  } else if (status === 400) {
    category = "invalid_request";
  } else if (status === 401 || status === 403) {
    category = "auth_permission";
  } else if (status === 404) {
    category = "model_unavailable";
  } else {
    category = "unknown";
  }

  return { category, status, code, message, retryAfter };
}

/**
 * Error that carries the final classified outcome of an exhausted AI chain.
 * `errors.ts` maps `category` to a deterministic, user-safe message, so no raw
 * provider error ever reaches the client.
 */
export class AiServiceError extends Error {
  readonly category: AiErrorCategory;
  readonly status: number | null;
  readonly code: string | null;
  readonly model: string | null;

  constructor(detail: AiErrorDetail, model: string | null) {
    super(detail.message);
    this.name = "AiServiceError";
    this.category = detail.category;
    this.status = detail.status;
    this.code = detail.code;
    this.model = model;
  }
}

export function truncateMaterialForAi(text: string, maxChars = 16_000): string {
  if (!text || text.length <= maxChars) return text;

  const headLength = Math.floor(maxChars * 0.75);
  const tailLength = maxChars - headLength;

  const head = text.slice(0, headLength);
  const tail = text.slice(-tailLength);

  return `${head}\n\n[... material truncated for AI processing capacity ...]\n\n${tail}`;
}

function formatLog(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ");
}

/**
 * Runs a SINGLE `generateText` call. Bounded policy for production safety:
 * - At most 2 attempts total: the primary model, then one known-valid fallback.
 * - Each attempt is hard-capped by `AI_ATTEMPT_TIMEOUT_MS` and aborted.
 * - No exponential retries, no cross-model loops, no waiting on retry-after.
 * - Provider-level retries are disabled (`maxRetries: 0`).
 * On failure an `AiServiceError` is thrown with the classified category so the
 * route can return a deterministic, user-safe message.
 */
export async function generateTextWithRetry<STRUCTURE = unknown>(
  params: { prompt: string; output?: unknown; maxOutputTokens?: number },
  options?: { requestId?: string },
): Promise<{ output: STRUCTURE; text: string }> {
  const requestId = options?.requestId ?? "unknown";
  const models = getAiModelIds();

  let lastDetail: AiErrorDetail | null = null;

  for (const [index, modelId] of models.entries()) {
    const attempt = index + 1;
    const attemptStart = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("AI request timed out")),
      AI_ATTEMPT_TIMEOUT_MS,
    );

    try {
      const result = await generateText(
        {
          ...params,
          model: createAiModel(modelId),
          maxRetries: 0,
          abortSignal: controller.signal,
        } as unknown as Parameters<typeof generateText>[0],
      );

      clearTimeout(timer);
      console.error(
        `[AI ATTEMPT] ${formatLog({
          requestId,
          model: modelId,
          attempt,
          maxAttempts: models.length,
          outcome: "success",
          elapsedMs: Math.round(performance.now() - attemptStart),
        })}`,
      );
      return result as unknown as { output: STRUCTURE; text: string };
    } catch (err) {
      clearTimeout(timer);
      const elapsedMs = Math.round(performance.now() - attemptStart);
      let detail = classifyAiError(err);
      if (controller.signal.aborted) {
        detail = { ...detail, category: "timeout" as const, status: null };
      }
      lastDetail = detail;

      console.error(
        `[AI ATTEMPT] ${formatLog({
          requestId,
          model: modelId,
          attempt,
          maxAttempts: models.length,
          outcome: "failure",
          category: detail.category,
          status: detail.status ?? "-",
          elapsedMs,
        })}`,
      );

      // Continue to the single fallback attempt if one remains.
      if (index < models.length - 1) continue;

      // No fallback left: fail fast with a classified, user-safe error.
      throw new AiServiceError(
        lastDetail ?? {
          category: "unknown",
          status: null,
          code: null,
          message: "AI request failed without a classified error.",
          retryAfter: null,
        },
        modelId,
      );
    }
  }

  throw new AiServiceError(
    lastDetail ?? {
      category: "unknown",
      status: null,
      code: null,
      message: "AI request failed without a classified error.",
      retryAfter: null,
    },
    models[0] ?? null,
  );
}