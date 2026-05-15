import { AgentVersion, Specialist } from "@/types/specialist";
import { Subtask } from "@/types/task";

export function buildPinnedSubtask(
  specialist: Specialist,
  activeVersion?: AgentVersion | null
): Subtask {
  return {
    id: crypto.randomUUID(),
    capability: specialist.capabilities[0] || "general",
    specialistId: specialist.id,
    specialistName: specialist.name,
    status: "pending",
    cost: specialist.priceUsdc,
    agentVersionId: activeVersion?.id,
    agentVersion: activeVersion?.version,
    versionHash: activeVersion?.versionHash,
  };
}
