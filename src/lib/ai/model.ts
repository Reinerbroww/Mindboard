import { google } from "@ai-sdk/google";

const DEFAULT_MODEL = "gemini-3.6-flash";

export function createAiModel() {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY.");
  }

  return google(model);
}