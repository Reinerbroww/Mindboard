import { generateTextWithRetry } from "@/lib/ai/model";

export async function explainConcept(params: {
  concept: string;
  description: string | null;
  material: string;
}): Promise<string> {
  const prompt = [
    "You are a study assistant helping a student understand a concept.",
    "",
    "Rules:",
    "- Explain ONLY based on the provided material.",
    "- If the material does not contain the information, say so clearly. Never invent facts.",
    "- Answer in 2-4 short paragraphs.",
    "",
    `Concept: ${params.concept}`,
    params.description ? `Stored note: ${params.description}` : "",
    "Material:",
    params.material.slice(0, 30_000),
  ]
    .filter(Boolean)
    .join("\n");

  const { text } = await generateTextWithRetry({
    prompt,
  });

  return text.trim();
}