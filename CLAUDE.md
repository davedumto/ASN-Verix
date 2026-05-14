# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agent Specialization Network (ASN)** is a multi-agent AI marketplace where autonomous agents discover, collaborate, and pay each other to complete complex tasks. Built as a Next.js monorepo with real USDC payments on SKALE Calypso Hub Testnet via the x402 protocol.

Key capabilities: task decomposition via Claude/OpenAI, specialist agent discovery, gasless on-chain USDC payments, spend cap enforcement, and durable task state via Prisma.

## Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server at http://localhost:3000
npm run build            # Production build
npm run lint             # ESLint

# Prisma
npx prisma generate      # Regenerate client after schema changes
npx prisma db push       # Apply schema to dev DB
npx prisma studio        # GUI at http://localhost:5555
```

## Architecture

### Layer 1: API Routes (`src/app/api/`)
- `tasks/route.ts` — Create (POST), list (GET), delete (DELETE) tasks
- `tasks/[id]/route.ts` — Get single task with events, subtasks, and payments
- `wallet/balance/route.ts` — On-chain USDC balance for coordinator wallet
- `specialists/route.ts` — List registered agents and capabilities
- `payments/route.ts` / `payments/verify/route.ts` — Create and confirm USDC transfers
- `reputation/route.ts` — Query/update specialist trust scores

### Layer 2: Service Layer (`src/services/`)

**`coordinator.ts`** — Core orchestration engine:
- Decomposes tasks into subtasks using AI (Claude for code/security, OpenAI for research/writing)
- Routes subtasks to specialists by capability matching
- Enforces spend caps before execution begins; re-checks before each payment
- Synthesizes final result with full payment audit trail

**`execution.ts`** — Task lifecycle state machine:
- States: `pending → decomposing → discovering → processing → completed/failed`
- In-memory task store with Prisma write-through persistence
- Appends typed events to task feed (coordinator, specialist, payment, system)
- Estimates cost from task description keywords before AI runs

**`payment.ts`** — x402 USDC settlement on SKALE:
- Transfers ERC-20 USDC using ethers.js, persists record with tx hash and block number
- RPC failover: Thirdweb (authenticated) → SKALE native → Thirdweb public
- Derives specialist wallet addresses from their private keys in env

**`discovery.ts`** — Specialist registry:
- Lazily seeds three default specialists to Prisma on first use: CodeAuditor (Claude), MarketAnalyst (OpenAI), CreativeWriter (OpenAI)
- Maps specialist names to wallet addresses via private key derivation

**`reputation.ts`** — Trust scoring per specialist, persisted to `Reputation` model; updated on task completion.

### Layer 3: Data & Storage (`src/lib/`, `prisma/`)

**`task-store.ts`** — Write-through in-memory cache: hot `Map` for fast reads, Prisma as durable source of truth. Loads from DB on cache miss.

**`blockchain-config.ts`** — SKALE provider and USDC contract config:
- USDC contract: `0x4E2B3DD08B71F45Bb4bcfAE425D697c650e4212B` (6 decimals), Chain ID: `974399131`
- Three-endpoint RPC failover used by payment and balance calls

**`wallet.ts`** — Reads `COORDINATOR_PRIVATE_KEY`, derives address, fetches USDC balance with RPC failover.

**`prisma/schema.prisma`** — Models: `Task`, `Subtask`, `Specialist`, `Payment`, `Reputation`

### Layer 4: Frontend (`src/app/`, `src/components/`)
- `app/page.tsx` — Animated landing page
- `app/dashboard/page.tsx` — Task submission and real-time monitoring
- `app/settings/page.tsx` — Configuration UI

## Data Flow

```
User submits task (description + optional spend cap)
  ↓
POST /api/tasks → createExecution() → executeCoordinator() [async background]
  ↓
Coordinator decomposes task via Claude/OpenAI
  ↓
Spend cap check (estimated total > cap → block with error event)
  ↓
For each subtask:
  1. Execute AI inference
  2. Transfer USDC on SKALE; persist payment with tx hash
  3. Check running total against spend cap
  ↓
Synthesize result with paymentBreakdown
  ↓
GET /api/tasks/[id] → task + events + subtasks + payments
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
COORDINATOR_PRIVATE_KEY=0x...
CODE_AUDITOR_PRIVATE_KEY=0x...
MARKET_ANALYST_PRIVATE_KEY=0x...
CREATIVE_WRITER_PRIVATE_KEY=0x...
USDC_CONTRACT_ADDRESS=0x4E2B3DD08B71F45Bb4bcfAE425D697c650e4212B
SKALE_RPC_URL=https://974399131.rpc.thirdweb.com
THIRDWEB_SECRET_KEY=...     # Optional: higher RPC rate limits
ENCRYPTION_KEY=...           # 32-byte hex; encrypts sensitive DB fields
```

## Key Patterns

**Spend Cap Enforcement:** Estimated cost is computed before any AI runs. If over cap, execution is blocked immediately. Running totals are also checked before each individual payment.

**AI Model Routing:** Hardcoded in `coordinator.ts` — CodeAuditor always uses Claude, MarketAnalyst and CreativeWriter always use OpenAI GPT-4o.

**RPC Failover:** Implemented in `blockchain-config.ts`; payment and balance calls cycle through three endpoints automatically.

**Task Event Log:** All state transitions, AI outputs, payments, and errors are appended as typed `TaskEvent` objects and surfaced in the dashboard UI.

## Blockchain / Testing Notes

- Network: SKALE Calypso Hub Testnet (gasless for users, instant finality)
- Testnet sFUEL faucet: https://sfuelstation.com
- Block explorer: https://staging-utter-unripe-menkar.explorer.staging-v3.skalenodes.com
- Smart contracts in `contracts/`; deployment instructions in `contracts/DEPLOY.md`

## Current Limitations

- Long-running coordinator execution runs as a route-local background promise (no durable job queue yet)
- Specialist registry and reputation have in-memory fallback paths alongside Prisma
- No auth/session boundaries on mutations (safe for demo, not production)
- Foundation roadmap toward durable execution, proof receipts, and trustless escrow is tracked in `docs/foundation-infrastructure.md`
