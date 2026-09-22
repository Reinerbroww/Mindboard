import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { expandConcept } from "@/lib/ai/expand";
import { expandInputSchema } from "@/lib/validation/schemas";
import { getMapMaterial } from "@/lib/supabase/queries";
import { UserFacingError, errorResponse } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 60;
const MAX_BODY_BYTES = 16_000;

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return errorResponse(new UserFacingError(auth.error.message, 401), "Unauthorized.");
  }

  const supabase = await createClient();
  if (!checkRateLimit(`expand:${auth.user.id}`, 10, 60_000)) {
    return errorResponse(
      new UserFacingError("Too many requests. Try again in a minute.", 429),
      "Too many requests."
    );
  }

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return errorResponse(new UserFacingError("Payload too large.", 413), "Payload too large.");
    }

    const body = await request.json();
    const parsed = expandInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(new UserFacingError("Invalid input."), "Invalid input.");
    }

    const { mapId, nodeId } = parsed.data;

    // Verify ownership before doing any AI work.
    const { data: map } = await supabase
      .from("maps")
      .select("id, user_id")
      .eq("id", mapId)
      .single();

    if (!map || map.user_id !== auth.user.id) {
      return errorResponse(new UserFacingError("Map not found.", 404), "Map not found.");
    }

    const { data: node } = await supabase
      .from("nodes")
      .select("id, map_id, label, level")
      .eq("id", nodeId)
      .single();

    if (!node || node.map_id !== mapId) {
      return errorResponse(new UserFacingError("Node not found.", 404), "Node not found.");
    }

    const { data: existingNodes } = await supabase
      .from("nodes")
      .select("label")
      .eq("map_id", mapId);

    const existingLabels = (existingNodes ?? []).map((n) => n.label);

    const material = await getMapMaterial(mapId);
    const materialContent = material?.content ?? "";

    const nodes = await expandConcept({
      concept: node.label,
      material: materialContent,
      existingLabels,
    });

    if (nodes.length === 0) {
      return errorResponse(
        new UserFacingError("AI returned no new concepts.", 422),
        "AI returned no new concepts."
      );
    }

    const nodeRows = nodes.map((n) => ({
      map_id: mapId,
      parent_id: nodeId,
      label: n.label,
      description: n.description || null,
      position_x: 0,
      position_y: 0,
      level: node.level + 1,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("nodes")
      .insert(nodeRows)
      .select("id, label, description, level");

    if (insertError || !inserted) {
      return errorResponse(
        new UserFacingError("Could not save new concepts.", 500),
        "Could not save new concepts."
      );
    }

    return NextResponse.json({ nodes: inserted });
  } catch (err) {
    return errorResponse(err, "Could not expand this concept.");
  }
}