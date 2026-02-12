/**
 * Reputation Service
 *
 * Tracks specialist quality scores:
 * - Updated after each completed task
 * - Weighted average of all ratings
 * - Used by coordinator for specialist selection
 */

interface ReputationEntry {
  score: number;
  totalRatings: number;
}

// In-memory store for MVP
const scores: Record<string, ReputationEntry> = {
  specialist_code_auditor: { score: 95, totalRatings: 142 },
  specialist_market_analyst: { score: 88, totalRatings: 98 },
  specialist_creative_writer: { score: 92, totalRatings: 215 },
};

export function getReputation(specialistId: string): ReputationEntry {
  return scores[specialistId] || { score: 50, totalRatings: 0 };
}

export function updateReputation(
  specialistId: string,
  rating: number
): ReputationEntry {
  const current = getReputation(specialistId);
  const newTotal = current.totalRatings + 1;
  const newScore = Math.round(
    (current.score * current.totalRatings + rating) / newTotal
  );

  scores[specialistId] = { score: newScore, totalRatings: newTotal };
  return scores[specialistId];
}

export function getAllReputations(): Record<string, ReputationEntry> {
  return { ...scores };
}
