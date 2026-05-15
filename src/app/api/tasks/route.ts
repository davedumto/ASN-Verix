import { NextRequest, NextResponse } from "next/server";
import { CreateTaskRequest, CreateTaskResponse } from "@/types/task";
import { executeCoordinator } from "@/services/coordinator";
import {
  createExecution,
  deleteExecution,
  getExecution,
  listExecutions,
  startExecution,
} from "@/services/execution";
import {
  canMutate,
  forbiddenResponse,
  getSessionId,
  setSessionCookie,
  unauthorizedResponse,
} from "@/lib/auth";
import { isStellarPublicKey } from "@/lib/stellar-config";
import { getSpecialistById } from "@/services/discovery";

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

    if (!isStellarPublicKey(body.walletAddress)) {
      return NextResponse.json(
        { error: "A connected Stellar wallet is required to submit a task" },
        { status: 400 }
      );
    }

    if (body.requestedSpecialistId) {
      const specialist = await getSpecialistById(body.requestedSpecialistId);
      if (!specialist) {
        return NextResponse.json(
          { error: "Requested marketplace agent was not found" },
          { status: 404 }
        );
      }
      if (specialist.status !== "online") {
        return NextResponse.json(
          { error: `Requested marketplace agent is ${specialist.status}` },
          { status: 409 }
        );
      }
      if (!isStellarPublicKey(specialist.walletAddress)) {
        return NextResponse.json(
          { error: "Requested marketplace agent does not have a valid Stellar payout wallet" },
          { status: 400 }
        );
      }
    }

    // Resolve or create a session for this caller
    const existingSession = getSessionId(request);
    const sessionId = existingSession ?? crypto.randomUUID();

    const { task, estimate } = await createExecution(body, sessionId);
    const jobId = await startExecution(task, executeCoordinator);

    const responseBody: CreateTaskResponse = {
      task_id: task.id,
      job_id: jobId,
      estimated_cost: estimate.estimated_cost,
      subtasks: estimate.subtasks,
    };

    const response = NextResponse.json(responseBody, { status: 201 });

    // Issue a session cookie if the caller didn't already have one
    if (!existingSession) {
      setSessionCookie(response, sessionId);
    }

    return response;
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

    const task = await getExecution(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Require a session
    const sessionId = getSessionId(request);
    if (!sessionId && !request.headers.get("x-admin-token")) {
      return unauthorizedResponse("A session is required to delete tasks");
    }

    // Check ownership
    if (!canMutate(request, task.ownerId)) {
      return forbiddenResponse("You can only delete tasks you created");
    }

    await deleteExecution(id);
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
