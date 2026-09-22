"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export interface MindboardNodeData {
  label: string;
  description?: string | null;
  level: number;
}

type MindboardNode = NodeProps & {
  data: MindboardNodeData;
};

const byLevel = {
  0: "border-primary bg-primary text-primary-foreground font-semibold",
  1: "border-primary/30 bg-secondary text-secondary-foreground",
  2: "border-border bg-card text-foreground",
} as const;

export function MindboardNode({ data, isConnectable }: MindboardNode) {
  const level = Math.min(Math.max(data.level, 0), 2) as 0 | 1 | 2;
  return (
    <div
      className={cn(
        "min-w-[160px] max-w-[220px] rounded-xl border px-4 py-3 shadow-sm transition-shadow",
        byLevel[level]
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!bg-primary/40"
      />
      <span className="block text-sm leading-snug">{data.label}</span>
      {data.description && (
        <span className="mt-1 block text-xs leading-snug opacity-70">
          {data.description}
        </span>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!bg-primary/40"
      />
    </div>
  );
}