"use client";

import { useState } from "react";

interface TaskInputProps {
  onSubmit: (description: string) => void;
  estimatedCost: number | null;
  isLoading: boolean;
}

export default function TaskInput({
  onSubmit,
  estimatedCost,
  isLoading,
}: TaskInputProps) {
  const [task, setTask] = useState("");

  const handleSubmit = () => {
    if (!task.trim() || isLoading) return;
    onSubmit(task);
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-8">
      <h2 className="text-lg font-semibold text-ink mb-1">
        Describe your task
      </h2>
      <p className="text-sm text-ink-secondary mb-6">
        Our coordinator will decompose it and delegate to specialist agents.
      </p>

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder={'e.g. "Analyze TechStartup\'s codebase for security vulnerabilities, research their market position, and create a professional investment memo."'}
        className="w-full h-32 px-4 py-3 bg-surface-secondary border border-border rounded-lg text-ink placeholder:text-ink-muted resize-none focus:outline-none focus:border-border-strong transition-colors text-sm"
      />

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-ink-secondary">
          {estimatedCost !== null && (
            <span>
              Estimated cost:{" "}
              <span className="font-semibold text-ink">
                ${estimatedCost.toFixed(2)} USDC
              </span>
            </span>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!task.trim() || isLoading}
          className="px-6 py-2.5 bg-accent text-surface rounded-lg font-medium text-sm hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Submitting..." : "Submit Task"}
        </button>
      </div>
    </div>
  );
}
