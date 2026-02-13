import { Specialist } from "@/types/specialist";

/**
 * Discovery Service
 *
 * Registry for specialist agents. Handles:
 * - Specialist registration (in-memory for MVP)
 * - Dynamic lookup for AI routing
 * - Availability checking
 */

// In-memory registry — seeded with default agents
const registry: Specialist[] = [
  {
    id: "specialist_code_auditor",
    name: "CodeAuditor",
    description: "Security vulnerability detection, code review, and best practices analysis",
    endpoint: "/api/specialists/code-auditor/execute",
    walletAddress: "0x0000000000000000000000000000000000000001",
    capabilities: ["security-analysis", "code-review", "vulnerability-detection"],
    priceUsdc: 1.0,
    reputation: 95,
    totalJobs: 142,
    status: "online",
    aiModel: "claude",
  },
  {
    id: "specialist_market_analyst",
    name: "MarketAnalyst",
    description: "Financial analysis, market research, competitive intelligence, and investment analysis",
    endpoint: "/api/specialists/market-analyst/execute",
    walletAddress: "0x0000000000000000000000000000000000000002",
    capabilities: ["market-research", "financial-analysis", "competitive-intelligence"],
    priceUsdc: 0.75,
    reputation: 88,
    totalJobs: 98,
    status: "online",
    aiModel: "openai",
  },
  {
    id: "specialist_creative_writer",
    name: "CreativeWriter",
    description: "Polished business writing, reports, investment memos, and professional documents",
    endpoint: "/api/specialists/creative-writer/execute",
    walletAddress: "0x0000000000000000000000000000000000000003",
    capabilities: ["creative-writing", "report-writing", "business-documents"],
    priceUsdc: 0.5,
    reputation: 92,
    totalJobs: 215,
    status: "online",
    aiModel: "openai",
  },
];

export function getAllSpecialists(): Specialist[] {
  return registry.filter((s) => s.status !== "offline");
}

/**
 * Returns a compact summary of all specialists for the AI router.
 * The coordinator LLM uses this to decide which agents to assign.
 */
export function getSpecialistSummariesForRouting(): {
  name: string;
  description: string;
  capabilities: string[];
  priceUsdc: number;
}[] {
  return getAllSpecialists().map((s) => ({
    name: s.name,
    description: s.description,
    capabilities: s.capabilities,
    priceUsdc: s.priceUsdc,
  }));
}

export function getSpecialistByName(name: string): Specialist | undefined {
  return registry.find((s) => s.name === name && s.status !== "offline");
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

export function removeSpecialist(id: string): boolean {
  const idx = registry.findIndex((s) => s.id === id);
  if (idx >= 0) {
    registry.splice(idx, 1);
    return true;
  }
  return false;
}
