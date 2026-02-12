import { NextRequest, NextResponse } from "next/server";

// In-memory reputation store for MVP
const reputationScores: Record<string, { score: number; totalRatings: number }> =
  {
    specialist_code_auditor: { score: 95, totalRatings: 142 },
    specialist_market_analyst: { score: 88, totalRatings: 98 },
    specialist_creative_writer: { score: 92, totalRatings: 215 },
  };

export async function GET() {
  return NextResponse.json(reputationScores);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { specialistId, rating } = body;

    if (!specialistId || rating === undefined) {
      return NextResponse.json(
        { error: "specialistId and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 0 || rating > 100) {
      return NextResponse.json(
        { error: "Rating must be between 0 and 100" },
        { status: 400 }
      );
    }

    const current = reputationScores[specialistId] || {
      score: 50,
      totalRatings: 0,
    };

    // Simple weighted average
    const newTotal = current.totalRatings + 1;
    const newScore = Math.round(
      (current.score * current.totalRatings + rating) / newTotal
    );

    reputationScores[specialistId] = {
      score: newScore,
      totalRatings: newTotal,
    };

    return NextResponse.json({
      specialistId,
      previousScore: current.score,
      newScore,
      totalRatings: newTotal,
    });
  } catch (error) {
    console.error("Reputation update failed:", error);
    return NextResponse.json(
      { error: "Failed to update reputation" },
      { status: 500 }
    );
  }
}
