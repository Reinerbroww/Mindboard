import { Output } from "ai";
import { z } from "zod";
import { generateTextWithRetry, truncateMaterialForAi } from "@/lib/ai/model";

const expandedConceptSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(255),
  /** Short line shown on the node card itself. Keep it to one clause. */
  description: z.string().max(240).default(""),
  /** The full explanation of the concept, shown in the Expand panel. */
  detail: z.string().min(1).max(700),
  /** Why this concept belongs under the concept that was expanded. */
  whyItMatters: z.string().min(1).max(400),
  /** Optional concrete illustration; omitted when it would not help. */
  example: z.string().max(400).optional(),
});

const expandResultSchema = z.object({
  nodes: z.array(expandedConceptSchema).min(1).max(6),
});

export interface ExpandedConcept {
  id: string;
  label: string;
  description: string;
  level: number;
  detail: string;
  whyItMatters: string;
  example?: string;
}

export interface ExpandParams {
  concept: string;
  material: string;
  existingLabels: string[];
  /** Labels already attached to this concept, so new ones complement them. */
  siblingLabels?: string[];
  requestId?: string;
  language?: "en" | "id";
}

export async function expandConcept({
  concept,
  material,
  existingLabels,
  siblingLabels = [],
  requestId,
  language = "en",
}: ExpandParams): Promise<ExpandedConcept[]> {
  const langInstr =
    language === "id"
      ? "Write every user-facing value in natural Indonesian, appropriate for learning."
      : "Write every user-facing value in natural English.";

  const prompt = [
    "You are a patient tutor expanding one concept in a student's knowledge map.",
    "",
    langInstr,
    "",
    "For every sub-concept you add, explain what it actually means, not just its name.",
    "",
    "Fields:",
    "- label: the sub-concept name, 2-6 words.",
    "- description: one short clause (max 15 words) for the node card.",
    "- detail: 2-3 sentences teaching the concept itself, grounded in the material.",
    "- whyItMatters: 1-2 sentences on why this concept belongs under the concept being expanded.",
    "- example: optional. A short concrete example. Omit the key entirely when no real example helps.",
    "",
    "Rules:",
    "- Generate 3 to 6 sub-concepts that are directly related to the selected concept.",
    "- Ground every sub-concept in the material provided. Do not invent concepts.",
    "- Never repeat a label that already exists in the map or is already attached to this concept.",
    "- Use unique ids like e1, e2, e3.",
    "- Plain prose per field. No Markdown headings, no bullet characters, no emoji.",
    "",
    `Concept being expanded: ${concept}`,
    siblingLabels.length
      ? `Sub-concepts already attached to it (do not repeat these): ${siblingLabels.join(", ")}`
      : "",
    existingLabels.length
      ? `Existing concepts in the map (do not repeat these): ${existingLabels.join(", ")}`
      : "",
    "Material:",
    truncateMaterialForAi(material, 16_000),
  ]
    .filter(Boolean)
    .join("\n");

  const { output } = await generateTextWithRetry<z.infer<typeof expandResultSchema>>(
    {
      output: Output.object({
        schema: expandResultSchema,
        name: "ExpandedConcepts",
        description:
          "Sub-concepts with a detailed explanation of what each one means.",
      }),
      prompt,
      // Budget covers 3-6 concepts across four fields each; the per-attempt
      // timeout is unchanged, so this stays inside the existing retry budget.
      maxOutputTokens: 3072,
    },
    { requestId },
  );

  const nodes = output.nodes;
  if (!nodes || nodes.length === 0) {
    throw new Error("AI returned an invalid expansion.");
  }

  // `level` is a placeholder: the route sets the real depth from the parent
  // row it already has, so the AI never has to reason about the tree shape.
  return nodes.map((node) => ({
    id: node.id,
    label: node.label,
    description: node.description ?? "",
    level: 0,
    detail: node.detail.trim(),
    whyItMatters: node.whyItMatters.trim(),
    ...(node.example ? { example: node.example.trim() } : {}),
  }));
}
