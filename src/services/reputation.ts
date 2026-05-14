import { prisma } from "@/lib/db";

/**
 * Reputation Service
 *
 * Tracks specialist quality scores in PostgreSQL. The `Reputation` table holds
 * the rolling weighted-average score. The `ReputationEvent` table records each
 * individual event so verified and demo stats can be surfaced separately in the
 * marketplace without mixing unverified numbers into the trust signal.
 */

export type ReputationEventType = "verified_completion" | "demo_completion" | "failure";

export interface ReputationEntry {
  score: number;
  totalRatings: number;
}

export interface ReputationStats {
  score: number;
  totalJobs: number;
  verifiedJobs: number;
  demoJobs: number;
  successRate: number;
}

// ── Core score management ─────────────────────────────────────────────────────

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

// ── Receipt-backed reputation events ──────────────────────────────────────────

/**
 * Append a reputation event for a specialist.
 *
 * Only `verified_completion` events (verified=true) affect the verified stats
 * shown in the marketplace. Demo completions are tracked but labeled separately.
 * Failures decrement the score regardless of verification status.
 */
export async function appendReputationEvent(
  specialistId: string,
  type: ReputationEventType,
  options: {
    taskId?: string;
    verified?: boolean;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const score = type === "failure" ? -1 : 1;
  const verified = type === "verified_completion" ? true : (options.verified ?? false);

  await prisma.reputationEvent.create({
    data: {
      specialistId,
      taskId: options.taskId,
      type,
      score,
      verified,
      metadata: options.metadata as object ?? undefined,
    },
  });

  // Update rolling score: verified completions and failures affect it
  if (type === "verified_completion" || type === "failure") {
    await updateReputation(specialistId, type === "failure" ? 0 : 100);
  }
}

/**
 * Compute aggregated reputation stats for a specialist, separating verified
 * completions from demo completions so the marketplace can label them correctly.
 */
export async function getReputationStats(specialistId: string): Promise<ReputationStats> {
  const [reputation, events] = await Promise.all([
    getReputation(specialistId),
    prisma.reputationEvent.findMany({ where: { specialistId } }),
  ]);

  const verifiedJobs = events.filter((e) => e.verified && e.type === "verified_completion").length;
  const demoJobs = events.filter((e) => !e.verified && e.type === "demo_completion").length;
  const failures = events.filter((e) => e.type === "failure").length;
  const totalJobs = events.length;
  const successRate = totalJobs > 0 ? Math.round(((totalJobs - failures) / totalJobs) * 100) : 100;

  return {
    score: reputation.score,
    totalJobs,
    verifiedJobs,
    demoJobs,
    successRate,
  };
}

/**
 * Batch-fetch reputation stats for multiple specialists.
 */
export async function getReputationStatsForAll(
  specialistIds: string[]
): Promise<Record<string, ReputationStats>> {
  if (specialistIds.length === 0) return {};

  const [reputations, events] = await Promise.all([
    prisma.reputation.findMany({ where: { specialistId: { in: specialistIds } } }),
    prisma.reputationEvent.findMany({ where: { specialistId: { in: specialistIds } } }),
  ]);

  const repMap = Object.fromEntries(reputations.map((r) => [r.specialistId, r]));

  return Object.fromEntries(
    specialistIds.map((id) => {
      const rep = repMap[id];
      const idEvents = events.filter((e) => e.specialistId === id);
      const verifiedJobs = idEvents.filter((e) => e.verified && e.type === "verified_completion").length;
      const demoJobs = idEvents.filter((e) => !e.verified && e.type === "demo_completion").length;
      const failures = idEvents.filter((e) => e.type === "failure").length;
      const totalJobs = idEvents.length;
      const successRate = totalJobs > 0 ? Math.round(((totalJobs - failures) / totalJobs) * 100) : 100;

      return [
        id,
        {
          score: rep?.score ?? 50,
          totalJobs,
          verifiedJobs,
          demoJobs,
          successRate,
        } satisfies ReputationStats,
      ];
    })
  );
}
