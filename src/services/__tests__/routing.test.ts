import { describe, expect, it } from "vitest";
import { buildPinnedSubtask } from "@/services/routing";
import { Specialist } from "@/types/specialist";
import { AgentVersion } from "@/types/specialist";

const specialist: Specialist = {
  id: "specialist_code_auditor",
  name: "CodeAuditor",
  description: "Reviews code and smart contracts.",
  endpoint: "/api/specialists/code-auditor/execute",
  walletAddress: "G" + "A".repeat(55),
  capabilities: ["security-analysis", "code-review"],
  priceUsdc: 1.25,
  reputation: 95,
  totalJobs: 42,
  status: "online",
  aiModel: "openai",
  proofPolicy: "receipt-proof",
  currentVersion: 3,
};

const activeVersion: AgentVersion = {
  id: "agent_version_3",
  specialistId: specialist.id,
  version: 3,
  name: specialist.name,
  description: specialist.description,
  walletAddress: specialist.walletAddress,
  capabilities: specialist.capabilities,
  priceUsdc: specialist.priceUsdc,
  proofPolicy: specialist.proofPolicy,
  aiModel: "openai",
  versionHash: "c".repeat(64),
  createdAt: new Date("2026-05-15T00:00:00.000Z").toISOString(),
};

describe("marketplace selected-agent routing", () => {
  it("builds a pinned subtask with specialist and active version metadata", () => {
    const subtask = buildPinnedSubtask(specialist, activeVersion);

    expect(subtask.specialistId).toBe(specialist.id);
    expect(subtask.specialistName).toBe(specialist.name);
    expect(subtask.capability).toBe("security-analysis");
    expect(subtask.cost).toBe(1.25);
    expect(subtask.agentVersionId).toBe(activeVersion.id);
    expect(subtask.agentVersion).toBe(activeVersion.version);
    expect(subtask.versionHash).toBe(activeVersion.versionHash);
    expect(subtask.status).toBe("pending");
  });
});
