import { Output } from "ai";
import { z } from "zod";
import { generateTextWithRetry, truncateMaterialForAi } from "@/lib/ai/model";
import { PLAIN_LANGUAGE_STYLE } from "@/lib/ai/explanation-style";

export const explainConnectionResultSchema = z.object({
  overview: z.string().min(1).max(600),
  howTheyConnect: z.array(z.string().min(1).max(300)).min(1).max(4),
  whyItMatters: z.string().min(1).max(600),
  example: z.string().min(1).max(600).optional(),
  keyTakeaway: z.string().min(1).max(300),
  uncertain: z.boolean().optional(),
});

export type ExplainConnectionResult = z.infer<typeof explainConnectionResultSchema>;

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
  parentLabel?: string | null;
  childLabels?: string[];
  material: string;
  language?: "en" | "id";
  requestId?: string;
}

export async function explainConnection({
  parent,
  child,
  relationship,
  parentLabel,
  childLabels = [],
  material,
  language = "en",
  requestId,
}: ExplainConnectionParams): Promise<ExplainConnectionResult> {
  const langInstr =
    language === "id"
      ? "Write every value in natural Indonesian, appropriate for learning."
      : "Write every value in natural English.";

  const prompt = [
    "You are a patient teacher helping a student understand the relationship between two concepts on a knowledge map.",
    "",
    langInstr,
    "",
    PLAIN_LANGUAGE_STYLE,
    "",
    "Explain ONLY the connection between the two concepts. Do not define each concept separately.",
    "",
    `Parent concept: ${parent.label}`,
    parent.description ? `Parent description: ${parent.description}` : "",
    `Child concept: ${child.label}`,
    child.description ? `Child description: ${child.description}` : "",
    relationship ? `Relationship label on the edge: ${relationship}` : "",
    parentLabel ? `Other concept this child already connects to: ${parentLabel}` : "",
    childLabels.length > 0
      ? `Children already on the map for this child: ${childLabels.join(", ")}`
      : "",
    "",
    "Study material:",
    truncateMaterialForAi(material, 16_000),
    "",
    "Answer with the structured output using every field:",
    "- overview: 1-2 sentences naming what the relationship is.",
    "- howTheyConnect: 2-3 short ordered steps, one sentence each.",
    "- whyItMatters: 1-2 sentences on why this connection helps the student.",
    "- example: optional. Include only when a concrete example genuinely helps; otherwise omit the key.",
    "- keyTakeaway: one memorable sentence.",
    "",
    "Rules:",
    "- If the material does not support a clear relationship, still fill the fields but set uncertain=true and describe the gap honestly instead of inventing a connection.",
    "- Plain prose per field. No Markdown headings, no bullet characters, no emoji.",
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
        description:
          "Structured explanation of the relationship between two concepts on a mind map.",
      }),
      prompt,
      maxOutputTokens: 2048,
    },
    { requestId }
  );

  return {
    overview: output.overview.trim(),
    howTheyConnect: output.howTheyConnect.map((step) => step.trim()),
    whyItMatters: output.whyItMatters.trim(),
    ...(output.example ? { example: output.example.trim() } : {}),
    keyTakeaway: output.keyTakeaway.trim(),
    ...(output.uncertain ? { uncertain: true } : {}),
  };
}