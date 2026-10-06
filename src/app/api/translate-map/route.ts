import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { translateMapNodes } from "@/lib/ai/translate-map";
import { translateMapInputSchema } from "@/lib/validation/schemas";
import { AiServiceError } from "@/lib/ai/model";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { UserFacingError, errorResponse } from "@/lib/api/errors";

export const maxDuration = 60;
const MAX_BODY_BYTES = 2_000;

function sanitizeLogValue(value: string, max: number): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "?")
    .slice(0, max);
}

/**
 * Rewrites the text of an existing map's nodes into another language.
 *
 * Structure is never touched: no new map, no new nodes, no new edges, no layout.
 * The AI only returns text for ids that already exist, every id is checked
 * before anything is written, and the write itself is a single transactional
 * function, so a failure leaves the original map exactly as it was.
 */
export async function POST(request: Request) {
  const requestId =
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const startedAt = performance.now();
  let failureStage = "unknown";

  const auth = await requireUser();
  if ("error" in auth) {
    return errorResponse(new UserFacingError(auth.error.message, 401), "Unauthorized.");
  }

  if (!checkRateLimit(`translate-map:${auth.user.id}`, 5, 60_000)) {
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

    const parsed = translateMapInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(new UserFacingError("Invalid input."), "Invalid input.");
    }

    const { mapId, language } = parsed.data;

    const supabase = await createClient();

    failureStage = "auth-ownership";
    const { data: map } = await supabase
      .from("maps")
      .select("id, user_id, language")
      .eq("id", mapId)
      .single();
    if (!map || map.user_id !== auth.user.id) {
      return errorResponse(new UserFacingError("Map not found.", 404), "Map not found.");
    }

    // Already in the requested language: nothing to do, and no AI call.
    if (map.language === language) {
      console.error(
        `[TRANSLATE MAP SKIPPED] requestId=${requestId} mapId=${mapId} language=${language} reason=already-current`
      );
      return NextResponse.json({ language, nodes: [], skipped: true });
    }

    failureStage = "load-nodes";
    const { data: nodeRows, error: nodeError } = await supabase
      .from("nodes")
      .select("id, label, description")
      .eq("map_id", mapId);

    if (nodeError) {
      throw new Error(`Could not load nodes: ${nodeError.message}`);
    }

    const nodes = (nodeRows ?? []).map((node) => ({
      id: node.id as string,
      label: node.label as string,
      description: (node.description ?? null) as string | null,
    }));

    if (nodes.length === 0) {
      console.error(
        `[TRANSLATE MAP SKIPPED] requestId=${requestId} mapId=${mapId} language=${language} reason=no-nodes`
      );
      return NextResponse.json({ language, nodes: [], skipped: true });
    }

    failureStage = "ai-translate";
    console.error(
      `[TRANSLATE MAP START] requestId=${requestId} mapId=${mapId} nodeCount=${nodes.length} from=${map.language} to=${language}`,
    );

    const translated = await translateMapNodes({
      nodes,
      targetLanguage: language,
      requestId,
    });

    // Validate before writing anything. The AI's answer is only useful if it
    // covers exactly the same nodes; a mismatch means we cannot trust the rest.
    failureStage = "validate-translation";
    const expectedIds = new Set(nodes.map((node) => node.id));
    const returnedIds = new Set<string>();
    for (const node of translated) {
      if (!expectedIds.has(node.id)) {
        throw new Error(
          `Translation returned an unknown node id: ${sanitizeLogValue(node.id, 40)}`
        );
      }
      if (returnedIds.has(node.id)) {
        throw new Error(
          `Translation returned a duplicate node id: ${sanitizeLogValue(node.id, 40)}`
        );
      }
      returnedIds.add(node.id);
    }

    const missingIds = nodes.filter((node) => !returnedIds.has(node.id));
    if (missingIds.length > 0) {
      throw new Error(
        `Translation is missing ${missingIds.length} node(s), so the map was left unchanged.`
      );
    }

    failureStage = "apply-translation";
    const { error: applyError } = await supabase.rpc("apply_map_translation", {
      p_map_id: mapId,
      p_language: language,
      p_translations: translated.map((node) => ({
        id: node.id,
        label: node.title,
        description: node.description || null,
      })),
    });

    if (applyError) {
      throw new Error(`Could not apply the translation: ${applyError.message}`);
    }

    console.error(
      `[TRANSLATE MAP SUCCESS] requestId=${requestId} mapId=${mapId} nodeCount=${nodes.length} language=${language} totalElapsedMs=${Math.round(
        performance.now() - startedAt
      )}`,
    );

    return NextResponse.json({
      language,
      skipped: false,
      nodes: translated.map((node) => ({
        id: node.id,
        label: node.title,
        description: node.description,
      })),
    });
  } catch (err) {
    const category = err instanceof AiServiceError ? err.category : "unknown";
    const aiStatus = err instanceof AiServiceError ? err.status ?? "-" : "-";
    console.error(
      `[TRANSLATE MAP FAILURE] requestId=${requestId} stage=${failureStage} category=${category} status=${aiStatus} message=${JSON.stringify(
        sanitizeLogValue(err instanceof Error ? err.message : String(err), 200)
      )} totalElapsedMs=${Math.round(performance.now() - startedAt)}`,
    );
    return errorResponse(
      err,
      "Could not change the language of this map. Your current map is still safe."
    );
  }
}