import { createClient } from "@/lib/supabase/server";
import type { GenerateMapResult } from "@/lib/ai/generate-map";

export async function createMapForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  title: string
) {
  const { data, error } = await supabase
    .from("maps")
    .insert({ user_id: userId, title })
    .select("id")
    .single();

  if (error || !data) throw new Error("Could not create map.");
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

  if (error) throw new Error("Could not save material.");
}

export async function saveGraph(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mapId: string,
  structure: GenerateMapResult
) {
  // Insert nodes one at a time, parents first (lower levels sort earlier),
  // so each parent_id is a real DB id that already exists.
  const sortedNodes = [...structure.nodes].sort((a, b) => a.level - b.level);
  const orderByLevelAndParent = new Map<string, string>();
  const insertedNodes: { id: string }[] = [];

  for (const node of sortedNodes) {
    const parentId =
      node.parentId && orderByLevelAndParent.has(node.parentId)
        ? orderByLevelAndParent.get(node.parentId)!
        : null;

    const { data, error } = await supabase
      .from("nodes")
      .insert({
        map_id: mapId,
        parent_id: parentId,
        label: node.label,
        description: node.description || null,
        position_x: 0,
        position_y: 0,
        level: node.level,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Save node DB error:", error);
      throw new Error(`Could not save nodes: ${error?.message || "Unknown error"}`);
    }

    insertedNodes.push(data);
    orderByLevelAndParent.set(node.id, data.id);
  }

  // Keep the row order aligned with `structure.nodes` for the caller.
  const nodeRows = structure.nodes.map((node) => ({
    id: orderByLevelAndParent.get(node.id) as string,
  }));

  if (structure.edges.length > 0) {
    // Match each AI edge to its DB ids, dropping edges that reference
    // unknown nodes.
    const edgeRows = structure.edges
      .map((edge) => ({
        sourceId: orderByLevelAndParent.get(edge.source),
        targetId: orderByLevelAndParent.get(edge.target),
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
      nodeIdMap: orderByLevelAndParent,
      nodeRows: nodeRows,
      edges: structure.edges.map((edge) => ({
        source: orderByLevelAndParent.get(edge.source) ?? null,
        target: orderByLevelAndParent.get(edge.target) ?? null,
        relationship: edge.relationship || null,
      })),
    };
  }

  return {
    nodeIdMap: orderByLevelAndParent,
    nodeRows: nodeRows,
    edges: [],
  };
}