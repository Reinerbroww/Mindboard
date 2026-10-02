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
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import { Expand, Sparkles, Trash2, GitBranch, X, Check } from "lucide-react";
import { MindboardNode, type MindboardNodeData } from "@/components/whiteboard/mindboard-node";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { computeHierarchicalLayout } from "@/lib/layout/dagre";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";

export interface WhiteboardNode {
  id: string;
  label: string;
  description: string | null;
  level: number;
  parentId: string | null;
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
}

const nodeTypes = { mindboard: MindboardNode };

function toFlowNodes(nodes: WhiteboardNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "mindboard",
    position: { x: 0, y: 0 },
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
}: WhiteboardProps) {
  const initial = useMemo(() => {
    const nodes = toFlowNodes(initialNodes ?? []);
    const edges = toFlowEdges(initialEdges ?? [], initialNodes ?? []);
    return { nodes, edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter();
  const { language, setLanguage } = useLanguage(mapId);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"explain" | "explain-connection" | "expand" | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionInFlight, setActionInFlight] = useState<"explain" | "explain-connection" | "expand" | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [content, setContent] = useState<string>("");
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshNodeIds, setFreshNodeIds] = useState<string[]>([]);
  const [connectionEdgeId, setConnectionEdgeId] = useState<string | null>(null);

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
      if (!res.ok) throw new Error("Delete failed.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not delete this map.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  // Run lay-out once after mount so generated maps get positioned.
  useEffect(() => {
    setNodes((current) => {
      const positioned = computeHierarchicalLayout(current, edges);
      // Only apply if positions are all zero (not yet laid out or saved).
      const needsLayout = current.some(
        (n) => Math.abs(n.position.x) < 1 && Math.abs(n.position.y) < 1
      );
      return needsLayout ? positioned : current;
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

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedId(node.id);
    setPanel(null);
    setContent("");
    setIsCached(false);
    setError(null);
    setConnectionEdgeId(null);
  }, []);

  async function runExplain(force = false) {
    if (!selectedId) return;
    if (!force && (loading || actionInFlight)) return;
    setPanel("explain");
    setError(null);
    setActionInFlight("explain");

    const cacheKey = `mb:explain:${mapId}:${selectedId}:${language}`;
    if (!force) {
      try {
        const cachedText = localStorage.getItem(cacheKey);
        if (cachedText) {
          setContent(cachedText);
          setIsCached(true);
          setActionInFlight(null);
          return;
        }
      } catch {
        // Storage unavailable — fall through to the API.
      }
    }

    setContent("");
    setIsCached(false);
    setLoading(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId, nodeId: selectedId, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Explain failed.");
      setContent(data.explanation);
      try {
        localStorage.setItem(cacheKey, data.explanation);
      } catch {
        // Storage full or unavailable — the answer still shows.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Explain failed.");
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
      if (!res.ok) throw new Error(data.error ?? "Expand failed.");

      const newNodes: WhiteboardNode[] = data.nodes.map(
        (n: { id: string; label: string; description?: string | null; level?: number }) => ({
          id: n.id,
          label: n.label,
          description: n.description ?? null,
          level: n.level ?? (selectedNode?.data.level ?? 0) + 1,
          parentId: selectedId,
        })
      );

      setEdges((current) => {
        const existingEdgeKeys = new Set(
          current.map((e) => `${e.source}-${e.target}`)
        );
        const pending = newNodes.filter(
          (n) => !existingEdgeKeys.has(`${selectedId}-${n.id}`)
        );
        const newEdges = pending.map((n) => ({
          id: `${selectedId}-${n.id}`,
          source: selectedId,
          target: n.id,
          type: "smoothstep" as const,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
          },
          label: "includes",
          style: { stroke: "#2F6F5E", strokeWidth: 1.5 },
        }));

        const mergedEdges = [...current, ...newEdges];
        setNodes((currentNodes) => {
          const existing = new Set(currentNodes.map((n) => n.id));
          const added = toFlowNodes(pending).filter((n) => !existing.has(n.id));
          return computeHierarchicalLayout([...currentNodes, ...added], mergedEdges);
        });

        // Entrance + brief emphasis for the newly grown part of the map.
        if (pending.length > 0) {
          const ids = pending.map((n) => n.id);
          setFreshNodeIds(ids);
          setTimeout(() => {
            setFreshNodeIds((current) => current.filter((id) => !ids.includes(id)));
          }, 1400);
        }
        return mergedEdges;
      });

      setSaved(false);
      showSuccessNotification(language === "id" ? "Expand berhasil" : "Expanded successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expand failed.");
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

      if (!res.ok) throw new Error("Save failed.");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not save your map.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExplainConnection() {
    if (!selectedId || loading || actionInFlight) return;
    if (!selectedNode) return;

    // The parent link is the edge pointing *into* the selected node.
    const parentEdge = edges.find((e) => e.target === selectedId) ?? null;
    const parent = parentEdge
      ? nodes.find((n) => n.id === parentEdge.source) ?? null
      : null;

    setConnectionEdgeId(parentEdge?.id ?? null);

    if (!parent) {
      setPanel("explain-connection");
      setContent(
        language === "id"
          ? "Ini adalah konsep utama, jadi tidak ada hubungan dengan parent yang bisa dijelaskan."
          : "This is a root concept, so there is no parent connection to explain."
      );
      setError(null);
      setLoading(false);
      setActionInFlight(null);
      return;
    }

    setPanel("explain-connection");
    setContent("");
    setError(null);
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Explain connection failed.");
      setContent(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Explain connection failed.");
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
        onNodesChange={onNodesChange}
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
                Explain
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExplainConnection}
                disabled={loading || !!actionInFlight}
              >
                <GitBranch className="h-4 w-4" />
                Explain Connection
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExpand}
                disabled={loading || !!actionInFlight}
              >
                <Expand className="h-4 w-4" />
                {loading && actionInFlight === "expand"
                  ? (language === "id" ? "Membangkitkan..." : "Generating...")
                  : "Expand"}
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
                  ? "Explain"
                  : panel === "explain-connection"
                    ? "Explain Connection"
                    : "Expand"}
              </span>
              <button
                type="button"
                aria-label="Close panel"
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
              <div className="flex flex-col gap-2.5">
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
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {content}
                </p>
                {isCached && (
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
                    <span className="text-[11px] text-muted-foreground/70">
                      Shown from memory to save AI usage.
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => runExplain(true)}
                    >
                      Regenerate
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
          <LanguageToggle
            mapId={mapId}
            language={language}
            onLanguageChange={setLanguage}
          />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {saved && (
            <span
              role="status"
              className="mb-rise flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary"
            >
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || deleting}>
            {saving ? "Saving..." : "Save"}
          </Button>

          {confirmingDelete ? (
            <div className="mb-rise flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-card p-1 shadow-sm">
              <span className="hidden px-2 text-xs font-medium text-destructive sm:inline">
                Delete map?
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={handleDeleteMap}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              aria-label="Delete map"
              className="px-2 text-muted-foreground hover:border-destructive/30 hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
              disabled={saving || deleting}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}