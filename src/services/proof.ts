/**
 * Proof service — EPIC 5 (Issues #24–#26)
 *
 * Generates and verifies workflow integrity proofs from ExecutionReceipts.
 *
 * Three modes (controlled by PROOF_MODE env var):
 *   "disabled"      — no-op; receipt stays at "proof_ready"
 *   "local"         — runs TypeScript deterministic verifier in-process
 *   "trustlesswork" — runs local verifier then submits the ProofJournal to Trustless Work
 *                     for on-chain attestation (reuses TRUSTLESS_WORK_API_URL + API_KEY)
 */

import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { recordTraceEvent } from "@/services/trace";
import { ExecutionReceipt } from "@/types/trace";
import { ProofInput, ProofJournal, ProofRecord, ProofStatus } from "@/types/proof";
import { buildProofInput, verify } from "../../proofs/verifier";

// ── Proof record mapping ──────────────────────────────────────────────────────

function toProofRecord(row: {
  id: string;
  taskId: string;
  receiptId: string;
  receiptHash: string;
  schemaVersion: string;
  status: string;
  programId: string | null;
  journal: unknown;
  artifactUri: string | null;
  errorMsg: string | null;
  createdAt: Date;
  provenAt: Date | null;
  verifiedAt: Date | null;
}): ProofRecord {
  return {
    id: row.id,
    taskId: row.taskId,
    receiptId: row.receiptId,
    receiptHash: row.receiptHash,
    schemaVersion: row.schemaVersion,
    status: row.status as ProofStatus,
    programId: row.programId ?? undefined,
    journal: (row.journal as ProofJournal) ?? undefined,
    artifactUri: row.artifactUri ?? undefined,
    errorMsg: row.errorMsg ?? undefined,
    createdAt: row.createdAt.toISOString(),
    provenAt: row.provenAt?.toISOString(),
    verifiedAt: row.verifiedAt?.toISOString(),
  };
}

// ── Build proof input from receipt ────────────────────────────────────────────

function receiptToProofInput(receipt: ExecutionReceipt): ProofInput {
  const paymentIntents = receipt.paymentSummary.map((p) => ({
    specialist: p.specialist,
    amount: p.amount,
    agentVersionHash: p.versionHash,
    txHash: p.txHash,
  }));

  return buildProofInput({
    taskId: receipt.taskId,
    taskInputHash: receipt.taskInputHash,
    receiptHash: receipt.receiptHash,
    traceRoot: receipt.traceRoot,
    agentVersionHashes: receipt.agentVersionHashes,
    spendCap: receipt.spendCap ?? 50,
    totalCost: receipt.totalCost ?? 0,
    outputHash: receipt.outputHash,
    paymentIntents,
  });
}

// ── Local verifier ────────────────────────────────────────────────────────────

async function runLocalVerifier(
  proofId: string,
  taskId: string,
  input: ProofInput
): Promise<ProofJournal> {
  const result = verify(input);

  if (!result.ok) {
    throw new Error(
      `Proof verification failed. Failed constraints: ${result.failedConstraints.join(", ")}`
    );
  }

  return result.journal;
}

// ── Trustless Work attestation prover ─────────────────────────────────────────
//
// Runs the local deterministic verifier first to produce the journal, then
// submits the journal to Trustless Work for on-chain attestation. The TX hash
// returned by Trustless Work is stored as artifactUri on the Proof row.

async function runTrustlessWorkProver(
  proofId: string,
  taskId: string,
  input: ProofInput
): Promise<ProofJournal> {
  if (!env.TRUSTLESS_WORK_API_URL) {
    throw new Error(
      "[Proof] PROOF_MODE=trustlesswork but TRUSTLESS_WORK_API_URL is not set."
    );
  }
  if (!env.TRUSTLESS_WORK_API_KEY) {
    throw new Error(
      "[Proof] PROOF_MODE=trustlesswork but TRUSTLESS_WORK_API_KEY is not set."
    );
  }

  // Step 1: run local verifier to produce the journal
  const localResult = verify(input);
  if (!localResult.ok) {
    throw new Error(
      `[Proof] Local verification failed before Trustless Work attestation. ` +
        `Failed constraints: ${localResult.failedConstraints.join(", ")}`
    );
  }

  const journal: ProofJournal = {
    ...localResult.journal,
    verifierType: "trustlesswork",
  };

  // Step 2: submit journal to Trustless Work for on-chain attestation
  // TODO: align endpoint path and payload shape with actual Trustless Work API spec.
  // Expected response: { attestationId: string; txHash?: string; status: string }
  const baseUrl = env.TRUSTLESS_WORK_API_URL.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/v1/proofs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TRUSTLESS_WORK_API_KEY}`,
    },
    body: JSON.stringify({
      proofId,
      taskId,
      receiptHash: input.receiptHash,
      traceRoot: input.traceRoot,
      journal,
    }),
  });

  if (!res.ok) {
    let errMsg = `Trustless Work proof attestation failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      errMsg = body.message ?? body.error ?? errMsg;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  const attestation = await res.json() as { attestationId?: string; txHash?: string; status?: string };

  // Store the tx hash as the artifact URI so it can be linked from the UI
  if (attestation.txHash) {
    await prisma.proof.update({
      where: { id: proofId },
      data: { artifactUri: attestation.txHash },
    }).catch(() => { /* non-fatal */ });
  }

  return journal;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a proof for a completed execution receipt.
 *
 * Creates a Proof row in the DB, runs the verifier (local or Boundless),
 * and records proof lifecycle trace events. Safe to call fire-and-forget.
 */
export async function generateProof(receipt: ExecutionReceipt): Promise<ProofRecord> {
  if (env.PROOF_MODE === "disabled") {
    throw new Error("[Proof] PROOF_MODE=disabled — proof generation skipped.");
  }

  // Idempotency: don't re-generate if a proof already exists for this receipt
  const existing = await prisma.proof.findUnique({ where: { receiptId: receipt.id } });
  if (existing) {
    return toProofRecord(existing);
  }

  const proof = await prisma.proof.create({
    data: {
      taskId: receipt.taskId,
      receiptId: receipt.id,
      receiptHash: receipt.receiptHash,
      schemaVersion: "1.0",
      status: "running",
      programId: null,
    },
  });

  // ── TRACE: proof_generation_started ─────────────────────────────────────
  await recordTraceEvent(
    receipt.taskId,
    "proof_generation_started",
    "system",
    `Proof generation started (mode: ${env.PROOF_MODE}) for receipt ${receipt.receiptHash.slice(0, 16)}...`,
    { metadata: { proofId: proof.id, receiptHash: receipt.receiptHash, mode: env.PROOF_MODE } }
  ).catch(() => { /* non-fatal */ });

  try {
    const input = receiptToProofInput(receipt);
    const journal =
      env.PROOF_MODE === "trustlesswork"
        ? await runTrustlessWorkProver(proof.id, receipt.taskId, input)
        : await runLocalVerifier(proof.id, receipt.taskId, input);

    const updated = await prisma.proof.update({
      where: { id: proof.id },
      data: {
        status: "proven",
        journal: journal as unknown as object,
        provenAt: new Date(),
      },
    });

    // ── TRACE: proof_generated ─────────────────────────────────────────────
    await recordTraceEvent(
      receipt.taskId,
      "proof_generated",
      "system",
      `Proof generated: receipt integrity, spend cap, payment, and agent membership checks complete`,
      {
        metadata: {
          proofId: proof.id,
          receiptHash: receipt.receiptHash,
          spendCapOk: (journal as unknown as Record<string, unknown>).spendCapOk,
          paymentCorrect: (journal as unknown as Record<string, unknown>).paymentCorrect,
          agentMembershipOk: (journal as unknown as Record<string, unknown>).agentMembershipOk,
          receiptIntegrityOk: (journal as unknown as Record<string, unknown>).receiptIntegrityOk,
        },
      }
    ).catch(() => { /* non-fatal */ });

    return toProofRecord(updated);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown proof error";

    await prisma.proof.update({
      where: { id: proof.id },
      data: { status: "failed", errorMsg },
    }).catch(() => { /* non-fatal */ });

    // ── TRACE: proof_generation_failed ───────────────────────────────────
    await recordTraceEvent(
      receipt.taskId,
      "proof_generation_failed",
      "system",
      `Proof generation failed: ${errorMsg}`,
      { metadata: { proofId: proof.id, error: errorMsg } }
    ).catch(() => { /* non-fatal */ });

    throw err;
  }
}

/**
 * Verify a proven proof — validate its journal against the committed receiptHash
 * and transition the receipt to "verified" status.
 */
export async function verifyProof(proofId: string): Promise<ProofRecord> {
  const proof = await prisma.proof.findUnique({ where: { id: proofId } });
  if (!proof) throw new Error(`Proof ${proofId} not found`);

  if (proof.status === "verified") {
    return toProofRecord(proof);
  }

  if (proof.status !== "proven") {
    throw new Error(
      `Proof ${proofId} cannot be verified — current status is "${proof.status}". ` +
        `Must be "proven" first.`
    );
  }

  const journal = proof.journal as unknown as ProofJournal | null;
  if (!journal) {
    throw new Error(`Proof ${proofId} has no journal — cannot verify.`);
  }

  if (journal.receiptHash !== proof.receiptHash) {
    await recordTraceEvent(
      proof.taskId,
      "proof_verification_failed",
      "system",
      `Proof verification failed: journal receiptHash mismatch`,
      { metadata: { proofId, expected: proof.receiptHash, actual: journal.receiptHash } }
    ).catch(() => { /* non-fatal */ });

    throw new Error(
      `Proof ${proofId} verification failed: journal receiptHash does not match stored receiptHash.`
    );
  }

  const failedFlags = (
    ["spendCapOk", "paymentCorrect", "agentMembershipOk", "receiptIntegrityOk"] as const
  ).filter((k) => !journal[k]);

  if (failedFlags.length > 0) {
    await recordTraceEvent(
      proof.taskId,
      "proof_verification_failed",
      "system",
      `Proof verification failed: integrity flags not satisfied: ${failedFlags.join(", ")}`,
      { metadata: { proofId, failedFlags } }
    ).catch(() => { /* non-fatal */ });

    throw new Error(
      `Proof ${proofId} verification failed: ${failedFlags.join(", ")} not satisfied.`
    );
  }

  const now = new Date();
  const updated = await prisma.proof.update({
    where: { id: proofId },
    data: { status: "verified", verifiedAt: now },
  });

  await prisma.executionReceipt.update({
    where: { taskId: proof.taskId },
    data: { status: "verified" },
  }).catch((e) => console.warn("[Proof] Receipt status update failed:", e));

  await recordTraceEvent(
    proof.taskId,
    "proof_verified",
    "system",
    `Proof verified — receipt ${proof.receiptHash.slice(0, 16)}... is now cryptographically attested`,
    {
      metadata: {
        proofId,
        receiptHash: proof.receiptHash,
        verifiedAt: now.toISOString(),
        verifierType: journal.verifierType,
      },
    }
  ).catch(() => { /* non-fatal */ });

  return toProofRecord(updated);
}

export async function getProof(proofId: string): Promise<ProofRecord | null> {
  const row = await prisma.proof.findUnique({ where: { id: proofId } });
  return row ? toProofRecord(row) : null;
}

export async function getProofByTask(taskId: string): Promise<ProofRecord | null> {
  const row = await prisma.proof.findFirst({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
  return row ? toProofRecord(row) : null;
}

export async function getProofByReceipt(receiptId: string): Promise<ProofRecord | null> {
  const row = await prisma.proof.findUnique({ where: { receiptId } });
  return row ? toProofRecord(row) : null;
}
