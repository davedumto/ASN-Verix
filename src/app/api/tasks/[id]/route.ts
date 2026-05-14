import { NextRequest, NextResponse } from "next/server";
import { getExecution } from "@/services/execution";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const task = await getExecution(id);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Enrich subtasks with their pinned AgentVersion metadata so the client can
  // prove which agent snapshot was active at invocation time without a
  // separate round-trip to /api/specialists/:id.
  const agentVersionIds = (task.subtasks ?? [])
    .map((s) => s.agentVersionId)
    .filter((v): v is string => Boolean(v));

  let versionMap = new Map<string, { version: number; versionHash: string }>();
  if (agentVersionIds.length > 0) {
    try {
      const versions = await prisma.agentVersion.findMany({
        where: { id: { in: agentVersionIds } },
        select: { id: true, version: true, versionHash: true },
      });
      versionMap = new Map(versions.map((v) => [v.id, { version: v.version, versionHash: v.versionHash }]));
    } catch {
      // Non-fatal — version data is informational; the task response still serves
    }
  }

  const enrichedSubtasks = (task.subtasks ?? []).map((s) => {
    const vInfo = s.agentVersionId ? versionMap.get(s.agentVersionId) : undefined;
    return {
      ...s,
      agentVersion: s.agentVersion ?? vInfo?.version,
      versionHash: s.versionHash ?? vInfo?.versionHash,
    };
  });

  return NextResponse.json({ ...task, subtasks: enrichedSubtasks });
}
