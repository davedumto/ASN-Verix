import { NextRequest, NextResponse } from "next/server";
import { CreateTaskRequest, CreateTaskResponse, Task } from "@/types/task";
import { updateTask } from "./[id]/route";
import { executeCoordinator } from "@/services/coordinator";
import { taskStore } from "@/lib/task-store";

export async function GET() {
  const tasks = await taskStore.getAll();
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

    const taskId = crypto.randomUUID();

    // Estimate cost based on task description
    const lower = body.description.toLowerCase();
    const subtaskDescriptions: string[] = [];
    let estimatedCost = 0;

    if (
      lower.includes("code") ||
      lower.includes("security") ||
      lower.includes("audit")
    ) {
      subtaskDescriptions.push("Security Analysis (CodeAuditor)");
      estimatedCost += 1.0;
    }
    if (
      lower.includes("market") ||
      lower.includes("investment") ||
      lower.includes("analysis")
    ) {
      subtaskDescriptions.push("Market Research (MarketAnalyst)");
      estimatedCost += 0.75;
    }
    if (
      lower.includes("memo") ||
      lower.includes("report") ||
      lower.includes("write")
    ) {
      subtaskDescriptions.push("Professional Writing (CreativeWriter)");
      estimatedCost += 0.5;
    }

    if (subtaskDescriptions.length === 0) {
      subtaskDescriptions.push("General Analysis (Coordinator)");
      estimatedCost = 2.25;
    }

    // Create initial task in storage with spend cap
    const spendCap = body.spendCap ?? 50; // default $50 cap
    const task: Task = {
      id: taskId,
      description: body.description,
      status: "decomposing",
      spendCap,
      events: [],
      createdAt: new Date().toISOString(),
    };

    await updateTask(taskId, task);

    // Execute real coordinator workflow (async) with spend cap
    executeCoordinator(taskId, body.description, spendCap).catch(async (error) => {
      console.error(`Task ${taskId} failed:`, error);
      await updateTask(taskId, {
        status: "failed",
        completedAt: new Date().toISOString(),
      });
    });

    const response: CreateTaskResponse = {
      task_id: taskId,
      estimated_cost: estimatedCost,
      subtasks: subtaskDescriptions,
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

    const deleted = await taskStore.delete(id);
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
