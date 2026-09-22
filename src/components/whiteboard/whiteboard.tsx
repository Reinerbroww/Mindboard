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
import { Expand, Sparkles } from "lucide-react";
import { MindboardNode, type MindboardNodeData } from "@/components/whiteboard/mindboard-node";
import { computeHierarchicalLayout } from "@/lib/layout/dagre";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"explain" | "expand" | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => {
      const node = nodes.find((n) => n.id === selectedId) ?? null;
      if (!node) return null;
      return node as Node & { data: MindboardNodeData };
    },
    [nodes, selectedId]
  );

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

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedId(node.id);
    setPanel(null);
    setContent("");
    setError(null);
  }, []);

  async function handleExplain() {
    if (!selectedId) return;
    setPanel("explain");
    setContent("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId, nodeId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Explain failed.");
      setContent(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Explain failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExpand() {
    if (!selectedId) return;
    setPanel("expand");
    setContent("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId, nodeId: selectedId }),
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
        const newEdges = newNodes
          .filter((n) => !existingEdgeKeys.has(`${selectedId}-${n.id}`))
          .map((n) => ({
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
          const added = toFlowNodes(newNodes).filter(
            (n) => !existing.has(n.id)
          );
          return computeHierarchicalLayout(
            [...currentNodes, ...added],
            mergedEdges
          );
        });
        return mergedEdges;
      });

      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expand failed.");
    } finally {
      setLoading(false);
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

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
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

      {selectedNode && (
        <div className="absolute left-4 top-4 z-10 flex max-w-xs flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-sm font-medium">{selectedNode.data.label}</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExplain}
              disabled={loading}
            >
              <Sparkles className="h-4 w-4" />
              Explain
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExpand}
              disabled={loading}
            >
              <Expand className="h-4 w-4" />
              Expand
            </Button>
          </div>
        </div>
      )}

      {(panel === "explain" || panel === "expand") && (
        <div
          className={cn(
            "absolute left-4 top-32 z-10 max-h-[60vh] w-[min(90vw,26rem)] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-sm"
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold capitalize">
              {panel === "explain" ? "Explain" : "Expand"}
            </span>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setPanel(null)}
            >
              Close
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              {panel === "explain"
                ? "Explaining concept..."
                : "Expanding concept..."}
            </p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {content}
            </p>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-between p-4">
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="max-w-[40vw] truncate text-sm font-medium text-foreground/80">
            {mapTitle}
          </span>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {saved && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Saved
            </span>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}