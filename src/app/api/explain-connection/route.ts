import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { explainConnection } from "@/lib/ai/explain-connection";
import { UserFacingError, errorResponse } from "@/lib/api/errors";
import { AiServiceError } from "@/lib/ai/model";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getMapMaterial } from "@/lib/supabase/queries";
import type { ConnectionNote } from "@/lib/connection-note";

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
      const rootNote: ConnectionNote =
        language === "id"
          ? {
              overview:
                "Node ini adalah konsep akar, jadi tidak ada hubungan dengan konsep induk yang bisa dijelaskan.",
              keyTakeaway:
                "Perluas node ini untuk membangun cabang pertama dari peta.",
            }
          : {
              overview:
                "This node is a root concept, so there is no parent relationship to explain.",
              keyTakeaway:
                "Expand this node to build the first branch of the map.",
            };
      console.error(
        `[EXPLAIN CONNECTION SUCCESS] requestId=${requestId} elapsedMs=${elapsedMs()} language=${language} result=root-concept-no-ai`
      );
      return NextResponse.json({ connection: rootNote });
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

    // Siblings and grandchildren give the model enough context to explain the
    // child's role without guessing.
    const childLabels = nodeList
      .filter((n) => n.parent_id === child.id)
      .map((n) => n.label);
    const grandchildLabels = nodeList
      .filter((n) => n.parent_id && childLabels.length > 0)
      .filter((n) => childLabels.includes(n.parent_id as string))
      .map((n) => n.label);

    failureStage = "ai-explain-connection";
    console.error(
      `[EXPLAIN CONNECTION START] requestId=${requestId} elapsedMs=${elapsedMs()} language=${language}`,
    );

    const connection = await explainConnection({
      parent: { label: parent.label, description: parent.description },
      child: { label: child.label, description: child.description },
      relationship,
      // The child's own parent, when it differs from the parent being explained
      // (which happens when the edge came from the client rather than the tree).
      parentLabel:
        child.parent_id && child.parent_id !== parent.id
          ? nodeList.find((n) => n.id === child.parent_id)?.label ?? null
          : null,
      childLabels: [...childLabels, ...grandchildLabels],
      material: materialContent,
      language,
      requestId,
    });

    console.error(
      `[EXPLAIN CONNECTION SUCCESS] requestId=${requestId} elapsedMs=${elapsedMs()} language=${language} hasRelationship=${relationship ? "yes" : "no"} uncertain=${connection.uncertain ? "yes" : "no"}`
    );

    return NextResponse.json({ connection });
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