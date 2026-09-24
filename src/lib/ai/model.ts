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
        console.warn(
          `[ai retry] Model ${modelId} attempt ${attempt + 1}/${maxAttemptsPerModel} failed:`,
          err instanceof Error ? err.message : err
        );

        if (isModelUnavailableError(err)) {
          break;
        }

        if (!isTransientAiError(err) && !isParseOrTruncationError(err)) {
          throw err;
        }

        if (attempt < maxAttemptsPerModel - 1) {
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