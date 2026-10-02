import { createClient } from "@/lib/supabase/server";
import type { NodeAiContentRow } from "@/lib/ai-content";

/**
 * Saved AI output is an optimisation, never a hard dependency: if the table is
 * missing or the write fails, generation still works and the client falls back
 * to generating again.
 */
export async function getStoredNodeContent(
  nodeId: string,
  kind: "explain" | "connection",
  language: string
): Promise<NodeAiContentRow["content"] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("node_ai_content")
      .select("content")
      .eq("node_id", nodeId)
      .eq("kind", kind)
      .eq("language", language)
      .maybeSingle();

    if (error) {
      console.error(
        `[ai-content] read failed node=${nodeId} kind=${kind}: ${error.message}`
      );
      return null;
    }
    return (data?.content as NodeAiContentRow["content"]) ?? null;
  } catch (err) {
    console.error(
      `[ai-content] read threw node=${nodeId} kind=${kind}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

export async function saveNodeContent(params: {
  mapId: string;
  nodeId: string;
  kind: "explain" | "connection";
  language: string;
  content: NodeAiContentRow["content"];
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("node_ai_content").upsert(
      {
        map_id: params.mapId,
        node_id: params.nodeId,
        kind: params.kind,
        language: params.language,
        content: params.content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "node_id,kind,language" }
    );

    if (error) {
      console.error(
        `[ai-content] write failed node=${params.nodeId} kind=${params.kind}: ${error.message}`
      );
    }
  } catch (err) {
    console.error(
      `[ai-content] write threw node=${params.nodeId} kind=${params.kind}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}