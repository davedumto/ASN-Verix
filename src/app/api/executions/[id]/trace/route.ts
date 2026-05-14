import { NextRequest, NextResponse } from "next/server";
import { getTraceEvents } from "@/services/trace";
import { getExecution } from "@/services/execution";

/**
 * GET /api/executions/:id/trace
 *
 * Returns the ordered list of ExecutionTraceEvent records for a task,
 * sorted deterministically by sequence number ascending.
 *
 * Consumers (proof workers, UI, escrow) can verify the hash chain by
 * recomputing each event's hash from its canonical fields and confirming
 * prevEventHash continuity. The last event's eventHash is the trace root.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Confirm the task exists before querying trace events
  const task = await getExecution(id);
  if (!task) {
    return NextResponse.json({ error: "Execution not found" }, { status: 404 });
  }

  const events = await getTraceEvents(id);

  return NextResponse.json({
    taskId: id,
    status: task.status,
    eventCount: events.length,
    traceRoot: events.length > 0 ? events[events.length - 1].eventHash : null,
    events,
  });
}
