import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { explainConcept } from "@/lib/ai/explain";
import { explainInputSchema } from "@/lib/validation/schemas";
import { getMapMaterial } from "@/lib/supabase/queries";
import { getStoredNodeContent, saveNodeContent } from "@/lib/supabase/ai-content";
import { parseExplainContent } from "@/lib/ai-content";
import { UserFacingError, errorResponse } from "@/lib/api/errors";
import { AiServiceError } from "@/lib/ai/model";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 60;
const MAX_BODY_BYTES = 16_000;

export async function POST(request: Request) {
  const requestId =
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const startedAt = performance.now();

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

    const language = (body && typeof body === "object" &&
      ((body as { language?: unknown }).language === "id" ||
        (body as { language?: unknown }).language === "en"))
      ? (body as { language: "en" | "id" }).language
      : "en";

    // A stored explanation is reused unless the caller explicitly regenerates,
    // so reopening a node shows the same answer instead of paying for AI again.
    if (!parsed.data.regenerate) {
      const stored = parseExplainContent(
        await getStoredNodeContent(nodeId, "explain", language)
      );
      if (stored) {
        console.error(
          `[EXPLAIN CACHE HIT] requestId=${requestId} node=${node.label} totalElapsedMs=${Math.round(
            performance.now() - startedAt
          )}`,
        );
        return NextResponse.json({ explanation: stored, cached: true });
      }
    }

    console.error(
      `[EXPLAIN START] requestId=${requestId} node=${node.label} regenerate=${parsed.data.regenerate ? "yes" : "no"} materialLength=${material?.content?.length ?? 0}`,
    );

    const explanation = await explainConcept({
      concept: node.label,
      description: node.description,
      material: material?.content ?? "",
      requestId,
      language,
    });
    await saveNodeContent({
      mapId,
      nodeId,
      kind: "explain",
      language,
      content: { explanation },
    });

    console.error(
      `[EXPLAIN SUCCESS] requestId=${requestId} totalElapsedMs=${Math.round(
        performance.now() - startedAt
      )}`,
    );

    return NextResponse.json({ explanation, cached: false });
  } catch (err) {
    const category = err instanceof AiServiceError ? err.category : "unknown";
    const aiStatus = err instanceof AiServiceError ? err.status ?? "-" : "-";
    console.error(
      `[EXPLAIN FAILURE] requestId=${requestId} category=${category} status=${aiStatus} totalElapsedMs=${Math.round(
        performance.now() - startedAt
      )}`,
    );
    return errorResponse(err, "Could not explain this concept.");
  }
}