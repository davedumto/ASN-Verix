import { NextRequest, NextResponse } from "next/server";
import { getSpecialistById, getAgentVersions } from "@/services/discovery";
import { getReputationStats } from "@/services/reputation";

/**
 * GET /api/specialists/:id
 *
 * Returns full agent profile:
 *   - Specialist metadata (minus encrypted API key and ownerId)
 *   - Immutable version history (newest first)
 *   - Reputation stats: score, total jobs, verified vs demo breakdown, success rate
 *
 * Used by the /marketplace/[id] profile page.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const [specialist, versions, reputation] = await Promise.all([
    getSpecialistById(id),
    getAgentVersions(id),
    getReputationStats(id),
  ]);

  if (!specialist) {
    return NextResponse.json({ error: "Specialist not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...specialist,
    apiKey: undefined,
    ownerId: undefined,
    versions,
    reputation,
  });
}
