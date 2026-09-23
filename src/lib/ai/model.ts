import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const DEFAULT_MODEL = "gemini-3.6-flash";

const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-flash-latest"];

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
    return /high demand|overloaded|rate limit|quota|UNAVAILABLE|RESOURCE_EXHAUSTED|busy/i.test(
      candidate.message,
    );
  }
  return false;
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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs `generateText` with automatic retries on transient provider errors
 * (503 / 429 / high-demand), switching to a fallback Gemini model if the
 * primary model keeps failing.
 */
export async function generateTextWithRetry<STRUCTURE = unknown>(
  params: { prompt: string; output?: unknown; maxOutputTokens?: number },
  maxAttemptsPerModel = 2,
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
        if (isModelUnavailableError(err)) {
          break;
        }
        if (!isTransientAiError(err)) {
          throw err;
        }
        if (attempt < maxAttemptsPerModel - 1) {
          await sleep(700 * (attempt + 1));
        }
      }
    }
  }

  throw lastError;
}