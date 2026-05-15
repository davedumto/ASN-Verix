import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { DEMO_OWNER_ID, DEMO_SPECIALISTS, DEMO_TASK_ID } from "./demo-data.mjs";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to reset demo data.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const includeAgents = process.argv.includes("--include-agents");
const force = process.argv.includes("--force");

async function main() {
  if (!force) {
    console.log("Refusing to reset demo data without --force.");
    console.log("Run: npm run demo:reset -- --force");
    console.log("To also remove demo agents: npm run demo:reset -- --force --include-agents");
    return;
  }

  const demoTasks = await prisma.task.findMany({
    where: { OR: [{ ownerId: DEMO_OWNER_ID }, { id: DEMO_TASK_ID }] },
    select: { id: true },
  });
  const taskIds = demoTasks.map((task) => task.id);

  if (taskIds.length > 0) {
    await prisma.proof.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.executionReceipt.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.executionTraceEvent.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.payment.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.subtask.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.job.deleteMany({ where: { taskId: { in: taskIds } } });

    const escrows = await prisma.escrow.findMany({
      where: { taskId: { in: taskIds } },
      select: { id: true },
    });
    const escrowIds = escrows.map((escrow) => escrow.id);
    if (escrowIds.length > 0) {
      await prisma.escrowMilestone.deleteMany({ where: { escrowId: { in: escrowIds } } });
      await prisma.escrow.deleteMany({ where: { id: { in: escrowIds } } });
    }

    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  }

  if (includeAgents) {
    const specialistIds = DEMO_SPECIALISTS.map((specialist) => specialist.id);
    await prisma.reputationEvent.deleteMany({ where: { specialistId: { in: specialistIds } } });
    await prisma.reputation.deleteMany({ where: { specialistId: { in: specialistIds } } });
    await prisma.agentVersion.deleteMany({ where: { specialistId: { in: specialistIds } } });
    await prisma.specialist.deleteMany({
      where: {
        id: { in: specialistIds },
        ownerId: DEMO_OWNER_ID,
      },
    });
  }

  console.log(`Reset ${taskIds.length} demo task(s).`);
  if (includeAgents) {
    console.log("Removed demo-owned specialist agents and versions.");
  } else {
    console.log("Kept specialist agents. Pass --include-agents to remove demo-owned specialists too.");
  }
}

main()
  .catch((err) => {
    console.error("Demo reset failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
