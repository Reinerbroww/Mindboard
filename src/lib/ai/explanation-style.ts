/**
 * Shared explanation-style instructions.
 *
 * Every AI feature that writes prose for the student (Explain, Expand, Explain
 * Connection) pulls its style from here, so the tone stays consistent and there
 * is a single place to adjust it. The instruction asks for beginner-friendly
 * wording while explicitly protecting accuracy and the adult register of the
 * product.
 */

export type ExplanationLanguage = "en" | "id";

const LANGUAGE_NAME: Record<ExplanationLanguage, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

const LANGUAGE_INSTRUCTION: Record<ExplanationLanguage, string> = {
  en: "Write every user-facing value in natural English.",
  id: "Write every user-facing value in natural Indonesian.",
};

/**
 * Single sentence telling the model which language to write in. Kept separate
 * from the style block so map generation and translation can reuse it too.
 */
export function languageInstruction(
  language: ExplanationLanguage
): string {
  return LANGUAGE_INSTRUCTION[language];
}

export function languageName(language: ExplanationLanguage): string {
  return LANGUAGE_NAME[language];
}

/**
 * The shared explanation-style brief. Plain prose per paragraph so it drops
 * cleanly into the existing prompt arrays.
 */
export function beginnerFriendlyExplanation(
  language: ExplanationLanguage
): string {
  return [
    `Explain in ${LANGUAGE_NAME[language]} using very simple language, as if you are explaining it to a beginner or a young student.`,
    "",
    "Use short and clear sentences.",
    "Avoid unnecessary technical jargon.",
    "If a technical term is necessary, explain it in simple words.",
    "Use a simple example when helpful.",
    "Focus on helping the user understand the concept rather than sounding academic.",
    "Keep the explanation concise but complete.",
    "Do not make the explanation childish or inaccurate.",
    "Explain one idea at a time and stay technically accurate.",
  ].join("\n");
}