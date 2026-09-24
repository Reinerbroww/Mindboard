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

export const getMapWithNodesAndEdges = cache(async (mapId: string) => {
  const supabase = await createClient();
  const { data: map, error: mapError } = await supabase
    .from("maps")
    .select("id, user_id, title, created_at, updated_at")
    .eq("id", mapId)
    .single();

  if (mapError || !map) return null;

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

  return {
    map,
    nodes: nodesResult.data ?? [],
    edges: edgesResult.data ?? [],
  };
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