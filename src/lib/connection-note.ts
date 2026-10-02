/**
 * Shape of the structured connection guide returned by /api/explain-connection.
 * Kept free of runtime imports so both the AI layer and client components can
 * share it without pulling the model SDK into the browser bundle.
 *
 * Every field is optional because the guide is assembled from three sources:
 * a deterministic root note, a cached AI answer, and a fresh AI answer. The
 * UI renders only the sections that are present.
 */
export interface ConnectionNote {
  /** One or two sentences: what the relationship is. */
  overview?: string;
  /** Ordered steps showing how the two nodes connect. */
  howTheyConnect?: string[];
  /** Why the relationship matters for understanding the topic. */
  whyItMatters?: string;
  /** Optional concrete illustration; omitted when it would not help. */
  example?: string;
  /** The single idea worth remembering. */
  keyTakeaway?: string;
  /**
   * True when the model could not establish the relationship from the
   * available context. The UI shows a calmer message instead of a guess.
   */
  uncertain?: boolean;
}

export function hasConnectionNote(note: ConnectionNote | null): note is ConnectionNote {
  return Boolean(note && (note.overview || note.howTheyConnect?.length));
}