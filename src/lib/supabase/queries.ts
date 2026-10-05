import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getUserMaps = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maps")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (/JWT issued at future/i.test(error.message)) {
      console.warn("[supabase] Clock skew warning: JWT issued at future. Retrying...");
      await new Promise((r) => setTimeout(r, 1000));
      const retry = await supabase
        .from("maps")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      return retry.data ?? [];
    }
    throw new Error(error.message);
  }
  return data ?? [];
});

export const getMapGraphSummaries = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data: maps } = await supabase
    .from("maps")
    .select("id")
    .eq("user_id", userId);

  const mapIds = (maps ?? []).map((m) => m.id);
  if (mapIds.length === 0) return new Map<string, number>();

  const { data: nodes } = await supabase
    .from("nodes")
    .select("map_id, level")
    .in("map_id", mapIds);

  const counts = new Map<string, number>();
  (nodes ?? []).forEach((node) => {
    counts.set(node.map_id, (counts.get(node.map_id) ?? 0) + 1);
  });
  return counts;
});

export const getMapWithNodesAndEdges = cache(async (mapId: string) => {
  const supabase = await createClient();
  const { data: map, error: mapError } = await supabase
    .from("maps")
    .select("id, user_id, title, language, created_at, updated_at")
    .eq("id", mapId)
    .maybeSingle();

  // No row means the map genuinely does not exist, or is not visible to this
  // user. That is the only case that should become a 404. A failed query is a
  // server error: it must never be reported as a missing map.
  if (mapError) {
    console.error(`[supabase] getMapWithNodesAndEdges failed: ${mapError.message}`);
    throw new Error(mapError.message);
  }
  if (!map) return null;

  const [nodesResult, edgesResult] = await Promise.all([
    supabase
      .from("nodes")
      .select("id, map_id, parent_id, label, description, position_x, position_y, level")
      .eq("map_id", mapId),
    supabase
      .from("edges")
      .select("id, map_id, source_node_id, target_node_id, relationship")
      .eq("map_id", mapId),
  ]);

  if (nodesResult.error) {
    console.error(`[supabase] map nodes read failed: ${nodesResult.error.message}`);
    throw new Error(nodesResult.error.message);
  }
  if (edgesResult.error) {
    console.error(`[supabase] map edges read failed: ${edgesResult.error.message}`);
    throw new Error(edgesResult.error.message);
  }

  return {
    map,
    nodes: nodesResult.data ?? [],
    edges: edgesResult.data ?? [],
  };
});

/**
 * Stored AI answers for a whole map, loaded with the board so clicking a node
 * can show a saved explanation without waiting on a request.
 */
export const getMapAiContent = cache(async (mapId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("node_ai_content")
    .select("node_id, kind, language, content")
    .eq("map_id", mapId);

  if (error) {
    // Missing table or transient failure should not block the board itself.
    console.error(`[supabase] ai content read failed: ${error.message}`);
    return [];
  }
  return data ?? [];
});

export const getMapMaterial = cache(async (mapId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id, map_id, type, content, file_name")
    .eq("map_id", mapId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data;
});