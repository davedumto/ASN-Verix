import { NextRequest, NextResponse } from "next/server";
import { CreateTaskRequest, CreateTaskResponse } from "@/types/task";
import { executeCoordinator } from "@/services/coordinator";
import {
  createExecution,
  deleteExecution,
  listExecutions,
  startExecution,
} from "@/services/execution";

export async function GET() {
  const tasks = await listExecutions();
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskRequest = await request.json();

    if (!body.description || body.description.trim().length === 0) {
      return NextResponse.json(
        { error: "Task description is required" },
        { status: 400 }
      );
    }

    const { task, estimate } = await createExecution(body);
    await startExecution(task, executeCoordinator);

    const response: CreateTaskResponse = {
      task_id: task.id,
      estimated_cost: estimate.estimated_cost,
      subtasks: estimate.subtasks,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const deleted = await deleteExecution(id);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    console.log(`[API] Deleted task: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
