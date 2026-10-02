import type { ConnectionNote } from "@/lib/connection-note";

export type AiContentKind = "explain" | "connection";

export interface StoredExplainContent {
  explanation: string;
}

export interface StoredConnectionContent {
  connection: ConnectionNote;
}

export type AiContentPayload =
  | StoredExplainContent
  | StoredConnectionContent;

export interface NodeAiContentRow {
  node_id: string;
  map_id: string;
  kind: AiContentKind;
  language: string;
  content: AiContentPayload;
}

/** Key used by the client to look a stored answer up per node. */
export function aiContentKey(
  nodeId: string,
  kind: AiContentKind,
  language: string
): string {
  return `${nodeId}:${kind}:${language}`;
}

export function parseExplainContent(
  payload: AiContentPayload | null | undefined
): string | null {
  const value = (payload as StoredExplainContent | null)?.explanation;
  return typeof value === "string" && value.trim() ? value : null;
}

export function parseConnectionContent(
  payload: AiContentPayload | null | undefined
): ConnectionNote | null {
  const value = (payload as StoredConnectionContent | null)?.connection;
  if (!value || typeof value !== "object") return null;
  const note = value as ConnectionNote;
  return note.overview || note.howTheyConnect?.length ? note : null;
}