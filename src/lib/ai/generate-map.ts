import { generateText, Output } from "ai";
import type { AiNode, AiEdge } from "@/lib/validation/schemas";
import { validateAiMapStructure } from "@/lib/validation/schemas";
import { createAiModel } from "@/lib/ai/model";

interface MapGenerationParams {
  material: string;
  sourceLabel: string;
}

export interface GenerateMapResult {
  title: string;
  nodes: AiNode[];
  edges: AiEdge[];
}

export async function generateMapStructure({
  material,
  sourceLabel,
}: MapGenerationParams): Promise<GenerateMapResult> {
  const prompt = [
    "You are an expert study assistant that builds knowledge maps from learning material.",
    "",
    "Rules:",
    "- Extract concepts ONLY from the provided material. Never invent concepts not supported by the material.",
    "- Prioritize the most important concepts. Keep the initial map concise and not overwhelming.",
    "- The root concept should be the main topic of the material.",
    "- Level 0 is the root (one node only). Level 1 are main concepts. Level 2 are sub-concepts. Stay within 3 levels.",
    "- Keep the total number of nodes between 3 and 12.",
    "- Every edge's source and target must reference existing node ids.",
    "- Write short, accurate descriptions grounded in the material.",
    "",
    `Material source: ${sourceLabel}`,
    "Material:",
    material,
  ].join("\n");

  const schema = {
    title: "MindMapStructure",
    description:
      "Structured mind map with concepts (nodes) and their relationships (edges).",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title of the map." },
        nodes: {
          type: "array",
          description: "Concepts extracted from the material.",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Short unique id like n1, n2.",
              },
              label: {
                type: "string",
                description: "Short concept name (max 50 chars).",
              },
              description: {
                type: "string",
                description: "One sentence grounded in the material.",
              },
              level: {
                type: "integer",
                minimum: 0,
                description:
                  "0 = root, 1 = main concept, 2 = sub-concept.",
              },
              parentId: {
                type: ["string", "null"],
                description: "Id of parent node, null for the root.",
              },
            },
            required: ["id", "label", "description", "level", "parentId"],
          },
        },
        edges: {
          type: "array",
          description: "Relationships between concepts.",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              target: { type: "string" },
              relationship: {
                type: "string",
                description: "Short label like 'includes' or 'depends on'.",
              },
            },
            required: ["source", "target", "relationship"],
          },
        },
      },
      required: ["title", "nodes", "edges"],
    },
  } as const;

  const { output } = await generateText({
    model: createAiModel(),
    output: Output.json(schema),
    prompt,
  });

  return validateAiMapStructure(output);
}