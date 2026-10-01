import { Output } from "ai";
import { z } from "zod";
import { generateTextWithRetry, truncateMaterialForAi } from "@/lib/ai/model";

const explainConnectionResultSchema = z.object({
  explanation: z.string().min(1).max(8000),
});

export interface ExplainConnectionParams {
  parent: {
    label: string;
    description: string | null;
  };
  child: {
    label: string;
    description: string | null;
  };
  relationship?: string | null;
  material: string;
  language?: "en" | "id";
  requestId?: string;
}

export async function explainConnection({
  parent,
  child,
  relationship,
  material,
  language = "en",
  requestId,
}: ExplainConnectionParams): Promise<string> {
  const langInstr =
    language === "id"
      ? "Generate all user-facing content in Indonesian. Use natural Indonesian terms appropriate for learning."
      : "Generate all user-facing content in English.";
  const prompt = [
    "You are a patient teacher helping a student understand the relationship between two concepts on a knowledge map.",
    "",
    langInstr,
    "",
    "Focus ONLY on the connection between the two concepts. Do not define each concept separately.",
    "",
    "Answer with clear, concrete explanation covering:",
    "- Why they are connected (the conceptual reason).",
    "- What role the child plays within or in relation to the parent.",
    "- How understanding the parent helps explain the child.",
    "- The conceptual flow from parent → child.",
    "",
    "Good examples explain the relationship, not two unrelated definitions.",
    "",
    `Parent concept: ${parent.label}`,
    parent.description ? `Parent description: ${parent.description}` : "",
    `Child concept: ${child.label}`,
    child.description ? `Child description: ${child.description}` : "",
    relationship ? `Relationship label on the edge: ${relationship}` : "",
    "Study material:",
    truncateMaterialForAi(material, 16_000),
    "",
    "Respond with ONLY the structured output containing a single 'explanation' field (plain text, no Markdown).",
  ]
    .filter(Boolean)
    .join("\n");

  const { output } = await generateTextWithRetry<
    z.infer<typeof explainConnectionResultSchema>
  >(
    {
      output: Output.object({
        schema: explainConnectionResultSchema,
        name: "ExplainConnection",
        description: "Explanation of the relationship between two concepts.",
      }),
      prompt,
      maxOutputTokens: 2048,
    },
    { requestId }
  );

  return output.explanation.trim();
}