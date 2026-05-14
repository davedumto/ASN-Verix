import { taskStore } from "@/lib/task-store";
import {
  CreateTaskRequest,
  CreateTaskResponse,
  Task,
  TaskEvent,
  TaskResult,
  TaskStatus,
} from "@/types/task";

type ExecutionTransition = {
  from: TaskStatus[];
  to: TaskStatus;
};

const DEFAULT_SPEND_CAP = 50;

/**
 * Current UI-facing task statuses are intentionally preserved while this
 * service becomes the durable lifecycle boundary for later trace/proof/escrow
 * states. Future states should be added here first, then mapped to UI states.
 */
const ALLOWED_TRANSITIONS: ExecutionTransition[] = [
  { from: ["pending"], to: "decomposing" },
  { from: ["decomposing"], to: "discovering" },
  { from: ["discovering"], to: "processing" },
  { from: ["decomposing", "discovering", "processing"], to: "failed" },
  { from: ["processing"], to: "completed" },
];

export function estimateTaskCost(description: string): Pick<
  CreateTaskResponse,
  "estimated_cost" | "subtasks"
> {
  const lower = description.toLowerCase();
  const subtasks: string[] = [];
  let estimatedCost = 0;

  if (
    lower.includes("code") ||
    lower.includes("security") ||
    lower.includes("audit")
  ) {
    subtasks.push("Security Analysis (CodeAuditor)");
    estimatedCost += 1.0;
  }

  if (
    lower.includes("market") ||
    lower.includes("investment") ||
    lower.includes("analysis")
  ) {
    subtasks.push("Market Research (MarketAnalyst)");
    estimatedCost += 0.75;
  }

  if (
    lower.includes("memo") ||
    lower.includes("report") ||
    lower.includes("write")
  ) {
    subtasks.push("Professional Writing (CreativeWriter)");
    estimatedCost += 0.5;
  }

  if (subtasks.length === 0) {
    subtasks.push("General Analysis (Coordinator)");
    estimatedCost = 2.25;
  }

  return { estimated_cost: estimatedCost, subtasks };
}

export async function listExecutions(): Promise<Task[]> {
  return taskStore.getAll();
}

export async function getExecution(id: string): Promise<Task | undefined> {
  return taskStore.getById(id);
}

export async function deleteExecution(id: string): Promise<boolean> {
  return taskStore.delete(id);
}

export async function createExecution(
  request: CreateTaskRequest,
  ownerId?: string
): Promise<{ task: Task; estimate: Pick<CreateTaskResponse, "estimated_cost" | "subtasks"> }> {
  const description = request.description.trim();
  const task: Task = {
    id: crypto.randomUUID(),
    description,
    status: "pending",
    spendCap: request.spendCap ?? DEFAULT_SPEND_CAP,
    events: [],
    ownerId,
    createdAt: new Date().toISOString(),
  };

  await taskStore.set(task.id, task);
  await transitionExecution(task.id, "decomposing");

  return {
    task: {
      ...task,
      status: "decomposing",
    },
    estimate: estimateTaskCost(description),
  };
}

export async function startExecution(
  task: Task,
  runner: (taskId: string, description: string, spendCap?: number) => Promise<void>
): Promise<void> {
  runner(task.id, task.description, task.spendCap).catch(async (error) => {
    console.error(`Task ${task.id} failed:`, error);
    await failExecution(
      task.id,
      error instanceof Error ? error.message : "Unknown execution failure"
    );
  });
}

export async function transitionExecution(
  taskId: string,
  to: TaskStatus,
  updates: Partial<Task> = {}
): Promise<void> {
  const task = await taskStore.getById(taskId);
  if (!task) {
    throw new Error(`Cannot transition missing execution: ${taskId}`);
  }

  const allowed = ALLOWED_TRANSITIONS.some(
    (transition) => transition.to === to && transition.from.includes(task.status)
  );

  if (!allowed && task.status !== to) {
    throw new Error(`Invalid execution transition ${task.status} -> ${to}`);
  }

  await taskStore.update(taskId, {
    ...updates,
    status: to,
  });
}

export async function updateExecution(
  taskId: string,
  updates: Partial<Task>
): Promise<void> {
  const task = await taskStore.getById(taskId);
  if (!task) {
    throw new Error(`Cannot update missing execution: ${taskId}`);
  }

  await taskStore.update(taskId, updates);
}

export async function appendExecutionEvent(
  taskId: string,
  event: Omit<TaskEvent, "timestamp">
): Promise<void> {
  const task = await taskStore.getById(taskId);
  if (!task) {
    throw new Error(`Cannot append event to missing execution: ${taskId}`);
  }

  await taskStore.update(taskId, {
    events: [
      ...(task.events || []),
      { ...event, timestamp: new Date().toISOString() },
    ],
  });
}

export async function completeExecution(
  taskId: string,
  result: TaskResult,
  totalCost: number
): Promise<void> {
  await transitionExecution(taskId, "completed", {
    result,
    totalCost,
    completedAt: new Date().toISOString(),
  });
}

export async function failExecution(taskId: string, reason: string): Promise<void> {
  await appendExecutionEvent(taskId, {
    type: "system",
    status: "error",
    message: reason,
  }).catch((error) => {
    console.error(`[Execution] Failed to append failure event for ${taskId}:`, error);
  });

  await transitionExecution(taskId, "failed", {
    completedAt: new Date().toISOString(),
  }).catch(async (error) => {
    console.error(`[Execution] Failed transition failed for ${taskId}:`, error);
    await taskStore.update(taskId, {
      status: "failed",
      completedAt: new Date().toISOString(),
    });
  });
}
