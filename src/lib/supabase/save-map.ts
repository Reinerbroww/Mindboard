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
  // Insert nodes first so parent_id references are valid.
  const nodeRows = structure.nodes.map((node) => ({
    map_id: mapId,
    parent_id: node.parentId,
    label: node.label,
    description: node.description || null,
    position_x: 0,
    position_y: 0,
    level: node.level,
  }));

  const { data: insertedNodes, error: nodesError } = await supabase
    .from("nodes")
    .insert(nodeRows)
    .select("id");

  if (nodesError || !insertedNodes) throw new Error("Could not save nodes.");

  // Map AI ids (n1, n2) to DB row ids.
  const orderByLevelAndParent = new Map<string, string>();
  structure.nodes.forEach((node, index) => {
    orderByLevelAndParent.set(node.id, insertedNodes[index].id);
  });

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
          e.sourceId !== undefined && e.targetId !== undefined
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

      if (edgesError) throw new Error("Could not save edges.");
    }

    return {
      nodeIdMap: orderByLevelAndParent,
      nodeRows: insertedNodes,
      edges: structure.edges.map((edge) => ({
        source: orderByLevelAndParent.get(edge.source) ?? null,
        target: orderByLevelAndParent.get(edge.target) ?? null,
        relationship: edge.relationship || null,
      })),
    };
  }

  return {
    nodeIdMap: orderByLevelAndParent,
    nodeRows: insertedNodes,
    edges: [],
  };
}