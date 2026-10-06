import { createClient } from "@/lib/supabase/server";
import type { GenerateMapResult } from "@/lib/ai/generate-map";

export async function createMapForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  title: string,
  language: "en" | "id" = "en"
) {
  const { data, error } = await supabase
    .from("maps")
    .insert({ user_id: userId, title, language })
    .select("id")
    .single();

  if (error || !data) {
    console.error(`[DB] createMapForUser failed. ${error ? `code=${error.code} ${error.message}` : "no row returned"}`);
    if (error) throw new Error(`Could not create map: ${error.code ?? ""} ${error.message}`);
    throw new Error("Could not create map: insert returned no row.");
  }
  return data.id as string;
}

export async function saveMaterial(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mapId: string,
  input: { type: "text" | "pdf"; content: string; file_name?: string | null }
) {
  const { error } = await supabase.from("materials").insert({
    map_id: mapId,
    type: input.type,
    content: input.content,
    file_name: input.file_name ?? null,
  });

  if (error) {
    console.error(`[DB] saveMaterial failed. code=${error.code} ${error.message}`);
    throw new Error(`Could not save material: ${error.code ?? ""} ${error.message}`);
  }
}

export async function saveGraph(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mapId: string,
  structure: GenerateMapResult
) {
  // Insert all nodes in one bulk call with parent_id = null, then fix up the
  // parents in a single grouped UPDATE per distinct parent. PostgREST returns
  // inserted rows in the same order as the input array, so we can map each AI
  // id to its real DB id positionally.
  const { data: inserted, error: insertError } = await supabase
    .from("nodes")
    .insert(
      structure.nodes.map((node) => ({
        map_id: mapId,
        parent_id: null,
        label: node.label,
        description: node.description || null,
        position_x: 0,
        position_y: 0,
        level: node.level,
      }))
    )
    .select("id");

  if (insertError || !inserted || inserted.length !== structure.nodes.length) {
    console.error("Save nodes DB error:", insertError);
    throw new Error(
      `Could not save nodes: ${insertError?.message || "Unknown error"}`
    );
  }

  // AI id -> DB id. Row order should match due to ordering guarantee, but we
  // only pair them up when counts line up (checked above).
  const orderByAiId = new Map<string, string>();
  structure.nodes.forEach((node, index) => {
    orderByAiId.set(node.id, inserted[index].id as string);
  });

  // Group node AI ids by their parent's (AI) id, then update each group.
  const childrenByParent = new Map<string, { aiId: string; dbId: string }[]>();
  for (const node of structure.nodes) {
    if (!node.parentId) continue;
    const dbId = orderByAiId.get(node.id);
    if (!dbId) continue;
    const group = childrenByParent.get(node.parentId) ?? [];
    group.push({ aiId: node.id, dbId });
    childrenByParent.set(node.parentId, group);
  }

  for (const [parentAiId, children] of childrenByParent) {
    const parentDbId = orderByAiId.get(parentAiId);
    if (!parentDbId) continue;
    const { error: parentError } = await supabase
      .from("nodes")
      .update({ parent_id: parentDbId })
      .in(
        "id",
        children.map((c) => c.dbId)
      );
    if (parentError) {
      console.error("Save parent-link DB error:", parentError);
      throw new Error(`Could not link parent nodes: ${parentError.message}`);
    }
  }

  // Keep the row order aligned with `structure.nodes` for the caller.
  const nodeRows = structure.nodes.map((node) => ({
    id: orderByAiId.get(node.id) as string,
  }));

  if (structure.edges.length > 0) {
    // Match each AI edge to its DB ids, dropping edges that reference
    // unknown nodes.
    const edgeRows = structure.edges
      .map((edge) => ({
        sourceId: orderByAiId.get(edge.source),
        targetId: orderByAiId.get(edge.target),
        relationship: edge.relationship || null,
      }))
      .filter(
        (e): e is { sourceId: string; targetId: string; relationship: string | null } =>
          Boolean(e.sourceId && e.targetId)
      );

    if (edgeRows.length > 0) {
      const { error: edgesError } = await supabase
        .from("edges")
        .insert(edgeRows.map((e) => ({
          map_id: mapId,
          source_node_id: e.sourceId,
          target_node_id: e.targetId,
          relationship: e.relationship,
        })));

      if (edgesError) {
        console.error("Save edges DB error:", edgesError);
        throw new Error(`Could not save edges: ${edgesError.message}`);
      }
    }

    return {
      nodeIdMap: orderByAiId,
      nodeRows: nodeRows,
      edges: structure.edges.map((edge) => ({
        source: orderByAiId.get(edge.source) ?? null,
        target: orderByAiId.get(edge.target) ?? null,
        relationship: edge.relationship || null,
      })),
    };
  }

  return {
    nodeIdMap: orderByAiId,
    nodeRows: nodeRows,
    edges: [],
  };
}