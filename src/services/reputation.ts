import { prisma } from "@/lib/db";

/**
 * Reputation Service
 *
 * Tracks specialist quality scores in PostgreSQL. The service keeps the simple
 * weighted-average model used by the MVP, but Prisma is now the durable source
 * of truth instead of an in-memory object.
 */

export interface ReputationEntry {
  score: number;
  totalRatings: number;
}

export async function getReputation(specialistId: string): Promise<ReputationEntry> {
  const reputation = await prisma.reputation.findUnique({
    where: { specialistId },
  });

  return reputation
    ? { score: reputation.score, totalRatings: reputation.totalRatings }
    : { score: 50, totalRatings: 0 };
}

export async function updateReputation(
  specialistId: string,
  rating: number
): Promise<ReputationEntry> {
  const current = await getReputation(specialistId);
  const newTotal = current.totalRatings + 1;
  const newScore = Math.round(
    (current.score * current.totalRatings + rating) / newTotal
  );

  const reputation = await prisma.reputation.upsert({
    where: { specialistId },
    create: {
      specialistId,
      score: newScore,
      totalRatings: newTotal,
    },
    update: {
      score: newScore,
      totalRatings: newTotal,
    },
  });

  await prisma.specialist.updateMany({
    where: { id: specialistId },
    data: {
      reputation: reputation.score,
      totalJobs: reputation.totalRatings,
    },
  });

  return {
    score: reputation.score,
    totalRatings: reputation.totalRatings,
  };
}

export async function getAllReputations(): Promise<Record<string, ReputationEntry>> {
  const reputations = await prisma.reputation.findMany();
  return Object.fromEntries(
    reputations.map((r) => [
      r.specialistId,
      { score: r.score, totalRatings: r.totalRatings },
    ])
  );
}
