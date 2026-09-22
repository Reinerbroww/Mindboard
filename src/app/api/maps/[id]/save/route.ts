import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { saveMapGraphSchema } from "@/lib/validation/schemas";
import { UserFacingError, errorResponse } from "@/lib/api/errors";

export const maxDuration = 30;
const MAX_BODY_BYTES = 1_000_000;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireUser();
  if ("error" in auth) {
    return errorResponse(new UserFacingError(auth.error.message, 401), "Unauthorized.");
  }

  const supabase = await createClient();

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return errorResponse(new UserFacingError("Payload too large.", 413), "Payload too large.");
    }

    const { data: map } = await supabase
      .from("maps")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!map || map.user_id !== auth.user.id) {
      return errorResponse(new UserFacingError("Map not found.", 404), "Map not found.");
    }

    const body = await request.json();
    const parsed = saveMapGraphSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(new UserFacingError("Invalid input."), "Invalid input.");
    }

    const { nodes } = parsed.data;

    // Scoped per-user via map ownership + map_id check so a malicious client
    // cannot overwrite nodes from another map.
    const updates = nodes.map((node) =>
      supabase
        .from("nodes")
        .update({
          label: node.label,
          description: node.description,
          position_x: node.positionX,
          position_y: node.positionY,
          level: node.level,
        })
        .eq("id", node.id)
        .eq("map_id", id)
    );

    const results = await Promise.all(updates);
    const failed = results.some((r) => r.error);
    if (failed) {
      return errorResponse(new UserFacingError("Could not save nodes.", 500), "Could not save nodes.");
    }

    await supabase
      .from("maps")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "Could not save your map.");
  }
}