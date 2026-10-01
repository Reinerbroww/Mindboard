import { generateTextWithRetry, truncateMaterialForAi } from "@/lib/ai/model";

export async function explainConcept(params: {
  concept: string;
  description: string | null;
  material: string;
  requestId?: string;
  language?: "en" | "id";
}): Promise<string> {
  const langInstr =
    params.language === "id"
      ? "Generate all user-facing content in Indonesian. Use natural Indonesian terms appropriate for learning."
      : "Generate all user-facing content in English.";
  const prompt = [
    "You are a patient teacher helping a student with their study material.",
    "",
    langInstr,
    "",
    "The student clicked a node in their knowledge map. Explain this concept to them in a simple, friendly way, as you would in a classroom:",
    "CONCEPT: " + params.concept,
    "",
    "How to explain:",
    "- Start with a plain-language definition any student understands.",
    "- Walk through how it works, step by step, with small concrete examples.",
    "- Connect it to related ideas so the student sees the bigger picture.",
    "- End with the key takeaway they should remember.",
    "- Use clear, warm language. Short sentences. Never talk down, never overload.",
    "",
    "About the study material:",
    "- Use the material below as your main source when it covers the concept.",
    "- If the concept APPEARS in the material, ground your explanation in it, and it is fine to quote its terms.",
    "- If the concept does NOT appear in the material, explain it fully from general knowledge anyway — the student still needs a useful answer. In that case add this line at the end:",
    "\"Note: this concept is not in your study material, so this explanation comes from general knowledge.\"",
    "",
    "Structure your answer like this (plain text, no Markdown):",
    "",
    "What it means",
    "<simple definition>",
    "",
    "How it works",
    "<step-by-step walkthrough with a concrete example>",
    "",
    "Why it matters",
    "<importance and connections to related concepts>",
    "",
    "Key takeaway",
    "<one memorable sentence>",
    params.description ? `Note on this node from the student: ${params.description}` : "",
    "Study material:",
    truncateMaterialForAi(params.material, 16_000),
  ]
    .filter(Boolean)
    .join("\n");

  const { text } = await generateTextWithRetry(
    {
      prompt,
      maxOutputTokens: 2048,
    },
    { requestId: params.requestId },
  );

  return text.trim();
}