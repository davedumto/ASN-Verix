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
  console.log("[tasks] GET /api/tasks — start");
  try {
    const tasks = await listExecutions();
    console.log(`[tasks] GET /api/tasks — ok, ${tasks.length} tasks`);
    return NextResponse.json(tasks);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[tasks] GET /api/tasks — error: ${msg}`);
    if (error instanceof Error) console.error(error.stack);
    return NextResponse.json({ error: "Failed to list tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log("[tasks] POST /api/tasks — start");
  try {
    let body: CreateTaskRequest = await request.json();

    if (!body.description || body.description.trim().length === 0) {
      return NextResponse.json({ error: "Task description is required" }, { status: 400 });
    }

    // Merge uploaded file content into the description so agents receive full context
    if (Array.isArray(body.attachments) && body.attachments.length > 0) {
      const sections = body.attachments.map((a) =>
        `\n\n--- Attached file: ${a.name} ---\n${a.content}\n--- End of ${a.name} ---`
      );
      body = { ...body, description: body.description + sections.join("") };
    }

    if (!isStellarPublicKey(body.walletAddress)) {
      console.log(`[tasks] walletAddress rejected: "${body.walletAddress}"`);
      return NextResponse.json(
        { error: "A connected Stellar wallet is required to submit a task" },
        { status: 400 }
      );
    }

    if (body.requestedSpecialistId) {
      const specialist = await getSpecialistById(body.requestedSpecialistId);
      if (!specialist) {
        return NextResponse.json({ error: "Requested marketplace agent was not found" }, { status: 404 });
      }
      if (specialist.status !== "online") {
        return NextResponse.json({ error: `Requested marketplace agent is ${specialist.status}` }, { status: 409 });
      }
      if (!isStellarPublicKey(specialist.walletAddress)) {
        return NextResponse.json(
          { error: "Requested marketplace agent does not have a valid Stellar payout wallet" },
          { status: 400 }
        );
      }
    }

    const existingSession = getSessionId(request);
    const sessionId = existingSession ?? crypto.randomUUID();

    console.log("[tasks] creating execution...");
    const { task, estimate } = await createExecution(body, sessionId);
    console.log(`[tasks] execution created: task=${task.id}`);

    const jobId = await startExecution(task, executeCoordinator);
    console.log(`[tasks] job started: job=${jobId}`);

    const responseBody: CreateTaskResponse = {
      task_id: task.id,
      job_id: jobId,
      estimated_cost: estimate.estimated_cost,
      subtasks: estimate.subtasks,
    };

    const response = NextResponse.json(responseBody, { status: 201 });
    if (!existingSession) setSessionCookie(response, sessionId);
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[tasks] POST /api/tasks — error: ${msg}`);
    if (error instanceof Error) console.error(error.stack);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  console.log("[tasks] DELETE /api/tasks — start");
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Task ID is required" }, { status: 400 });

    const task = await getExecution(id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const sessionId = getSessionId(request);
    if (!sessionId && !request.headers.get("x-admin-token")) {
      return unauthorizedResponse("A session is required to delete tasks");
    }
    if (!canMutate(request, task.ownerId)) return forbiddenResponse("You can only delete tasks you created");

    await deleteExecution(id);
    console.log(`[tasks] deleted task=${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[tasks] DELETE /api/tasks — error: ${msg}`);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
