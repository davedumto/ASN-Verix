import { Specialist, Capability } from "@/types/specialist";

/**
 * Discovery Service
 *
 * Registry for specialist agents. Handles:
 * - Specialist registration
 * - Capability-based search
 * - Availability checking
 */

// In-memory registry for MVP — will be replaced with Prisma
const registry: Specialist[] = [
  {
    id: "specialist_code_auditor",
    name: "CodeAuditor",
    description: "Security vulnerability detection and best practices review",
    endpoint: "/api/specialists/code-auditor/execute",
    walletAddress: "0x0000000000000000000000000000000000000001",
    capabilities: ["security-analysis", "code-review"],
    priceUsdc: 1.0,
    reputation: 95,
    totalJobs: 142,
    status: "online",
  },
  {
    id: "specialist_market_analyst",
    name: "MarketAnalyst",
    description: "Financial analysis, market research, competitive intelligence",
    endpoint: "/api/specialists/market-analyst/execute",
    walletAddress: "0x0000000000000000000000000000000000000002",
    capabilities: ["market-research"],
    priceUsdc: 0.75,
    reputation: 88,
    totalJobs: 98,
    status: "online",
  },
  {
    id: "specialist_creative_writer",
    name: "CreativeWriter",
    description: "Polished business writing, reports, investment memos",
    endpoint: "/api/specialists/creative-writer/execute",
    walletAddress: "0x0000000000000000000000000000000000000003",
    capabilities: ["creative-writing"],
    priceUsdc: 0.5,
    reputation: 92,
    totalJobs: 215,
    status: "online",
  },
];

export function getAllSpecialists(): Specialist[] {
  return registry.filter((s) => s.status !== "offline");
}

export function searchByCapability(capability: Capability): Specialist[] {
  return registry.filter(
    (s) => s.capabilities.includes(capability) && s.status !== "offline"
  );
}

export function getSpecialistById(id: string): Specialist | undefined {
  return registry.find((s) => s.id === id);
}

export function registerSpecialist(specialist: Specialist): void {
  const existing = registry.findIndex((s) => s.id === specialist.id);
  if (existing >= 0) {
    registry[existing] = specialist;
  } else {
    registry.push(specialist);
  }
}
