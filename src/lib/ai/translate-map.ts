import { Output } from "ai";
import { z } from "zod";
import { generateTextWithRetry } from "@/lib/ai/model";
import { languageInstruction, languageName } from "@/lib/ai/explanation-style";

const translatedNodeSchema = z.object({
  /** Existing node id. The AI must echo it exactly; it never mints new ids. */
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(600).default(""),
});

const translateResultSchema = z.object({
  language: z.enum(["en", "id"]),
  nodes: z.array(translatedNodeSchema).min(1).max(60),
});

export type TranslatedNode = z.infer<typeof translatedNodeSchema>;

export interface TranslateMapParams {
  /** Existing nodes, in any order. Ids are the contract with the database. */
  nodes: { id: string; label: string; description: string | null }[];
  targetLanguage: "en" | "id";
  requestId?: string;
}

/**
 * Nodes per AI call. One client request can translate a whole map, but the
 * prompt stays small enough to finish inside the per-attempt timeout.
 */
const NODES_PER_BATCH = 40;

/**
 * Translates the existing text of existing nodes. It deliberately knows nothing
 * about the material, the hierarchy, positions, or edges: only node ids and
 * their current words, so the map's structure cannot be disturbed.
 */
export async function translateMapNodes({
  nodes,
  targetLanguage,
  requestId,
}: TranslateMapParams): Promise<TranslatedNode[]> {
  const batches: (typeof nodes)[] = [];
  for (let index = 0; index < nodes.length; index += NODES_PER_BATCH) {
    batches.push(nodes.slice(index, index + NODES_PER_BATCH));
  }

  const translated: TranslatedNode[] = [];

  for (const batch of batches) {
    const prompt = [
      `Translate knowledge-map node text into ${languageName(targetLanguage)}.`,
      "",
      languageInstruction(targetLanguage),
      "",
      "Rules:",
      "- Return EXACTLY one entry per input node, using the same id.",
      "- Never invent, merge, split, reorder, or drop a node.",
      "- Translate the meaning, not word for word. Use natural, simple wording a student understands.",
      "- Keep established technical terms accurate. If a term has no good equivalent, keep the term and add a short plain explanation.",
      "- Keep titles short (a few words). Keep descriptions to one short sentence.",
      "- If a title or description is already in the target language, return it unchanged.",
      "- Set `language` to \"en\" or \"id\" to confirm the target language.",
      "- Plain text only. No Markdown, no bullet characters, no extra commentary.",
      "",
      "Nodes to translate (JSON):",
      JSON.stringify(
        batch.map((node) => ({
          id: node.id,
          title: node.label,
          description: node.description ?? "",
        }))
      ),
    ].join("\n");

    const { output } = await generateTextWithRetry<
      z.infer<typeof translateResultSchema>
    >(
      {
        output: Output.object({
          schema: translateResultSchema,
          name: "TranslatedMapNodes",
          description: "The same nodes with their text in the target language.",
        }),
        prompt,
        maxOutputTokens: 4096,
      },
      { requestId }
    );

    translated.push(
      ...output.nodes.map((node) => ({
        id: node.id,
        title: node.title.trim(),
        description: node.description.trim(),
      }))
    );
  }

  return translated;
}