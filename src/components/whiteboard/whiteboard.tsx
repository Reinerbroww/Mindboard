"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeChange,
  type OnNodesChange,
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import {
  Check,
  Compass,
  Expand,
  GitBranch,
  Lightbulb,
  Plus,
  Quote,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { MindboardNode, type MindboardNodeData } from "@/components/whiteboard/mindboard-node";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { computeHierarchicalLayout } from "@/lib/layout/dagre";
import { Button } from "@/components/ui/button";
import { useMapLanguage } from "@/lib/language";
import { useI18n } from "@/lib/i18n";
import type { ConnectionNote } from "@/lib/connection-note";
import type { ExpandedConcept } from "@/lib/ai/expand";
import {
  aiContentKey,
  parseConnectionContent,
  parseExplainContent,
  type AiContentKind,
  type AiContentPayload,
} from "@/lib/ai-content";

export interface SavedContentEntry {
  nodeId: string;
  kind: string;
  language: string;
  content: AiContentPayload;
}

export interface WhiteboardNode {
  id: string;
  label: string;
  description: string | null;
  level: number;
  parentId: string | null;
  /** Persisted canvas position; absent for nodes that were never laid out. */
  positionX?: number | null;
  positionY?: number | null;
}

export interface WhiteboardEdge {
  id: string;
  source: string;
  target: string;
  relationship: string | null;
}

interface WhiteboardProps {
  mapId: string;
  mapTitle: string;
  initialNodes?: WhiteboardNode[];
  initialEdges?: WhiteboardEdge[];
  /** AI answers already stored for this map, keyed for lookup on node click. */
  savedContent?: SavedContentEntry[];
}

/**
 * Renders the structured connection guide. Each section is skipped when the
 * model did not provide it, so a partial answer never shows an empty heading.
 */
function ConnectionNoteView({ note }: { note: ConnectionNote | null }) {
  const { t } = useI18n();

  if (!note) {
    return (
      <p className="text-sm text-muted-foreground">{t("panel.connectionEmpty")}</p>
    );
  }

  const steps = note.howTheyConnect ?? [];

  return (
    <div className="flex flex-col gap-4">
      {note.overview && (
        <section>
          <SectionHeading icon={<Compass className="h-3.5 w-3.5" />}>
            {t("panel.connectionOverview")}
          </SectionHeading>
          <p className="text-sm leading-relaxed text-foreground/90">
            {note.overview}
          </p>
        </section>
      )}

      {steps.length > 0 && (
        <section>
          <SectionHeading icon={<GitBranch className="h-3.5 w-3.5" />}>
            {t("panel.connectionSteps")}
          </SectionHeading>
          <ol className="flex flex-col gap-1.5">
            {steps.map((step, index) => (
              <li
                key={`${index}-${step.slice(0, 12)}`}
                className="flex gap-2 text-sm leading-relaxed text-foreground/90"
              >
                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="min-w-0">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {note.whyItMatters && (
        <section>
          <SectionHeading icon={<Lightbulb className="h-3.5 w-3.5" />}>
            {t("panel.connectionWhy")}
          </SectionHeading>
          <p className="text-sm leading-relaxed text-foreground/90">
            {note.whyItMatters}
          </p>
        </section>
      )}

      {note.example && (
        <section className="rounded-lg border border-border/70 bg-muted/40 p-3">
          <SectionHeading icon={<Quote className="h-3.5 w-3.5" />}>
            {t("panel.connectionExample")}
          </SectionHeading>
          <p className="text-sm leading-relaxed text-foreground/90">
            {note.example}
          </p>
        </section>
      )}

      {note.keyTakeaway && (
        <section className="flex gap-2.5 rounded-lg border border-primary/15 bg-accent/60 p-3">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <SectionHeading>{t("panel.connectionTakeaway")}</SectionHeading>
            <p className="text-sm font-medium leading-relaxed text-foreground">
              {note.keyTakeaway}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Renders what Expand just added: for each new node, what the concept means
 * and why it sits under the concept that was expanded.
 */
function ExpandedConceptsView({ concepts }: { concepts: ExpandedConcept[] }) {
  const { t } = useI18n();

  if (concepts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("expand.empty")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {concepts.map((concept) => (
        <section
          key={concept.id}
          className="rounded-lg border border-border bg-card p-3.5"
        >
          <div className="flex items-start gap-2">
            <span className="mt-1 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-primary">
              <Plus className="h-2.5 w-2.5" aria-hidden="true" />
            </span>
            <h4 className="min-w-0 text-sm font-semibold text-foreground">
              {concept.label}
            </h4>
          </div>

          {concept.detail && (
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {concept.detail}
            </p>
          )}

          {concept.whyItMatters && (
            <div className="mt-2.5 flex gap-2 border-l-2 border-primary/25 pl-2.5">
              <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {concept.whyItMatters}
              </p>
            </div>
          )}

          {concept.example && (
            <div className="mt-2.5 rounded-md bg-muted/50 px-2.5 py-2">
              <SectionHeading icon={<Quote className="h-3.5 w-3.5" />}>
                {t("panel.connectionExample")}
              </SectionHeading>
              <p className="text-xs leading-relaxed text-foreground/85">
                {concept.example}
              </p>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function SectionHeading({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
      {icon}
      {children}
    </h4>
  );
}

const nodeTypes = { mindboard: MindboardNode };

function toFlowNodes(nodes: WhiteboardNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "mindboard",
    // Restore the saved layout. Unpositioned nodes stay at the origin and are
    // placed by the mount effect below.
    position: {
      x: node.positionX ?? 0,
      y: node.positionY ?? 0,
    },
    data: {
      label: node.label,
      description: node.description,
      level: node.level,
    },
  }));
}

function toFlowEdges(edges: WhiteboardEdge[], nodes: WhiteboardNode[]): Edge[] {
  // Derive missing edges from parent relationships.
  const derived: WhiteboardEdge[] = edges.map((e) => e);
  nodes.forEach((node) => {
    if (node.parentId && !edges.some((e) => e.target === node.id)) {
      derived.push({
        id: `derived-${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        relationship: null,
      });
    }
  });

  return derived.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
    label: edge.relationship ?? undefined,
    style: { stroke: "#2F6F5E", strokeWidth: 1.5 },
  }));
}

export function Whiteboard({
  mapId,
  mapTitle,
  initialNodes,
  initialEdges,
  savedContent,
}: WhiteboardProps) {
  const initial = useMemo(() => {
    const nodes = toFlowNodes(initialNodes ?? []);
    const edges = toFlowEdges(initialEdges ?? [], initialNodes ?? []);
    return { nodes, edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter();
  // The interface language drives the UI copy; the map language drives AI output.
  const { t } = useI18n();
  const ui = useCallback((key: Parameters<typeof t>[0]) => t(key), [t]);
  const { language, setLanguage } = useMapLanguage(mapId);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"explain" | "explain-connection" | "expand" | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionInFlight, setActionInFlight] = useState<"explain" | "explain-connection" | "expand" | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [content, setContent] = useState<string>("");
  const [connectionNote, setConnectionNote] = useState<ConnectionNote | null>(null);
  const [expandedConcepts, setExpandedConcepts] = useState<ExpandedConcept[] | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshNodeIds, setFreshNodeIds] = useState<string[]>([]);
  const [connectionEdgeId, setConnectionEdgeId] = useState<string | null>(null);

  // Answers loaded with the board, plus anything generated in this session.
  const [contentStore, setContentStore] = useState<Map<string, AiContentPayload>>(
    () => {
      const store = new Map<string, AiContentPayload>();
      (savedContent ?? []).forEach((entry) => {
        if (entry.kind !== "explain" && entry.kind !== "connection") return;
        store.set(
          aiContentKey(entry.nodeId, entry.kind as AiContentKind, entry.language),
          entry.content
        );
      });
      return store;
    }
  );

  const rememberContent = useCallback(
    (nodeId: string, kind: AiContentKind, content: AiContentPayload) => {
      setContentStore((current) => {
        const next = new Map(current);
        next.set(aiContentKey(nodeId, kind, language), content);
        return next;
      });
    },
    [language]
  );

  const selectedNode = useMemo(
    () => {
      const node = nodes.find((n) => n.id === selectedId) ?? null;
      if (!node) return null;
      return node as Node & { data: MindboardNodeData };
    },
    [nodes, selectedId]
  );

  // Direct parent/child links of the selected node. Everything else stays
  // readable but visually quiet, so context is preserved without noise.
  const selection = useMemo(() => {
    if (!selectedId) return null;
    const relatedNodeIds = new Set<string>([selectedId]);
    const relatedEdgeIds = new Set<string>();
    edges.forEach((edge) => {
      if (edge.source === selectedId) {
        relatedEdgeIds.add(edge.id);
        relatedNodeIds.add(edge.target);
      } else if (edge.target === selectedId) {
        relatedEdgeIds.add(edge.id);
        relatedNodeIds.add(edge.source);
      }
    });
    return { relatedNodeIds, relatedEdgeIds };
  }, [edges, selectedId]);

  const freshIds = useMemo(() => new Set(freshNodeIds), [freshNodeIds]);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => {
        const data = node.data as unknown as MindboardNodeData;
        const dimmed = !!selection && !selection.relatedNodeIds.has(node.id);
        const related =
          !!selection && node.id !== selectedId && selection.relatedNodeIds.has(node.id);
        const isNew = freshIds.has(node.id);
        if (
          data.dimmed === dimmed &&
          data.related === related &&
          data.isNew === isNew
        ) {
          return node;
        }
        return { ...node, data: { ...data, dimmed, related, isNew } };
      }),
    [nodes, selection, selectedId, freshIds]
  );

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => {
        const active = !!selection && selection.relatedEdgeIds.has(edge.id);
        const emphasized = edge.id === connectionEdgeId;
        const dimmed = !!selection && !active;
        if (!active && !dimmed && !emphasized) return edge;
        return {
          ...edge,
          zIndex: active || emphasized ? 2 : 0,
          style: {
            ...edge.style,
            strokeWidth: emphasized ? 2.75 : active ? 2.25 : 1.25,
            opacity: dimmed ? 0.2 : 1,
          },
        };
      }),
    [edges, selection, connectionEdgeId]
  );

  const showSuccessNotification = (text: string, duration = 2400) => {
    setNotification(text);
    setTimeout(() => setNotification((current) => (current === text ? null : current)), duration);
  };

  async function handleDeleteMap() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/maps/${mapId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(ui("board.deleteFailed"));
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(ui("board.deleteFailed"));
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  // Automatic layout must never overwrite a saved layout.
  // - No node has a position yet  -> lay the whole map out.
  // - Some nodes have positions   -> keep them, and only place the strays
  //   (e.g. expanded since the last save) underneath their parent.
  useEffect(() => {
    setNodes((current) => {
      const isPlaced = (n: Node) =>
        Math.abs(n.position.x) >= 1 || Math.abs(n.position.y) >= 1;
      const strays = current.filter((n) => !isPlaced(n));

      if (strays.length === 0) return current;
      if (strays.length === current.length) {
        return computeHierarchicalLayout(current, edges);
      }

      const placed = new Map(
        current
          .filter(isPlaced)
          .map((n) => [n.id, { ...n, position: { ...n.position } }])
      );

      // One pass per depth so a chain of strays lands correctly.
      let pending = strays;
      for (let pass = 0; pass < 5 && pending.length > 0; pass++) {
        const nextPending: Node[] = [];
        pending.forEach((node) => {
          const parentEdge = edges.find((e) => e.target === node.id);
          const parent = parentEdge ? placed.get(parentEdge.source) : undefined;
          if (!parent) {
            nextPending.push(node);
            return;
          }
          placed.set(node.id, {
            ...node,
            position: { x: parent.position.x, y: parent.position.y + 120 },
          });
        });
        pending = nextPending;
      }

      return current.map((n) => placed.get(n.id) ?? n);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flag nodes with children (expanded parents) so they render distinctly.
  useEffect(() => {
    const parentIds = new Set(edges.map((edge) => edge.source));
    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        const data = node.data as unknown as MindboardNodeData;
        const hasChildren = parentIds.has(node.id);
        if (data.hasChildren === hasChildren) return node;
        changed = true;
        return { ...node, data: { ...data, hasChildren } };
      });
      return changed ? next : current;
    });
  }, [edges, setNodes]);

  // Mark the board dirty only once a drag ends, so saving reflects the user's
  // finished arrangement rather than every pointer movement.
  const handleNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const moved = changes.some(
        (c) =>
          c.type === "position" &&
          c.dragging === false &&
          Number.isFinite(c.position?.x) &&
          Number.isFinite(c.position?.y)
      );
      if (moved) {
        setDirty(true);
        setSaved(false);
      }
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedId(node.id);
    setPanel(null);
    setContent("");
    setConnectionNote(null);
    setExpandedConcepts(null);
    setIsCached(false);
    setError(null);
    setConnectionEdgeId(null);
  }, []);

  async function runExplain(force = false) {
    if (!selectedId) return;
    if (!force && (loading || actionInFlight)) return;
    setPanel("explain");
    setConnectionNote(null);
    setError(null);
    setActionInFlight("explain");

    // A saved answer for this node and map language shows straight away.
    if (!force) {
      const saved = parseExplainContent(
        contentStore.get(aiContentKey(selectedId, "explain", language))
      );
      if (saved) {
        setContent(saved);
        setIsCached(true);
        setActionInFlight(null);
        return;
      }
    }

    setContent("");
    setIsCached(false);
    setLoading(true);
    try {
      // Without `regenerate` the route returns the stored answer for this node
      // and language, so reopening a node reuses it instead of calling the AI.
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId, nodeId: selectedId, language, regenerate: force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? ui("notify.explainFailed"));
      setContent(data.explanation);
      setIsCached(data.cached === true);
      rememberContent(selectedId, "explain", { explanation: data.explanation });
    } catch (err) {
      setError(err instanceof Error ? err.message : ui("notify.explainFailed"));
    } finally {
      setLoading(false);
      setActionInFlight(null);
    }
  }

  function handleExplain() {
    runExplain(false);
  }

  async function handleExpand() {
    if (!selectedId || loading || actionInFlight) return;
    setPanel("expand");
    setContent("");
    setConnectionNote(null);
    setExpandedConcepts(null);
    setError(null);
    setLoading(true);
    setActionInFlight("expand");
    try {
      const res = await fetch("/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId, nodeId: selectedId, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? ui("notify.expandFailed"));

      // Each new concept carries its own explanation of what it means.
      const generated: ExpandedConcept[] = data.nodes;
      setExpandedConcepts(generated);

      const parentLevel = selectedNode?.data.level ?? 0;
      const incoming: WhiteboardNode[] = generated.map((n) => ({
        id: n.id,
        label: n.label,
        description: n.description ?? null,
        level: n.level ?? parentLevel + 1,
        parentId: selectedId,
      }));

      const existingNodeIds = new Set(nodes.map((n) => n.id));
      const added = toFlowNodes(
        incoming.filter((n) => !existingNodeIds.has(n.id))
      );

      // Only the new branch is positioned; existing nodes keep the arrangement
      // the user made, so expanding never rearranges the board.
      const parentPosition = nodes.find((n) => n.id === selectedId)?.position;
      let cursorY = parentPosition?.y ?? 0;
      const placed = added.map((node) => {
        cursorY += 120;
        return { ...node, position: { x: parentPosition?.x ?? 0, y: cursorY } };
      });

      const existingEdgeKeys = new Set(edges.map((e) => `${e.source}-${e.target}`));
      const newEdges = placed
        .filter((n) => !existingEdgeKeys.has(`${selectedId}-${n.id}`))
        .map((n) => ({
          id: `${selectedId}-${n.id}`,
          source: selectedId,
          target: n.id,
          type: "smoothstep" as const,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
          label: "includes",
          style: { stroke: "#2F6F5E", strokeWidth: 1.5 },
        }));

      if (placed.length > 0) {
        setNodes([...nodes, ...placed]);
        setEdges([...edges, ...newEdges]);

        // Entrance + brief emphasis for the newly grown part of the map.
        const ids = placed.map((n) => n.id);
        setFreshNodeIds(ids);
        setTimeout(() => {
          setFreshNodeIds((current) => current.filter((id) => !ids.includes(id)));
        }, 1400);
      }

    setSaved(false);
      setDirty(true);
      showSuccessNotification(ui("notify.expanded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : ui("notify.expandFailed"));
    } finally {
      setLoading(false);
      setActionInFlight(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      // Persist node positions, labels, and levels.
      const nodeUpdates = nodes.map((node) => ({
        id: node.id,
        label: (node.data as { label: string }).label,
        description: (node.data as { description?: string | null }).description ?? null,
        level: (node.data as { level?: number }).level ?? 0,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
      }));

      const res = await fetch(`/api/maps/${mapId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: nodeUpdates }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? ui("board.saveFailed"));
      }
      // Only clear the dirty flag once the database has confirmed the write.
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // Keep `dirty` true so the user's arrangement is still there to retry.
      setError(err instanceof Error ? err.message : ui("board.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleExplainConnection(regenerate = false) {
    if (!selectedId || loading || actionInFlight) return;
    if (!selectedNode) return;

    // The parent link is the edge pointing *into* the selected node.
    const parentEdge = edges.find((e) => e.target === selectedId) ?? null;
    const parent = parentEdge
      ? nodes.find((n) => n.id === parentEdge.source) ?? null
      : null;

    setConnectionEdgeId(parentEdge?.id ?? null);

    setPanel("explain-connection");
    setContent("");
    setConnectionNote(null);
    setError(null);

    if (!parent) {
      // Root concept: no parent to connect to, so no AI call is needed.
      setConnectionNote({
        overview: t("connection.root"),
        uncertain: true,
      });
      setIsCached(false);
      setLoading(false);
      setActionInFlight(null);
      return;
    }

    // A stored connection guide shows immediately instead of re-running the AI.
    if (!regenerate) {
      const saved = parseConnectionContent(
        contentStore.get(aiContentKey(selectedId, "connection", language))
      );
      if (saved) {
        setConnectionNote(saved);
        setIsCached(true);
        setLoading(false);
        setActionInFlight(null);
        return;
      }
    }

    setConnectionNote(null);
    setIsCached(false);
    setLoading(true);
    setActionInFlight("explain-connection");
    try {
      const res = await fetch("/api/explain-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapId,
          nodeId: selectedId,
          parentNodeId: parent.id,
          language,
          regenerate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? ui("notify.explainConnectionFailed"));
      const note = data.connection as ConnectionNote;
      setConnectionNote(note);
      setIsCached(data.cached === true);
      rememberContent(selectedId, "connection", { connection: note });
    } catch (err) {
      setError(err instanceof Error ? err.message : ui("notify.explainConnectionFailed"));
    } finally {
      setLoading(false);
      setActionInFlight(null);
    }
  }

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => {
          setSelectedId(null);
          setPanel(null);
          setConnectionEdgeId(null);
        }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={null}
        minZoom={0.1}
        maxZoom={2}
        nodesConnectable={false}
      >
        <Background gap={24} color="#E2EAE4" />
        <Controls showInteractive={false} />
      </ReactFlow>

<div className="pointer-events-none absolute left-4 top-4 z-10 flex max-h-[calc(100%-6rem)] w-[min(92vw,26rem)] flex-col items-start gap-3">
        {selectedNode && (
          <div className="mb-rise pointer-events-auto flex w-full flex-col gap-3 rounded-xl border border-border bg-card/95 p-4 shadow-[0_8px_30px_rgb(38_51_46/0.08)] backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold leading-snug text-foreground">
                {selectedNode.data.label}
              </span>
              <button
                type="button"
                aria-label="Clear selection"
                onClick={() => {
                  setSelectedId(null);
                  setPanel(null);
                  setConnectionEdgeId(null);
                }}
                className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExplain}
                disabled={loading || !!actionInFlight}
              >
                <Sparkles className="h-4 w-4" />
                {ui("node.explain")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExplainConnection()}
                disabled={loading || !!actionInFlight}
              >
                <GitBranch className="h-4 w-4" />
                {ui("node.explainConnection")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExpand}
                disabled={loading || !!actionInFlight}
              >
                <Expand className="h-4 w-4" />
                {loading && actionInFlight === "expand"
                  ? `${ui("create.generating")}`
                  : ui("node.expand")}
              </Button>
            </div>
          </div>
        )}

        {(panel === "explain" ||
          panel === "explain-connection" ||
          panel === "expand") && (
          <div
            key={`${panel}-${loading ? "pending" : "settled"}`}
            className="mb-rise pointer-events-auto max-h-full w-full overflow-y-auto rounded-xl border border-border bg-card/95 p-5 shadow-[0_8px_30px_rgb(38_51_46/0.08)] backdrop-blur-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {panel === "explain"
                  ? ui("panel.explain")
                  : panel === "explain-connection"
                    ? ui("panel.explainConnection")
                    : ui("panel.expand")}
              </span>
              <button
                type="button"
                aria-label={ui("panel.close")}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => {
                  setPanel(null);
                  setConnectionEdgeId(null);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {loading ? (
              <div
                className="flex flex-col gap-2.5"
                role="status"
                aria-label={
                  panel === "explain-connection"
                    ? ui("panel.connectionLoading")
                    : panel === "expand"
                      ? ui("create.generating")
                      : ui("panel.explain")
                }
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-3/4" />
                <div className="mt-2 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ) : error ? (
              <ErrorAlert
                compact
                message={error}
                onRetry={
                  panel === "expand"
                    ? handleExpand
                    : panel === "explain-connection"
                      ? handleExplainConnection
                      : handleExplain
                }
              />
            ) : (
              <>
                {panel === "explain-connection" ? (
                  <ConnectionNoteView note={connectionNote} />
                ) : panel === "expand" ? (
                  <ExpandedConceptsView concepts={expandedConcepts ?? []} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {content}
                  </p>
                )}
                {isCached && (
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
                    <span className="text-[11px] text-muted-foreground/70">
                      {ui(
                        panel === "explain-connection"
                          ? "panel.connectionCached"
                          : "panel.expandCached"
                      )}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={
                        panel === "explain-connection"
                          ? () => handleExplainConnection(true)
                          : () => runExplain(true)
                      }
                    >
                      {ui("panel.regenerate")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {notification && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
          <div
            role="status"
            className="mb-rise flex items-center gap-2 rounded-full border border-primary/20 bg-accent/90 px-3 py-1.5 text-xs font-medium text-primary shadow-[0_4px_16px_rgb(38_51_46/0.10)]"
          >
            <Check className="h-3.5 w-3.5" />
            {notification}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-between gap-2 p-3 sm:p-4">
        <div className="pointer-events-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden max-w-[30vw] truncate text-sm font-medium text-foreground/80 sm:block">
            {mapTitle}
          </span>
          {/* Changes this map's content language only, so AI output for this map
              follows the user's choice rather than the interface language. */}
          <LanguageToggle
            mapId={mapId}
            language={language}
            onLanguageChange={setLanguage}
          />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {saved ? (
            <span
              role="status"
              className="mb-rise flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary"
            >
              <Check className="h-3 w-3" />
              {ui("board.saved")}
            </span>
          ) : dirty ? (
            <span
              role="status"
              className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
              {ui("board.unsaved")}
            </span>
          ) : null}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || deleting || !dirty}
          >
            {saving ? ui("board.saving") : ui("board.save")}
          </Button>

          {confirmingDelete ? (
            <div className="mb-rise flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-card p-1 shadow-sm">
              <span className="hidden px-2 text-xs font-medium text-destructive sm:inline">
                {ui("board.deleteConfirm")}
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={handleDeleteMap}
                disabled={deleting}
              >
                {deleting
                  ? ui("board.deleting")
                  : ui("board.deleteConfirmAction")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                {ui("board.deleteCancel")}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              aria-label={ui("board.delete")}
              className="px-2 text-muted-foreground hover:border-destructive/30 hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
              disabled={saving || deleting}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{ui("board.delete")}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
