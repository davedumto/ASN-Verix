"use client";

import { TaskStatus, Subtask } from "@/types/task";

interface StatusPanelProps {
  taskStatus: TaskStatus | null;
  subtasks: Subtask[];
  totalCost: number;
  elapsedTime: number;
}

const statusLabels: Record<TaskStatus, string> = {
  pending: "Pending",
  decomposing: "Decomposing Task",
  discovering: "Finding Specialists",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const subtaskStatusIcons: Record<TaskStatus, string> = {
  pending: "○",
  decomposing: "◌",
  discovering: "◌",
  processing: "◑",
  completed: "●",
  failed: "✕",
};

export default function StatusPanel({
  taskStatus,
  subtasks,
  totalCost,
  elapsedTime,
}: StatusPanelProps) {
  return (
    <div className="bg-surface rounded-xl border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-ink">Status</h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Status */}
        <div>
          <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">
            Current Phase
          </p>
          <div className="flex items-center gap-2">
            {taskStatus && taskStatus !== "completed" && taskStatus !== "failed" && (
              <span className="w-2 h-2 rounded-full bg-ink animate-pulse-subtle" />
            )}
            {taskStatus === "completed" && (
              <span className="w-2 h-2 rounded-full bg-success" />
            )}
            {taskStatus === "failed" && (
              <span className="w-2 h-2 rounded-full bg-error" />
            )}
            <span className="font-medium text-ink">
              {taskStatus ? statusLabels[taskStatus] : "Idle"}
            </span>
          </div>
        </div>

        {/* Subtasks */}
        {subtasks.length > 0 && (
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-wide mb-3">
              Subtasks
            </p>
            <div className="space-y-2">
              {subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-secondary"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-ink-muted text-sm font-mono">
                      {subtaskStatusIcons[subtask.status]}
                    </span>
                    <span className="text-sm text-ink">
                      {subtask.specialistName || subtask.capability}
                    </span>
                  </div>
                  {subtask.cost !== undefined && (
                    <span className="text-xs font-mono text-ink-secondary">
                      ${subtask.cost.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">
              Total Cost
            </p>
            <p className="text-lg font-semibold text-ink font-mono">
              ${totalCost.toFixed(2)}
            </p>
            <p className="text-xs text-ink-muted">USDC</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">
              Elapsed
            </p>
            <p className="text-lg font-semibold text-ink font-mono">
              {elapsedTime.toFixed(1)}s
            </p>
            <p className="text-xs text-ink-muted">Gas fees: $0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}
