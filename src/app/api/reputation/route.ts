import { NextRequest, NextResponse } from "next/server";
import {
  getAllReputations,
  getReputation,
  updateReputation,
} from "@/services/reputation";

export async function GET() {
  const reputationScores = await getAllReputations();
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

    if (typeof rating !== "number" || rating < 0 || rating > 100) {
      return NextResponse.json(
        { error: "Rating must be between 0 and 100" },
        { status: 400 }
      );
    }

    const current = await getReputation(specialistId);
    const updated = await updateReputation(specialistId, rating);

    return NextResponse.json({
      specialistId,
      previousScore: current.score,
      newScore: updated.score,
      totalRatings: updated.totalRatings,
    });
  } catch (error) {
    console.error("Reputation update failed:", error);
    return NextResponse.json(
      { error: "Failed to update reputation" },
      { status: 500 }
    );
  }
}
