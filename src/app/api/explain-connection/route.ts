import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { explainConnection } from "@/lib/ai/explain-connection";
import { UserFacingError, errorResponse } from "@/lib/api/errors";
import { AiServiceError } from "@/lib/ai/model";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getMapMaterial } from "@/lib/supabase/queries";

export const maxDuration = 60;
const MAX_BODY_BYTES = 16_000;

function sanitizeLogValue(value: string, max: number): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "?")
    .slice(0, max);
}

function errorTypeOf(err: unknown): string {
  if (err instanceof Error) return err.name || "Error";
  return typeof err;
}

function errorMessageOf(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return sanitizeLogValue(text, 200) || "unknown error";
}

export async function POST(request: Request) {
  const fallbackRequestId =
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  let requestId = fallbackRequestId;
  const startedAt = performance.now();
  const elapsedMs = () => Math.round(performance.now() - startedAt);

  let failureStage = "unknown";

  const auth = await requireUser();
  if ("error" in auth) {
    return errorResponse(new UserFacingError(auth.error.message, 401), "Unauthorized.");
  }

  const supabase = await createClient();
  if (!checkRateLimit(`explain-connection:${auth.user.id}`, 10, 60_000)) {
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

    const clientRequestId =
      body && typeof body === "object" &&
      typeof (body as { requestId?: unknown }).requestId === "string" &&
      /^[A-Za-z0-9_-]{8,80}$/.test((body as { requestId: string }).requestId)
        ? (body as { requestId: string }).requestId
        : undefined;
    if (clientRequestId) requestId = clientRequestId;

    const language = (body && typeof body === "object" &&
      ((body as { language?: unknown }).language === "id" ||
        (body as { language?: unknown }).language === "en"))
      ? (body as { language: "en" | "id" }).language
      : "en";

    const b = body as {
      mapId?: string;
      nodeId?: string;
      parentNodeId?: string;
      parentNode?: { id?: string; title?: string; label?: string; description?: string | null };
      childNode?: { id?: string; title?: string; label?: string; description?: string | null };
      relationship?: string | null;
    };

    const mapId = typeof b.mapId === "string" ? b.mapId : null;
    const childId = typeof b.nodeId === "string" ? b.nodeId : typeof b.childNode?.id === "string" ? b.childNode.id : null;
    const parentIdFromBody = typeof b.parentNodeId === "string" ? b.parentNodeId : typeof b.parentNode?.id === "string" ? b.parentNode.id : null;

    if (!mapId || !childId) {
      return errorResponse(new UserFacingError("Invalid input."), "Invalid input.");
    }

    failureStage = "auth-ownership";
    const { data: map } = await supabase
      .from("maps")
      .select("id, user_id")
      .eq("id", mapId)
      .single();
    if (!map || map.user_id !== auth.user.id) {
      return errorResponse(new UserFacingError("Map not found.", 404), "Map not found.");
    }

    failureStage = "load-nodes";
    const { data: nodes } = await supabase
      .from("nodes")
      .select("id, map_id, parent_id, label, description")
      .eq("map_id", mapId);

    const nodeList = nodes ?? [];
    const child = nodeList.find((n) => n.id === childId);
    if (!child || child.map_id !== mapId) {
      return errorResponse(new UserFacingError("Node not found.", 404), "Node not found.");
    }

    const parent = parentIdFromBody
      ? nodeList.find((n) => n.id === parentIdFromBody)
      : child.parent_id
        ? nodeList.find((n) => n.id === child.parent_id)
        : undefined;

    if (!parent) {
      // Deterministic, no AI call: a root concept has no parent relationship.
      const explanation =
        language === "id"
          ? "Node ini adalah konsep akar, jadi tidak ada hubungan dengan konsep induk yang bisa dijelaskan."
          : "This node is a root concept, so there is no parent relationship to explain.";
      console.error(
        `[EXPLAIN CONNECTION SUCCESS] requestId=${requestId} elapsedMs=${elapsedMs()} language=${language} result=root-concept-no-ai`
      );
      return NextResponse.json({ explanation });
    }

    // Determine relationship from edges if not provided.
    let relationship: string | null = b.relationship ?? null;
    if (relationship === null) {
      const { data: edges } = await supabase
        .from("edges")
        .select("source_node_id, target_node_id, relationship")
        .eq("map_id", mapId)
        .or(`source_node_id.eq.${parent.id},target_node_id.eq.${parent.id},source_node_id.eq.${child.id},target_node_id.eq.${child.id}`);
      const e = (edges ?? []).find(
        (edge) => edge.source_node_id === parent.id && edge.target_node_id === child.id
      );
      relationship = e?.relationship ?? null;
    }

    const material = await getMapMaterial(mapId);
    const materialContent = material?.content ?? "";

    failureStage = "ai-explain-connection";
    console.error(
      `[EXPLAIN CONNECTION START] requestId=${requestId} elapsedMs=${elapsedMs()} language=${language}`,
    );

    const explanation = await explainConnection({
      parent: { label: parent.label, description: parent.description },
      child: { label: child.label, description: child.description },
      relationship,
      material: materialContent,
      language,
      requestId,
    });

    console.error(
      `[EXPLAIN CONNECTION SUCCESS] requestId=${requestId} elapsedMs=${elapsedMs()} language=${language} hasRelationship=${relationship ? "yes" : "no"}`
    );

    return NextResponse.json({ explanation });
  } catch (err) {
    const category = err instanceof AiServiceError ? err.category : "unknown";
    const aiStatus = err instanceof AiServiceError ? err.status ?? "-" : "-";
    console.error(
      `[EXPLAIN CONNECTION FAILURE] ${[
        `requestId=${requestId}`,
        `elapsedMs=${elapsedMs()}`,
        `stage=${failureStage}`,
        `errorType=${errorTypeOf(err)}`,
        `errorMessage=${JSON.stringify(errorMessageOf(err))}`,
        `category=${category}`,
        `status=${aiStatus}`,
        `model=${err instanceof AiServiceError ? err.model ?? "-" : "-"}`,
      ].join(" ")}`,
    );
    return errorResponse(err, "Could not explain this connection.");
  }
}