import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { explainConcept } from "@/lib/ai/explain";
import { explainInputSchema } from "@/lib/validation/schemas";
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
  if (!checkRateLimit(`explain:${auth.user.id}`, 10, 60_000)) {
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
    const parsed = explainInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(new UserFacingError("Invalid input."), "Invalid input.");
    }

    const { mapId, nodeId } = parsed.data;

    // Verify the map belongs to the user and the node belongs to the map. RLS
    // already scopes rows, but we check ownership explicitly to be safe.
    const { data: node } = await supabase
      .from("nodes")
      .select("id, map_id, label, description")
      .eq("id", nodeId)
      .single();

    if (!node || node.map_id !== mapId) {
      return errorResponse(new UserFacingError("Node not found.", 404), "Node not found.");
    }

    const { data: map } = await supabase
      .from("maps")
      .select("id, user_id")
      .eq("id", mapId)
      .single();

    if (!map || map.user_id !== auth.user.id) {
      return errorResponse(new UserFacingError("Map not found.", 404), "Map not found.");
    }

    const material = await getMapMaterial(mapId);

    const explanation = await explainConcept({
      concept: node.label,
      description: node.description,
      material: material?.content ?? "",
    });

    return NextResponse.json({ explanation });
  } catch (err) {
    return errorResponse(err, "Could not explain this concept.");
  }
}