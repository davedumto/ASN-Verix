import { prisma } from "@/lib/db";
import { sha256, hashCanonical } from "@/lib/hash";
import { ExecutionTraceEvent, TraceEventType } from "@/types/trace";

/**
 * Trace Service — Issue #13 (structured events) + Issue #14 (deterministic hashing)
 *
 * Records hash-chained trace events for every significant coordinator action.
 * Each event commits to its content via SHA-256 and links to the previous
 * event's hash, so mutating any event in the chain changes all subsequent
 * hashes — making the final hash (the trace root) a binding commitment to the
 * complete execution history.
 */

// ── Mapping ───────────────────────────────────────────────────────────────────

function toTraceEvent(row: {
  id: string;
  taskId: string;
  sequence: number;
  eventType: string;
  actor: string;
  displayMessage: string;
  inputHash: string | null;
  outputHash: string | null;
  eventHash: string;
  prevEventHash: string | null;
  metadata: unknown;
  timestamp: Date;
}): ExecutionTraceEvent {
  return {
    id: row.id,
    taskId: row.taskId,
    sequence: row.sequence,
    eventType: row.eventType as TraceEventType,
    actor: row.actor,
    displayMessage: row.displayMessage,
    inputHash: row.inputHash ?? undefined,
    outputHash: row.outputHash ?? undefined,
    eventHash: row.eventHash,
    prevEventHash: row.prevEventHash ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    timestamp: row.timestamp.toISOString(),
  };
}

// ── Core recorder ─────────────────────────────────────────────────────────────

/**
 * Append a new trace event to a task's event chain.
 *
 * The event hash is computed from the deterministic fields (taskId, sequence,
 * eventType, actor, inputHash, outputHash, prevEventHash) so the same event
 * always produces the same hash — replay-safe and tamper-evident.
 *
 * Errors are intentionally surfaced: a failed trace write is a data integrity
 * concern that should surface rather than be silently swallowed.
 */
export async function recordTraceEvent(
  taskId: string,
  eventType: TraceEventType,
  actor: string,
  displayMessage: string,
  options: {
    inputHash?: string;
    outputHash?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<ExecutionTraceEvent> {
  // Fetch last event to chain hashes and assign the next sequence number.
  // The coordinator runs sequentially so this read-then-write is safe.
  const lastEvent = await prisma.executionTraceEvent.findFirst({
    where: { taskId },
    orderBy: { sequence: "desc" },
    select: { sequence: true, eventHash: true },
  });

  const sequence = (lastEvent?.sequence ?? -1) + 1;
  const prevEventHash = lastEvent?.eventHash ?? undefined;

  // Deterministic hash — excludes displayMessage (human-readable, non-canonical)
  const eventHash = hashCanonical({
    taskId,
    sequence,
    eventType,
    actor,
    inputHash: options.inputHash ?? null,
    outputHash: options.outputHash ?? null,
    prevEventHash: prevEventHash ?? null,
  });

  const row = await prisma.executionTraceEvent.create({
    data: {
      taskId,
      sequence,
      eventType,
      actor,
      displayMessage,
      inputHash: options.inputHash ?? null,
      outputHash: options.outputHash ?? null,
      eventHash,
      prevEventHash: prevEventHash ?? null,
      metadata: options.metadata as object ?? undefined,
    },
  });

  return toTraceEvent(row);
}

// ── Query ─────────────────────────────────────────────────────────────────────

export async function getTraceEvents(taskId: string): Promise<ExecutionTraceEvent[]> {
  const rows = await prisma.executionTraceEvent.findMany({
    where: { taskId },
    orderBy: { sequence: "asc" },
  });
  return rows.map(toTraceEvent);
}

// ── Trace root ────────────────────────────────────────────────────────────────

/**
 * Compute the trace root for a completed execution.
 *
 * The trace root is the eventHash of the last event in the chain, which
 * transitively commits to every preceding event via prevEventHash linkage.
 * An empty trace falls back to SHA-256("empty:<taskId>") so receipts always
 * have a non-null traceRoot.
 */
export async function computeTraceRoot(taskId: string): Promise<string> {
  const lastEvent = await prisma.executionTraceEvent.findFirst({
    where: { taskId },
    orderBy: { sequence: "desc" },
    select: { eventHash: true },
  });

  return lastEvent?.eventHash ?? sha256(`empty:${taskId}`);
}
