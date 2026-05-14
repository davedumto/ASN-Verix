import { NextRequest, NextResponse } from "next/server";
import {
  getAllReputations,
  appendReputationEvent,
  ReputationEventType,
} from "@/services/reputation";

const VALID_EVENT_TYPES: ReputationEventType[] = [
  "verified_completion",
  "demo_completion",
  "failure",
];

export async function GET() {
  const reputationScores = await getAllReputations();
  return NextResponse.json(reputationScores);
}

/**
 * POST /api/reputation
 *
 * Create a receipt-backed reputation event for a specialist.
 * Restricted to internal services — requires the x-admin-token header.
 * Reputation cannot be updated by arbitrary authenticated user sessions;
 * all events must be tied to execution outcomes.
 *
 * Body: { specialistId, type, taskId? }
 *   type: "verified_completion" | "demo_completion" | "failure"
 */
export async function POST(request: NextRequest) {
  // Only internal services may record reputation events
  const adminToken = request.headers.get("x-admin-token");
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "Reputation events may only be recorded by internal services" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { specialistId, type, taskId } = body;

    if (!specialistId) {
      return NextResponse.json({ error: "specialistId is required" }, { status: 400 });
    }

    if (!type || !VALID_EVENT_TYPES.includes(type as ReputationEventType)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_EVENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    await appendReputationEvent(specialistId, type as ReputationEventType, {
      taskId: taskId ?? undefined,
      verified: type === "verified_completion",
    });

    return NextResponse.json({ success: true, specialistId, type });
  } catch (error) {
    console.error("Reputation event failed:", error);
    return NextResponse.json(
      { error: "Failed to record reputation event" },
      { status: 500 }
    );
  }
}
