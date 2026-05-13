import { prisma } from "@/lib/db";
import { Specialist } from "@/types/specialist";

/**
 * Discovery Service
 *
 * Registry for specialist agents. Prisma is the source of truth; the default
 * specialists are seeded on first use so demo agents survive restarts.
 */

const DEFAULT_SPECIALISTS: Specialist[] = [
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

let seedPromise: Promise<void> | null = null;

function toSpecialist(row: {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  walletAddress: string;
  capabilities: string[];
  priceUsdc: unknown;
  reputation: number;
  totalJobs: number;
  status: string;
  aiModel: string | null;
  apiKey: string | null;
  apiKeyMasked: string | null;
}): Specialist {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    endpoint: row.endpoint,
    walletAddress: row.walletAddress,
    capabilities: row.capabilities,
    priceUsdc: Number(row.priceUsdc),
    reputation: row.reputation,
    totalJobs: row.totalJobs,
    status: row.status as Specialist["status"],
    aiModel: row.aiModel === "claude" ? "claude" : "openai",
    apiKey: row.apiKey ?? undefined,
    apiKeyMasked: row.apiKeyMasked ?? undefined,
  };
}

async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    for (const specialist of DEFAULT_SPECIALISTS) {
      await prisma.specialist.upsert({
        where: { name: specialist.name },
        create: {
          id: specialist.id,
          name: specialist.name,
          description: specialist.description,
          endpoint: specialist.endpoint,
          walletAddress: specialist.walletAddress,
          capabilities: specialist.capabilities,
          priceUsdc: specialist.priceUsdc,
          reputation: specialist.reputation,
          totalJobs: specialist.totalJobs,
          status: specialist.status,
          aiModel: specialist.aiModel ?? "openai",
        },
        update: {
          description: specialist.description,
          endpoint: specialist.endpoint,
          capabilities: specialist.capabilities,
          priceUsdc: specialist.priceUsdc,
          reputation: specialist.reputation,
          totalJobs: specialist.totalJobs,
          status: specialist.status,
          aiModel: specialist.aiModel ?? "openai",
        },
      });

      await prisma.reputation.upsert({
        where: { specialistId: specialist.id },
        create: {
          specialistId: specialist.id,
          score: specialist.reputation,
          totalRatings: specialist.totalJobs,
        },
        update: {
          score: specialist.reputation,
          totalRatings: specialist.totalJobs,
        },
      });
    }
  })();

  return seedPromise;
}

export async function getAllSpecialists(): Promise<Specialist[]> {
  await ensureSeeded();
  const rows = await prisma.specialist.findMany({
    where: { status: { not: "offline" } },
    orderBy: [{ reputation: "desc" }, { priceUsdc: "asc" }],
  });
  return rows.map(toSpecialist);
}

/**
 * Returns a compact summary of all specialists for the AI router.
 * The coordinator LLM uses this to decide which agents to assign.
 */
export async function getSpecialistSummariesForRouting(): Promise<{
  name: string;
  description: string;
  capabilities: string[];
  priceUsdc: number;
}[]> {
  const specialists = await getAllSpecialists();
  return specialists.map((s) => ({
    name: s.name,
    description: s.description,
    capabilities: s.capabilities,
    priceUsdc: s.priceUsdc,
  }));
}

export async function getSpecialistByName(name: string): Promise<Specialist | undefined> {
  await ensureSeeded();
  const row = await prisma.specialist.findFirst({
    where: { name, status: { not: "offline" } },
  });
  return row ? toSpecialist(row) : undefined;
}

export async function getSpecialistById(id: string): Promise<Specialist | undefined> {
  await ensureSeeded();
  const row = await prisma.specialist.findUnique({ where: { id } });
  return row ? toSpecialist(row) : undefined;
}

export async function registerSpecialist(specialist: Specialist): Promise<Specialist> {
  await ensureSeeded();
  const row = await prisma.specialist.upsert({
    where: { name: specialist.name },
    create: {
      id: specialist.id,
      name: specialist.name,
      description: specialist.description,
      endpoint: specialist.endpoint,
      walletAddress: specialist.walletAddress,
      capabilities: specialist.capabilities,
      priceUsdc: specialist.priceUsdc,
      reputation: specialist.reputation,
      totalJobs: specialist.totalJobs,
      status: specialist.status,
      aiModel: specialist.aiModel ?? "openai",
      apiKey: specialist.apiKey,
      apiKeyMasked: specialist.apiKeyMasked,
    },
    update: {
      description: specialist.description,
      endpoint: specialist.endpoint,
      walletAddress: specialist.walletAddress,
      capabilities: specialist.capabilities,
      priceUsdc: specialist.priceUsdc,
      reputation: specialist.reputation,
      totalJobs: specialist.totalJobs,
      status: specialist.status,
      aiModel: specialist.aiModel ?? "openai",
      apiKey: specialist.apiKey,
      apiKeyMasked: specialist.apiKeyMasked,
    },
  });

  await prisma.reputation.upsert({
    where: { specialistId: row.id },
    create: {
      specialistId: row.id,
      score: specialist.reputation,
      totalRatings: specialist.totalJobs,
    },
    update: {
      score: specialist.reputation,
      totalRatings: specialist.totalJobs,
    },
  });

  return toSpecialist(row);
}

export async function removeSpecialist(id: string): Promise<boolean> {
  await ensureSeeded();
  const row = await prisma.specialist.findUnique({ where: { id } });
  if (!row) return false;

  await prisma.specialist.update({
    where: { id },
    data: { status: "offline" },
  });

  return true;
}
