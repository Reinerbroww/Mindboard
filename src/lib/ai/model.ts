import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const DEFAULT_MODEL = "gemini-3.6-flash";

const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-flash-latest",
];

export function createAiModel(modelId?: string) {
  const model = modelId || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY.");
  }

  return google(model);
}

export function getAiModelIds(): string[] {
  const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const extras = (process.env.GEMINI_MODELS ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return Array.from(new Set([primary, ...FALLBACK_MODELS, ...extras]));
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

interface AiAttemptLog {
  modelId: string;
  attempt: number;
  retrying: boolean;
  switchModel: boolean;
  detail: AiErrorDetail;
}

export function logAiAttempt(info: AiAttemptLog): void {
  const { modelId, attempt, retrying, switchModel, detail } = info;
  console.error(
    `[AI ERROR] model=${modelId} category=${detail.category} status=${detail.status ?? "-"} code=${detail.code ?? "-"} attempt=${attempt} retrying=${retrying} switchModel=${switchModel} retryAfter=${detail.retryAfter ?? "-"} message=${JSON.stringify(detail.message)}`,
  );
}

export function truncateMaterialForAi(text: string, maxChars = 16_000): string {
  if (!text || text.length <= maxChars) return text;

  const headLength = Math.floor(maxChars * 0.75);
  const tailLength = maxChars - headLength;

  const head = text.slice(0, headLength);
  const tail = text.slice(-tailLength);

  return `${head}\n\n[... material truncated for AI processing capacity ...]\n\n${tail}`;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs `generateText` with exponential backoff + jitter retries on transient provider errors
 * (503 / 429 / high-demand / rate-limit / JSON truncation), switching to fallback Gemini models if the
 * primary model keeps failing.
 */
export async function generateTextWithRetry<STRUCTURE = unknown>(
  params: { prompt: string; output?: unknown; maxOutputTokens?: number },
  maxAttemptsPerModel = 3,
): Promise<{ output: STRUCTURE; text: string }> {
  let lastError: unknown;

  for (const modelId of getAiModelIds()) {
    for (let attempt = 0; attempt < maxAttemptsPerModel; attempt++) {
      try {
        const result = await generateText(
          { ...params, model: createAiModel(modelId) } as unknown as Parameters<
            typeof generateText
          >[0],
        );
        return result as unknown as { output: STRUCTURE; text: string };
      } catch (err) {
        lastError = err;

        const detail = classifyAiError(err);
        const unavailable = isModelUnavailableError(err);
        const recoverable = isTransientAiError(err) || isParseOrTruncationError(err);
        const retrying =
          recoverable && !unavailable && attempt < maxAttemptsPerModel - 1;
        const switchModel =
          unavailable || (recoverable && attempt >= maxAttemptsPerModel - 1);

        logAiAttempt({
          modelId,
          attempt: attempt + 1,
          retrying,
          switchModel,
          detail,
        });

        if (unavailable) {
          break;
        }

        if (!recoverable) {
          throw err;
        }

        if (retrying) {
          // Exponential backoff with random jitter (e.g. 1.2s, 2.4s, 4.8s + jitter)
          const baseDelay = 1200;
          const exponentialDelay = baseDelay * Math.pow(2, attempt);
          const jitter = Math.random() * 400;
          const delay = Math.min(exponentialDelay + jitter, 6000);
          await sleep(delay);
        }
      }
    }
  }

  throw lastError;
}