import { Output } from "ai";
import {
  aiMapStructureSchema,
  validateAiMapStructure,
} from "@/lib/validation/schemas";
import type { AiMapStructure, AiNode, AiEdge } from "@/lib/validation/schemas";
import { generateTextWithRetry } from "@/lib/ai/model";

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

  const { output } = await generateTextWithRetry<AiMapStructure>({
    output: Output.object({
      schema: aiMapStructureSchema,
      name: "MindMapStructure",
      description:
        "Structured mind map with concepts (nodes) and their relationships (edges).",
    }),
    prompt,
    maxOutputTokens: 8192,
  });

  return validateAiMapStructure(output);
}