import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import {
  DEMO_GOLDEN_PROMPT,
  DEMO_OWNER_ID,
  DEMO_SPEND_CAP_USDC,
  DEMO_SPECIALISTS,
  DEMO_TASK_ID,
  computeVersionHash,
} from "./demo-data.mjs";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed demo data.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seedSpecialists() {
  for (const specialist of DEMO_SPECIALISTS) {
    const row = await prisma.specialist.upsert({
      where: { name: specialist.name },
      create: {
        ...specialist,
        ownerId: DEMO_OWNER_ID,
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
        aiModel: specialist.aiModel,
        proofPolicy: specialist.proofPolicy,
        currentVersion: specialist.currentVersion,
        ownerId: DEMO_OWNER_ID,
      },
    });

    const versionHash = computeVersionHash(specialist, 1);
    await prisma.agentVersion.upsert({
      where: { specialistId_version: { specialistId: row.id, version: 1 } },
      create: {
        specialistId: row.id,
        version: 1,
        name: specialist.name,
        description: specialist.description,
        walletAddress: specialist.walletAddress,
        capabilities: specialist.capabilities,
        priceUsdc: specialist.priceUsdc,
        proofPolicy: specialist.proofPolicy,
        aiModel: specialist.aiModel,
        versionHash,
      },
      update: {
        name: specialist.name,
        description: specialist.description,
        walletAddress: specialist.walletAddress,
        capabilities: specialist.capabilities,
        priceUsdc: specialist.priceUsdc,
        proofPolicy: specialist.proofPolicy,
        aiModel: specialist.aiModel,
        versionHash,
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
  }
}

async function clearGoldenTaskRuntime() {
  const existing = await prisma.task.findUnique({
    where: { id: DEMO_TASK_ID },
    select: { id: true },
  });
  if (!existing) return;

  await prisma.proof.deleteMany({ where: { taskId: DEMO_TASK_ID } });
  await prisma.executionReceipt.deleteMany({ where: { taskId: DEMO_TASK_ID } });
  await prisma.executionTraceEvent.deleteMany({ where: { taskId: DEMO_TASK_ID } });
  await prisma.payment.deleteMany({ where: { taskId: DEMO_TASK_ID } });
  await prisma.subtask.deleteMany({ where: { taskId: DEMO_TASK_ID } });
  await prisma.job.deleteMany({ where: { taskId: DEMO_TASK_ID } });

  const escrow = await prisma.escrow.findUnique({
    where: { taskId: DEMO_TASK_ID },
    select: { id: true },
  });
  if (escrow) {
    await prisma.escrowMilestone.deleteMany({ where: { escrowId: escrow.id } });
    await prisma.escrow.delete({ where: { id: escrow.id } });
  }
}

async function seedGoldenTask() {
  await clearGoldenTaskRuntime();

  await prisma.task.upsert({
    where: { id: DEMO_TASK_ID },
    create: {
      id: DEMO_TASK_ID,
      ownerId: DEMO_OWNER_ID,
      description: DEMO_GOLDEN_PROMPT,
      spendCap: DEMO_SPEND_CAP_USDC,
      status: "pending",
      events: [
        {
          type: "system",
          status: "info",
          message: "Seeded demo task. Start this prompt to exercise routing, trace, proof, escrow, and receipt UI.",
          timestamp: new Date().toISOString(),
        },
      ],
    },
    update: {
      ownerId: DEMO_OWNER_ID,
      description: DEMO_GOLDEN_PROMPT,
      spendCap: DEMO_SPEND_CAP_USDC,
      status: "pending",
      result: null,
      totalCost: null,
      completedAt: null,
      events: [
        {
          type: "system",
          status: "info",
          message: "Seeded demo task. Start this prompt to exercise routing, trace, proof, escrow, and receipt UI.",
          timestamp: new Date().toISOString(),
        },
      ],
    },
  });
}

async function main() {
  await seedSpecialists();
  await seedGoldenTask();

  console.log("Seeded Verix golden-path demo data.");
  console.log(`Owner: ${DEMO_OWNER_ID}`);
  console.log(`Task:  ${DEMO_TASK_ID}`);
  console.log(`Cap:   $${DEMO_SPEND_CAP_USDC.toFixed(2)} USDC`);
  console.log(`Prompt:\n${DEMO_GOLDEN_PROMPT}`);
}

main()
  .catch((err) => {
    console.error("Demo seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
