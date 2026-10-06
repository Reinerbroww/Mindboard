/**
 * Shared instruction for the three teaching features: Explain, Expand, and
 * Explain Connection.
 *
 * The reader may be young, may be an adult returning to school, or may be new
 * to the subject entirely, so every explanation leads with plain everyday
 * language instead of textbook phrasing.
 *
 * Only the teaching prompts use this. Map generation keeps its own wording, so
 * the structure step is not affected by this file.
 */
export const PLAIN_LANGUAGE_STYLE = [
  "Assume the reader may be young, or may be meeting this subject for the first time:",
  "- Use the simplest words that are still accurate. Everyday words beat technical ones.",
  "- If a technical word is unavoidable, still use it, but explain it in plain words the first time it appears.",
  "- One idea per sentence. Keep sentences short.",
  "- Use a familiar, everyday example whenever one fits. Make it concrete before making it abstract.",
  "- Say the cause and the effect out loud. Do not skip the step in between.",
  "- Never talk down to the reader. Do not use words like obvious, simple, just, or easy.",
  "- Accuracy comes first. If plain wording would change the meaning, keep the precise wording and explain it plainly instead.",
].join("\n");

/** Human-readable name of a map content language, for prompt wording. */
export function languageName(language: "en" | "id"): string {
  return language === "id" ? "Indonesian (Bahasa Indonesia)" : "English";
}

/** Same plain-language intent as the teaching prompts, for post-creation work. */
export function languageInstruction(language: "en" | "id"): string {
  return (
    language === "id"
      ? "Write every user-facing value in natural Indonesian, using simple everyday words a student understands."
      : "Write every user-facing value in natural English, using simple everyday words a student understands."
  );
}