import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { AgentVersion, ProofPolicy, Specialist } from "@/types/specialist";

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
    description: "Security vulnerability detection, code review, and best practices analysis for smart contracts and application code.",
    endpoint: "/api/specialists/code-auditor/execute",
    walletAddress: "0x0000000000000000000000000000000000000001",
    capabilities: ["security-analysis", "code-review", "vulnerability-detection", "smart-contract-audit"],
    priceUsdc: 1.0,
    reputation: 95,
    totalJobs: 142,
    status: "online",
    aiModel: "claude",
    proofPolicy: "receipt-proof",
    currentVersion: 1,
  },
  {
    id: "specialist_market_analyst",
    name: "MarketAnalyst",
    description: "Financial analysis, market research, competitive intelligence, and investment analysis for DeFi and traditional markets.",
    endpoint: "/api/specialists/market-analyst/execute",
    walletAddress: "0x0000000000000000000000000000000000000002",
    capabilities: ["market-research", "financial-analysis", "competitive-intelligence", "defi-analytics"],
    priceUsdc: 0.75,
    reputation: 88,
    totalJobs: 98,
    status: "online",
    aiModel: "openai",
    proofPolicy: "trace-only",
    currentVersion: 1,
  },
  {
    id: "specialist_creative_writer",
    name: "CreativeWriter",
    description: "Polished business writing, reports, investment memos, whitepapers, and professional documents with structured reasoning.",
    endpoint: "/api/specialists/creative-writer/execute",
    walletAddress: "0x0000000000000000000000000000000000000003",
    capabilities: ["creative-writing", "report-writing", "business-documents", "whitepaper-drafting"],
    priceUsdc: 0.5,
    reputation: 92,
    totalJobs: 215,
    status: "online",
    aiModel: "openai",
    proofPolicy: "escrow-eligible",
    currentVersion: 1,
  },
];

let seedPromise: Promise<void> | null = null;

// ── Mapping helpers ────────────────────────────────────────────────────────────

function toProofPolicy(raw: string | null | undefined): ProofPolicy {
  if (raw === "receipt-proof" || raw === "escrow-eligible") return raw;
  return "trace-only";
}

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
  ownerId?: string | null;
  proofPolicy?: string | null;
  currentVersion?: number | null;
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
    ownerId: row.ownerId ?? undefined,
    proofPolicy: toProofPolicy(row.proofPolicy),
    currentVersion: row.currentVersion ?? 1,
  };
}

function toAgentVersion(row: {
  id: string;
  specialistId: string;
  version: number;
  name: string;
  description: string;
  walletAddress: string;
  capabilities: string[];
  priceUsdc: unknown;
  proofPolicy: string;
  aiModel: string;
  versionHash: string;
  createdAt: Date;
}): AgentVersion {
  return {
    id: row.id,
    specialistId: row.specialistId,
    version: row.version,
    name: row.name,
    description: row.description,
    walletAddress: row.walletAddress,
    capabilities: row.capabilities,
    priceUsdc: Number(row.priceUsdc),
    proofPolicy: toProofPolicy(row.proofPolicy),
    aiModel: row.aiModel,
    versionHash: row.versionHash,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Deterministic version hash so receipts can reference the exact agent
 * metadata used at invocation time.
 */
export function computeVersionHash(
  name: string,
  version: number,
  priceUsdc: number,
  walletAddress: string,
  capabilities: string[],
  proofPolicy: string
): string {
  const payload = [
    name,
    String(version),
    priceUsdc.toFixed(6),
    walletAddress.toLowerCase(),
    [...capabilities].sort().join(","),
    proofPolicy,
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

// ── Seeding ────────────────────────────────────────────────────────────────────

async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    for (const specialist of DEFAULT_SPECIALISTS) {
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
          proofPolicy: specialist.proofPolicy,
          currentVersion: specialist.currentVersion,
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
          proofPolicy: specialist.proofPolicy,
        },
      });

      // Seed version snapshot if none exists for v1
      const existingVersion = await prisma.agentVersion.findUnique({
        where: { specialistId_version: { specialistId: row.id, version: 1 } },
      });

      if (!existingVersion) {
        const versionHash = computeVersionHash(
          specialist.name,
          1,
          specialist.priceUsdc,
          specialist.walletAddress,
          specialist.capabilities,
          specialist.proofPolicy
        );
        await prisma.agentVersion.create({
          data: {
            specialistId: row.id,
            version: 1,
            name: specialist.name,
            description: specialist.description,
            walletAddress: specialist.walletAddress,
            capabilities: specialist.capabilities,
            priceUsdc: specialist.priceUsdc,
            proofPolicy: specialist.proofPolicy,
            aiModel: specialist.aiModel ?? "openai",
            versionHash,
          },
        });
      }

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

// ── Public API ────────────────────────────────────────────────────────────────

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

export async function registerSpecialist(
  specialist: Specialist,
  ownerId?: string
): Promise<Specialist> {
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
      ownerId,
      proofPolicy: specialist.proofPolicy,
      currentVersion: 1,
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
      proofPolicy: specialist.proofPolicy,
    },
  });

  // Create an immutable version snapshot
  const nextVersion = (row.currentVersion ?? 0) + 1;
  const versionHash = computeVersionHash(
    row.name,
    nextVersion,
    Number(row.priceUsdc),
    row.walletAddress,
    row.capabilities,
    row.proofPolicy
  );

  await prisma.agentVersion.upsert({
    where: { specialistId_version: { specialistId: row.id, version: nextVersion } },
    create: {
      specialistId: row.id,
      version: nextVersion,
      name: row.name,
      description: row.description,
      walletAddress: row.walletAddress,
      capabilities: row.capabilities,
      priceUsdc: row.priceUsdc,
      proofPolicy: row.proofPolicy,
      aiModel: row.aiModel ?? "openai",
      versionHash,
    },
    update: {},
  });

  await prisma.specialist.update({
    where: { id: row.id },
    data: { currentVersion: nextVersion },
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

  return toSpecialist({ ...row, currentVersion: nextVersion });
}

export type SpecialistUpdateFields = Partial<
  Pick<Specialist, "description" | "capabilities" | "priceUsdc" | "walletAddress" | "proofPolicy" | "aiModel" | "status"> & {
    apiKey: string;
    apiKeyMasked: string;
  }
>;

/**
 * Partially update an existing specialist.
 *
 * Versioned fields (price, wallet, capabilities, proofPolicy, aiModel) trigger
 * a new immutable AgentVersion snapshot so subtasks and receipts can always
 * reference the exact metadata that was active at invocation time.
 *
 * Returns the updated specialist, or null if the ID is unknown.
 */
export async function updateSpecialist(
  id: string,
  fields: SpecialistUpdateFields
): Promise<{ specialist: Specialist | null; ownerId?: string }> {
  const existing = await prisma.specialist.findUnique({ where: { id } });
  if (!existing) return { specialist: null };

  const VERSIONED_KEYS: Array<keyof SpecialistUpdateFields> = [
    "priceUsdc",
    "walletAddress",
    "capabilities",
    "proofPolicy",
    "aiModel",
  ];

  const versionedChanged = VERSIONED_KEYS.some((k) => {
    if (!(k in fields)) return false;
    const next = fields[k];
    const current = existing[k as keyof typeof existing];
    if (Array.isArray(next) && Array.isArray(current)) {
      return JSON.stringify([...next].sort()) !== JSON.stringify([...current].sort());
    }
    return String(next) !== String(current);
  });

  const updated = await prisma.specialist.update({
    where: { id },
    data: {
      ...(fields.description !== undefined ? { description: fields.description } : {}),
      ...(fields.capabilities !== undefined ? { capabilities: fields.capabilities } : {}),
      ...(fields.priceUsdc !== undefined ? { priceUsdc: fields.priceUsdc } : {}),
      ...(fields.walletAddress !== undefined ? { walletAddress: fields.walletAddress } : {}),
      ...(fields.proofPolicy !== undefined ? { proofPolicy: fields.proofPolicy } : {}),
      ...(fields.aiModel !== undefined ? { aiModel: fields.aiModel } : {}),
      ...(fields.status !== undefined ? { status: fields.status } : {}),
      ...(fields.apiKey !== undefined ? { apiKey: fields.apiKey } : {}),
      ...(fields.apiKeyMasked !== undefined ? { apiKeyMasked: fields.apiKeyMasked } : {}),
    },
  });

  if (versionedChanged) {
    const nextVersion = (updated.currentVersion ?? 0) + 1;
    const versionHash = computeVersionHash(
      updated.name,
      nextVersion,
      Number(updated.priceUsdc),
      updated.walletAddress,
      updated.capabilities,
      updated.proofPolicy
    );

    await prisma.agentVersion.create({
      data: {
        specialistId: updated.id,
        version: nextVersion,
        name: updated.name,
        description: updated.description,
        walletAddress: updated.walletAddress,
        capabilities: updated.capabilities,
        priceUsdc: updated.priceUsdc,
        proofPolicy: updated.proofPolicy,
        aiModel: updated.aiModel ?? "openai",
        versionHash,
      },
    });

    await prisma.specialist.update({
      where: { id: updated.id },
      data: { currentVersion: nextVersion },
    });

    return {
      specialist: toSpecialist({ ...updated, currentVersion: nextVersion }),
      ownerId: existing.ownerId ?? undefined,
    };
  }

  return {
    specialist: toSpecialist(updated),
    ownerId: existing.ownerId ?? undefined,
  };
}

export async function removeSpecialist(id: string): Promise<{ found: boolean; ownerId?: string }> {
  await ensureSeeded();
  const row = await prisma.specialist.findUnique({ where: { id } });
  if (!row) return { found: false };

  await prisma.specialist.update({
    where: { id },
    data: { status: "offline" },
  });

  return { found: true, ownerId: row.ownerId ?? undefined };
}

export async function getAgentVersions(specialistId: string): Promise<AgentVersion[]> {
  const rows = await prisma.agentVersion.findMany({
    where: { specialistId },
    orderBy: { version: "desc" },
  });
  return rows.map(toAgentVersion);
}

export async function getActiveAgentVersion(specialistId: string): Promise<AgentVersion | null> {
  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: { currentVersion: true },
  });
  if (!specialist) return null;

  const row = await prisma.agentVersion.findUnique({
    where: {
      specialistId_version: {
        specialistId,
        version: specialist.currentVersion,
      },
    },
  });
  return row ? toAgentVersion(row) : null;
}
