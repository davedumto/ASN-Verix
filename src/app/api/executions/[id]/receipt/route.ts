import { NextRequest, NextResponse } from "next/server";
import { getReceipt } from "@/services/receipt";
import { getExecution } from "@/services/execution";

/**
 * GET /api/executions/:id/receipt
 *
 * Returns the ExecutionReceipt for a completed task.
 *
 * The receipt commits to: task input hash, selected agent version hashes,
 * spend cap, total cost, trace root, output hash, and all on-chain payment
 * entries. receiptHash is SHA-256(canonical JSON of those fields) — a single
 * stable digest that downstream proof and escrow systems can verify.
 *
 * Returns 404 if no receipt exists (task is not yet completed or receipt
 * generation failed). Returns 202 if the task is still in progress.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const task = await getExecution(id);
  if (!task) {
    return NextResponse.json({ error: "Execution not found" }, { status: 404 });
  }

  if (task.status !== "completed") {
    return NextResponse.json(
      {
        error: "Receipt is only available for completed executions",
        status: task.status,
      },
      { status: 202 }
    );
  }

  const receipt = await getReceipt(id);
  if (!receipt) {
    return NextResponse.json(
      { error: "Receipt not yet generated for this execution" },
      { status: 404 }
    );
  }

  return NextResponse.json(receipt);
}
