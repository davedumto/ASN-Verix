# Foundation & Infrastructure Plan

Issue: #1 - Foundation & Infrastructure

This document defines the first implementation layer for Verix: the stable
foundation required before marketplace, trace, escrow, proof, and visualization
work can safely build on top of the current Next.js application.

The goal is not to introduce enterprise-scale infrastructure. The goal is to
make the existing hackathon app durable, explicit, and proof-ready.

## Current Architecture Constraints

The current repository already has useful primitives:

- A Next.js App Router frontend/backend boundary.
- A coordinator service that routes and executes specialist work.
- A Prisma schema with `Task`, `Subtask`, `Specialist`, `Payment`, and
  `Reputation` models.
- A task store that writes `Task` records through Prisma.
- A payment service that can submit USDC transfers through `ethers`.
- A dashboard that can render task history, events, results, and payments.

The current foundation also has several blockers:

- Specialist and reputation state are still in-memory.
- Subtasks and payments are mostly embedded into task JSON instead of written
  through normalized Prisma models.
- Long-running execution starts as a route-local background promise.
- Environment failures are inconsistent; some fail at build time, others fall
  back silently.
- Mutating APIs do not have session or owner boundaries.
- There is no durable job boundary for execution, proof generation, or escrow
  synchronization.

## Foundation Principles

1. Durable state beats in-memory state for user-facing workflows.
2. State transitions must be explicit enough for traces and proof receipts.
3. Demo reliability matters more than distributed-system elegance.
4. External integrations must have clear real/demo modes.
5. The platform proves workflow integrity, not arbitrary LLM inference.

## Target Foundation Shape

```text
Browser
  |
  v
Next.js API routes
  |
  v
Execution service
  |
  +--> Prisma persistence
  +--> Trace recorder
  +--> Job service
  +--> Coordinator pipeline
  +--> Escrow client
  +--> Proof worker
```

The API layer should validate requests and delegate orchestration work. It
should not own long-running workflow state directly.

## Execution State Model

The foundation should support these high-level execution states:

```text
created
  -> routed
  -> escrow_pending
  -> escrow_funded
  -> executing
  -> receipt_generated
  -> proving
  -> verified
  -> settling
  -> completed

failure path:
  any state -> failed
```

The existing `Task.status` values can remain during transition, but new code
should prefer an execution-centric lifecycle that maps cleanly to trace,
escrow, and proof events.

## Persistence Boundaries

The first foundation slice should move these records to normalized persistence:

| Domain | Durable model | Notes |
| --- | --- | --- |
| User task | `Task` / future `Execution` | Keep task description, status, spend cap, result summary. |
| Agent work | `Subtask` / future `ExecutionStep` | Store assigned specialist, status, cost, result hash, completion time. |
| Agent supply | `Specialist` / future `AgentVersion` | Persist published agents and remove in-memory registry dependency. |
| Payment | `Payment` | Store attempt, amount, recipient, status, tx/reference. |
| Reputation | `Reputation` / future `ReputationEvent` | Replace mutable in-memory scores with durable records. |
| Jobs | `Job` | Track execution, proof, and escrow background work. |

Task-level JSON can stay as a denormalized read model for the dashboard, but it
must not be the only source of truth for subtasks, payments, specialists, or
reputation.

## Sequenced Foundation Issues

The Foundation milestone should be implemented in this order:

1. #2 - Normalize Prisma persistence for tasks, subtasks, payments,
   specialists, and reputation.
2. #3 - Refactor execution lifecycle into a durable Execution service.
3. #4 - Add environment validation and demo-safe configuration profiles.
4. #5 - Add lightweight auth/session ownership for demo-safe mutations.
5. #6 - Introduce job boundary for execution, proof, and escrow workers.

This order avoids circular dependencies:

- #3 depends on normalized persistence from #2.
- #5 depends on persistence and environment configuration from #2 and #4.
- #6 depends on durable execution and persistence from #2 and #3.
- Trace, escrow, proof, and visualization work should depend on #3 or #6
  instead of directly depending on route-local task behavior.

## API Boundary Guidelines

API routes should:

- Validate input.
- Resolve session/owner context once available.
- Call service-layer methods.
- Return stable response DTOs.
- Avoid direct multi-step orchestration logic.

API routes should not:

- Start complex workflows without durable state.
- Mutate in-memory registries as the only source of truth.
- Return encrypted API keys or private wallet data.
- Mark payments, proofs, or escrow releases as complete without provider
  confirmation.

## Environment Configuration

Foundation work should centralize environment reads into one module, such as
`src/lib/env.ts`.

Required configuration categories:

- Database: `DATABASE_URL`
- AI providers: `OPENAI_API_KEY`, `CLAUDE_API_KEY`
- Encryption: `ENCRYPTION_KEY`
- Chain/RPC: `SKALE_RPC_URL`, `USDC_CONTRACT_ADDRESS`
- Wallets for current demo mode: `COORDINATOR_PRIVATE_KEY`
- Future escrow/proof integrations: Trustless Work and Boundless credentials

Demo mode may allow mocked AI, escrow, or proof behavior, but the UI and logs
must identify simulated states clearly.

Production-like mode must not use default encryption keys or silent secret
fallbacks.

## Job Boundary

The initial job system can be a small Postgres-backed abstraction. It does not
need Redis, BullMQ, Temporal, or a distributed workflow engine for the
hackathon.

Minimum job fields:

- `id`
- `type`
- `status`
- `executionId` or `taskId`
- `payload`
- `attempts`
- `lastError`
- `createdAt`
- `startedAt`
- `completedAt`

Initial job types:

- `execution.run`
- `proof.generate`
- `escrow.sync`
- `escrow.release`

## Definition of Done for the Foundation Epic

Issue #1 is complete when:

- Foundation child issues are created, sequenced, and linked.
- The repository documents the intended foundation architecture.
- Persistence, config, auth/session, execution lifecycle, and job-boundary
  blockers are represented as concrete implementation tickets.
- Later epics can depend on stable execution IDs, durable state, and explicit
  lifecycle transitions.

## Non-Goals

- Production-grade distributed infrastructure.
- Multi-region deployment.
- Full enterprise authentication.
- DAO governance, tokenomics, or decentralized compute marketplace mechanics.
- Proofs of arbitrary LLM inference.
