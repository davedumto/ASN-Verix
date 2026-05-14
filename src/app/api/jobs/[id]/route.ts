import { NextRequest, NextResponse } from "next/server";
import { getJob, getJobsForTask } from "@/services/jobs";

/**
 * GET /api/jobs/:id
 *
 * Returns the status of a single job by its ID.
 * Used by the UI and debugging tools to poll execution state.
 *
 * GET /api/jobs/:taskId?byTask=true
 * Returns all jobs associated with a task (ordered newest-first).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const byTask = searchParams.get("byTask") === "true";

  if (byTask) {
    const jobs = await getJobsForTask(id);
    return NextResponse.json(jobs);
  }

  const job = await getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
