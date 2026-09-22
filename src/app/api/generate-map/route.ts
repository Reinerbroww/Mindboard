import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import {
  extractPdfText,
  validatePdfFile,
  PdfValidationError,
} from "@/lib/pdf/extract";
import { generateMapStructure } from "@/lib/ai/generate-map";
import { materialInputSchema } from "@/lib/validation/schemas";
import {
  createMapForUser,
  saveGraph,
  saveMaterial,
} from "@/lib/supabase/save-map";
import {
  UserFacingError,
  errorResponse,
} from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 60;
const MAX_BODY_BYTES = 18_000_000;

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return errorResponse(new UserFacingError(auth.error.message, 401), "Unauthorized.");
  }

  const supabase = await createClient();
  if (!checkRateLimit(`generate-map:${auth.user.id}`, 5, 60_000)) {
    return errorResponse(
      new UserFacingError("Too many requests. Try again in a minute.", 429),
      "Too many requests."
    );
  }

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return errorResponse(
        new UserFacingError("Payload too large.", 413),
        "Payload too large."
      );
    }

    const body = await request.json();
    const parsed = materialInputSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        new UserFacingError(parsed.error.issues[0]?.message ?? "Invalid input."),
        "Invalid input."
      );
    }

    const input = parsed.data;
    let content = "";
    let fileName: string | null = null;

    if (input.type === "pdf") {
      try {
        validatePdfFile({ name: input.file_name });
        const bytes = Buffer.from(input.fileData, "base64");
        if (bytes.byteLength > 10 * 1024 * 1024) {
          throw new PdfValidationError("PDF file is too large (max 10 MB).");
        }
        content = await extractPdfText(bytes.buffer);
        fileName = input.file_name;
      } catch (err) {
        if (err instanceof PdfValidationError) {
          throw new UserFacingError(err.message);
        }
        throw err;
      }
    } else {
      content = input.content;
    }

    if (!content.trim()) {
      return errorResponse(
        new UserFacingError("Material is empty."),
        "Material is empty."
      );
    }

    const structure = await generateMapStructure({
      material: content.slice(0, 100_000),
      sourceLabel: input.type === "pdf" ? `PDF: ${fileName}` : "Pasted text",
    });

    const mapId = await createMapForUser(supabase, auth.user.id, structure.title);
    await saveMaterial(supabase, mapId, {
      type: input.type,
      content,
      file_name: fileName,
    });

    const { nodeIdMap, nodeRows, edges } = await saveGraph(
      supabase,
      mapId,
      structure
    );

    const nodes = structure.nodes.map((node, index) => ({
      id: nodeRows[index].id,
      label: node.label,
      description: node.description ?? null,
      level: node.level,
      parentId: node.parentId ? nodeIdMap.get(node.parentId) ?? null : null,
    }));

    return NextResponse.json({
      mapId,
      title: structure.title,
      nodes,
      edges,
    });
  } catch (err) {
    return errorResponse(err, "Could not generate your mind map.");
  }
}