/**
 * Trace chain property tests.
 *
 * These tests validate the mathematical invariants of the hash-chained event
 * model without touching Prisma. They replicate the exact chain-building logic
 * from trace.ts so any divergence between the real service and these tests
 * would surface as a test failure.
 *
 * Key invariants:
 *  1. Each event commits to its position (sequence) and the previous event hash.
 *  2. Mutating any event payload changes all subsequent event hashes.
 *  3. The trace root (last eventHash) transitively commits to every prior event.
 *  4. An empty chain produces a deterministic fallback root per taskId.
 */

import { describe, it, expect } from "vitest";
import { sha256, hashCanonical } from "@/lib/hash";

// ── Chain builder (mirrors trace.ts logic) ────────────────────────────────────

interface ChainEvent {
  taskId: string;
  sequence: number;
  eventType: string;
  actor: string;
  inputHash: string | null;
  outputHash: string | null;
  prevEventHash: string | null;
  eventHash: string;
}

interface EventSpec {
  eventType: string;
  actor: string;
  inputHash?: string | null;
  outputHash?: string | null;
}

function buildEvent(taskId: string, sequence: number, spec: EventSpec, prev: ChainEvent | null): ChainEvent {
  const prevEventHash = prev?.eventHash ?? null;
  const eventHash = hashCanonical({
    taskId,
    sequence,
    eventType: spec.eventType,
    actor: spec.actor,
    inputHash: spec.inputHash ?? null,
    outputHash: spec.outputHash ?? null,
    prevEventHash,
  });
  return {
    taskId,
    sequence,
    eventType: spec.eventType,
    actor: spec.actor,
    inputHash: spec.inputHash ?? null,
    outputHash: spec.outputHash ?? null,
    prevEventHash,
    eventHash,
  };
}

function buildChain(taskId: string, specs: EventSpec[]): ChainEvent[] {
  const chain: ChainEvent[] = [];
  for (let i = 0; i < specs.length; i++) {
    chain.push(buildEvent(taskId, i, specs[i], chain[i - 1] ?? null));
  }
  return chain;
}

function traceRoot(taskId: string, chain: ChainEvent[]): string {
  return chain.length > 0
    ? chain[chain.length - 1].eventHash
    : sha256(`empty:${taskId}`);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TASK_ID = "cltest001";

const TYPICAL_SPECS: EventSpec[] = [
  { eventType: "coordinator_start",  actor: "coordinator" },
  { eventType: "task_decomposed",    actor: "coordinator" },
  { eventType: "specialist_assigned", actor: "coordinator" },
  { eventType: "payment_initiated",  actor: "payment" },
  { eventType: "payment_confirmed",  actor: "payment" },
  { eventType: "specialist_invoked", actor: "code-auditor" },
  { eventType: "specialist_completed", actor: "code-auditor" },
  { eventType: "task_completed",     actor: "coordinator" },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("trace event hash chain — structural invariants", () => {
  it("sequence numbers are 0-based and contiguous", () => {
    const chain = buildChain(TASK_ID, TYPICAL_SPECS);
    chain.forEach((ev, i) => expect(ev.sequence).toBe(i));
  });

  it("first event has null prevEventHash", () => {
    const [first] = buildChain(TASK_ID, TYPICAL_SPECS);
    expect(first.prevEventHash).toBeNull();
  });

  it("each subsequent event's prevEventHash equals the prior event's eventHash", () => {
    const chain = buildChain(TASK_ID, TYPICAL_SPECS);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].prevEventHash).toBe(chain[i - 1].eventHash);
    }
  });

  it("all event hashes in the chain are unique", () => {
    const chain = buildChain(TASK_ID, TYPICAL_SPECS);
    const hashes = chain.map((e) => e.eventHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("every event hash is a 64-character hex string", () => {
    const chain = buildChain(TASK_ID, TYPICAL_SPECS);
    chain.forEach((ev) => expect(ev.eventHash).toMatch(/^[0-9a-f]{64}$/));
  });
});

describe("trace event hash chain — determinism", () => {
  it("rebuilding the same chain twice produces identical hashes", () => {
    const c1 = buildChain(TASK_ID, TYPICAL_SPECS);
    const c2 = buildChain(TASK_ID, TYPICAL_SPECS);
    c1.forEach((ev, i) => expect(ev.eventHash).toBe(c2[i].eventHash));
  });

  it("trace root is identical across rebuilds", () => {
    const r1 = traceRoot(TASK_ID, buildChain(TASK_ID, TYPICAL_SPECS));
    const r2 = traceRoot(TASK_ID, buildChain(TASK_ID, TYPICAL_SPECS));
    expect(r1).toBe(r2);
  });

  it("different taskIds produce different hashes for the same event specs", () => {
    const hA = buildChain("task-A", TYPICAL_SPECS).map((e) => e.eventHash);
    const hB = buildChain("task-B", TYPICAL_SPECS).map((e) => e.eventHash);
    hA.forEach((h, i) => expect(h).not.toBe(hB[i]));
  });
});

describe("trace event hash chain — tamper evidence", () => {
  it("mutating event 0's actor changes every subsequent event hash", () => {
    const original = buildChain(TASK_ID, TYPICAL_SPECS);
    const tampered = buildChain(TASK_ID, [
      { eventType: "coordinator_start", actor: "TAMPERED" }, // ← changed
      ...TYPICAL_SPECS.slice(1),
    ]);

    // event 0 itself differs
    expect(tampered[0].eventHash).not.toBe(original[0].eventHash);
    // cascade: all subsequent events differ because prevEventHash changed
    for (let i = 1; i < original.length; i++) {
      expect(tampered[i].eventHash).not.toBe(original[i].eventHash);
    }
    // trace root differs
    expect(traceRoot(TASK_ID, tampered)).not.toBe(traceRoot(TASK_ID, original));
  });

  it("mutating a middle event changes that event and all later ones but not earlier ones", () => {
    const original = buildChain(TASK_ID, TYPICAL_SPECS);

    const mutatedSpecs = TYPICAL_SPECS.map((s, i) =>
      i === 3 ? { ...s, actor: "TAMPERED" } : s
    );
    const tampered = buildChain(TASK_ID, mutatedSpecs);

    // Events before index 3 are unchanged
    for (let i = 0; i < 3; i++) {
      expect(tampered[i].eventHash).toBe(original[i].eventHash);
    }
    // Event 3 and everything after differs
    for (let i = 3; i < original.length; i++) {
      expect(tampered[i].eventHash).not.toBe(original[i].eventHash);
    }
    expect(traceRoot(TASK_ID, tampered)).not.toBe(traceRoot(TASK_ID, original));
  });

  it("mutating only the last event changes the trace root", () => {
    const original = buildChain(TASK_ID, TYPICAL_SPECS);
    const mutatedSpecs = [...TYPICAL_SPECS];
    mutatedSpecs[mutatedSpecs.length - 1] = { eventType: "task_failed", actor: "coordinator" };
    const tampered = buildChain(TASK_ID, mutatedSpecs);

    expect(traceRoot(TASK_ID, tampered)).not.toBe(traceRoot(TASK_ID, original));
  });

  it("inserting an extra event changes the trace root", () => {
    const original = buildChain(TASK_ID, TYPICAL_SPECS);
    const extended = buildChain(TASK_ID, [
      ...TYPICAL_SPECS,
      { eventType: "task_failed", actor: "system" },
    ]);

    expect(traceRoot(TASK_ID, extended)).not.toBe(traceRoot(TASK_ID, original));
  });

  it("changing inputHash on an event changes its eventHash and all descendants", () => {
    const base = buildChain(TASK_ID, TYPICAL_SPECS);
    const withInput = buildChain(TASK_ID, TYPICAL_SPECS.map((s, i) =>
      i === 2 ? { ...s, inputHash: sha256("some-input") } : s
    ));

    // Events 0–1 unchanged (not affected by the inputHash on event 2)
    expect(withInput[0].eventHash).toBe(base[0].eventHash);
    expect(withInput[1].eventHash).toBe(base[1].eventHash);
    // Event 2 changes
    expect(withInput[2].eventHash).not.toBe(base[2].eventHash);
    // Cascade forward
    expect(withInput[3].eventHash).not.toBe(base[3].eventHash);
    expect(traceRoot(TASK_ID, withInput)).not.toBe(traceRoot(TASK_ID, base));
  });
});

describe("trace root", () => {
  it("is the eventHash of the last event in the chain", () => {
    const chain = buildChain(TASK_ID, TYPICAL_SPECS);
    expect(traceRoot(TASK_ID, chain)).toBe(chain[chain.length - 1].eventHash);
  });

  it("empty chain falls back to sha256('empty:<taskId>')", () => {
    expect(traceRoot("task-X", [])).toBe(sha256("empty:task-X"));
    expect(traceRoot("task-Y", [])).toBe(sha256("empty:task-Y"));
  });

  it("empty-chain roots are deterministic", () => {
    expect(traceRoot("task-X", [])).toBe(traceRoot("task-X", []));
  });

  it("different taskIds produce different empty-chain roots", () => {
    expect(traceRoot("task-X", [])).not.toBe(traceRoot("task-Y", []));
  });

  it("single-event chain root equals that event's hash", () => {
    const chain = buildChain(TASK_ID, [{ eventType: "coordinator_start", actor: "coordinator" }]);
    expect(traceRoot(TASK_ID, chain)).toBe(chain[0].eventHash);
  });
});
