import { generateTextWithRetry, truncateMaterialForAi } from "@/lib/ai/model";

export async function explainConcept(params: {
  concept: string;
  description: string | null;
  material: string;
}): Promise<string> {
  const prompt = [
    "You are an academic study assistant explaining a concept from a student's knowledge map.",
    "",
    "The NODE TITLE the student clicked is the concept to explain: " + params.concept,
    "",
    "Rules:",
    "- Explain ONLY what the provided material supports. Never invent facts.",
    "- If the concept is missing from the material, begin with: \"This concept is not covered in the provided material.\" and do not guess.",
    "- Write like a well-structured academic note: precise, objective, and concise.",
    "",
    "Structure your answer exactly as follows (plain text, one section per label, no Markdown):",
    "",
    "Definition",
    "<1-2 precise sentences defining the concept as presented in the material>",
    "",
    "Context",
    "<where the concept sits in the broader topic, and why it matters>",
    "",
    "Key Points",
    "- <detail grounded in the material>",
    "- <detail grounded in the material>",
    "- <3-5 bullets maximum>",
    "",
    "Significance",
    "<its role, real-world relevance, or connection to other concepts named in the material>",
    "",
    "References to the Material",
    "<one sentence pointing back to where the material discusses this concept>",
    params.description ? `Stored note on this node: ${params.description}` : "",
    "Material:",
    truncateMaterialForAi(params.material, 16_000),
  ]
    .filter(Boolean)
    .join("\n");

  const { text } = await generateTextWithRetry({
    prompt,
  });

  return text.trim();
}