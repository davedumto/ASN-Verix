import { NextRequest, NextResponse } from "next/server";
import { Task } from "@/types/task";
import { taskStore } from "@/lib/task-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Retrieve task from shared store
  const task = taskStore.get(id);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

// Helper functions for backward compatibility
export async function updateTask(id: string, updates: Partial<Task>) {
  if (taskStore.has(id)) {
    await taskStore.update(id, updates);
  } else {
    await taskStore.set(id, updates as Task);
  }
}

export function getTask(id: string): Task | undefined {
  return taskStore.get(id);
}
