import { Output } from "ai";
import { z } from "zod";
import type { AiNode } from "@/lib/validation/schemas";
import { generateTextWithRetry } from "@/lib/ai/model";

const expandResultSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(255),
        description: z.string().optional().default(""),
      })
    )
    .min(1)
    .max(12),
});

export interface ExpandParams {
  concept: string;
  material: string;
  existingLabels: string[];
}

export async function expandConcept({
  concept,
  material,
  existingLabels,
}: ExpandParams): Promise<AiNode[]> {
  const prompt = [
    "You are a study assistant expanding a concept in a knowledge map.",
    "",
    "Rules:",
    "- Generate 3 to 6 sub-concepts that are directly related to the selected concept.",
    "- Ground every sub-concept in the material provided. Do not invent concepts.",
    "- Avoid duplicating existing concept labels.",
    "- Use unique ids like e1, e2, e3.",
    `Selected concept: ${concept}`,
    existingLabels.length
      ? `Existing concepts (do not repeat these): ${existingLabels.join(", ")}`
      : "",
    "Material:",
    material.slice(0, 40_000),
  ]
    .filter(Boolean)
    .join("\n");

  const { output } = await generateTextWithRetry<z.infer<typeof expandResultSchema>>({
    output: Output.object({
      schema: expandResultSchema,
      name: "SubConcepts",
      description: "Sub-concepts for the selected node.",
    }),
    prompt,
    maxOutputTokens: 1536,
  });

  const nodes = output.nodes;
  if (!nodes || nodes.length === 0) {
    throw new Error("AI returned an invalid expansion.");
  }

  return nodes.map((node) => ({
    id: node.id,
    label: node.label,
    description: node.description ?? "",
    level: 1,
    parentId: null,
  }));
}