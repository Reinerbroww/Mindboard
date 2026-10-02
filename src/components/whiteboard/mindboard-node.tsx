"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export interface MindboardNodeData {
  label: string;
  description?: string | null;
  level: number;
  hasChildren?: boolean;
  /** Dimmed while another node is selected. */
  dimmed?: boolean;
  /** Direct parent/child of the selected node. */
  related?: boolean;
  /** Added by Expand — brief entrance + emphasis. */
  isNew?: boolean;
}

type MindboardNode = NodeProps & {
  data: MindboardNodeData;
};

const byLevel = {
  0: "border-primary bg-primary text-primary-foreground",
  1: "border-primary/25 bg-secondary text-secondary-foreground",
  2: "border-border bg-card text-foreground",
} as const;

export function MindboardNode({ data, isConnectable, selected }: MindboardNode) {
  const level = Math.min(Math.max(data.level, 0), 2) as 0 | 1 | 2;
  const isParent = data.hasChildren === true;

  return (
    <div
      className={cn(
        "group relative min-w-[160px] max-w-[220px] rounded-xl border px-4 py-3",
        "transition-[box-shadow,border-color,opacity,transform] duration-200 ease-out",
        "motion-reduce:transition-none",
        byLevel[level],
        // Expanded parents read as expandable without leaving the palette.
        isParent && level !== 0 && "shadow-[0_1px_2px_rgb(38_51_46/0.06)]",
        !selected && "hover:border-primary/40 hover:shadow-[0_4px_16px_rgb(38_51_46/0.08)]",
        selected &&
          "border-primary shadow-[0_0_0_2px_rgb(47_111_94/0.18),0_8px_24px_rgb(38_51_46/0.10)]",
        data.related && !selected && "border-primary/45",
        data.dimmed && "opacity-45 saturate-[0.75]",
        data.isNew && "mb-pop"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!bg-primary/40"
      />

      <span
        className={cn(
          "block leading-snug",
          level === 0 ? "text-[15px] font-semibold" : "text-sm font-medium"
        )}
      >
        {data.label}
      </span>

      {data.description && (
        <span className="mt-1 block text-xs leading-snug opacity-70">
          {data.description}
        </span>
      )}

      {isParent && (
        <span
          className={cn(
            "absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border",
            level === 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary/25 bg-accent text-primary"
          )}
          title="This concept can be expanded"
        >
          <span className="text-xs font-semibold leading-none">+</span>
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