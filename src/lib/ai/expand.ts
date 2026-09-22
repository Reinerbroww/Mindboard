import { generateText, Output } from "ai";
import type { AiNode } from "@/lib/validation/schemas";
import { createAiModel } from "@/lib/ai/model";

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

  const schema = {
    title: "SubConcepts",
    description: "Sub-concepts for the selected node.",
    schema: {
      type: "object",
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: {
                type: "string",
                description: "Short concept name (max 50 chars).",
              },
              description: {
                type: "string",
                description: "One sentence grounded in the material.",
              },
            },
            required: ["id", "label", "description"],
          },
        },
      },
      required: ["nodes"],
    },
  } as const;

  const { output } = await generateText({
    model: createAiModel(),
    output: Output.json(schema),
    prompt,
  });

  const parsedOutput = output as { nodes?: Array<{ id: string; label: string; description?: string }> };
  const nodes = parsedOutput?.nodes ?? null;
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