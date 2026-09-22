import { z } from "zod";

export const aiNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(255),
  description: z.string().optional().default(""),
  level: z.number().int().min(0).max(10),
  parentId: z.string().nullable(),
});

export const aiEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  relationship: z.string().max(100).optional().default(""),
});

export const aiMapStructureSchema = z.object({
  title: z.string().min(1).max(255),
  nodes: z.array(aiNodeSchema).min(1),
  edges: z.array(aiEdgeSchema),
});

export type AiMapStructure = z.infer<typeof aiMapStructureSchema>;
export type AiNode = z.infer<typeof aiNodeSchema>;
export type AiEdge = z.infer<typeof aiEdgeSchema>;

const MAX_NODES = 30;
const MAX_EDGES = 60;

export function validateAiMapStructure(input: unknown): AiMapStructure {
  const parsed = aiMapStructureSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("AI returned an invalid map structure.");
  }
  if (parsed.data.nodes.length > MAX_NODES) {
    throw new Error("AI generated too many concepts.");
  }
  if (parsed.data.edges.length > MAX_EDGES) {
    throw new Error("AI generated too many relationships.");
  }
  return parsed.data;
}

const materialTextSchema = z.object({
  type: z.literal("text"),
  content: z
    .string()
    .min(1, "Material is empty.")
    .max(100_000, "Material is too large."),
});

const materialPdfSchema = z.object({
  type: z.literal("pdf"),
  file_name: z.string().min(1).max(255),
  // Base64 data URL payload; cap well above the 10 MB decoded limit.
  fileData: z.string().min(1, "PDF file data is required.").max(18_000_000),
});

export const materialInputSchema = z.discriminatedUnion("type", [
  materialTextSchema,
  materialPdfSchema,
]);

export type MaterialInput = z.infer<typeof materialInputSchema>;
export type MaterialPdfInput = z.infer<typeof materialPdfSchema>;

export const expandInputSchema = z.object({
  mapId: z.uuid(),
  nodeId: z.uuid(),
});

export const explainInputSchema = z.object({
  mapId: z.uuid(),
  nodeId: z.uuid(),
});

export const saveMapGraphSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.uuid(),
        label: z.string().min(1).max(255),
        description: z.string().min(0).max(2000).nullable(),
        level: z.number().int().min(0).max(10),
        positionX: z.number().min(-100_000).max(100_000),
        positionY: z.number().min(-100_000).max(100_000),
      })
    )
    .min(1)
    .max(MAX_NODES),
});