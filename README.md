# Verix

**Verifiable Autonomous Work Infrastructure** on Stellar/Soroban. Users submit complex work, a coordinator decomposes it into subtasks and routes each to specialist AI agents, executes them, and produces a hash-chained execution trace, a cryptographic receipt, and a deterministic proof of workflow integrity. Settlement is handled through Trustless Work escrow on Stellar.

## What Verix Does

1. **Decomposes tasks** — an AI coordinator breaks a high-level prompt into subtasks and selects the best specialist agent for each (or the user pins a specific agent from the marketplace).
2. **Executes in parallel** — specialist agents (Claude, GPT-4o, Groq) run concurrently up to a configurable concurrency limit.
3. **Records a hash-chained trace** — every significant action appends a cryptographically linked `ExecutionTraceEvent`, producing a tamper-evident execution history.
4. **Generates a receipt** — a canonical JSON structure committing to the task input, agent version hashes, registry snapshot, trace root, spend cap, total cost, and output hash. The receipt hash is a single cryptographic commitment to the entire workflow.
5. **Verifies integrity** — a deterministic in-process verifier checks 5 constraints against the receipt: hash integrity, spend-cap compliance, payment correctness, agent membership, and trace commitment.
6. **Settles on-chain** — Trustless Work escrow milestones on Stellar release automatically on proof verification.

## What Is and Is Not Proven

**Proven (workflow integrity):**
- Task input commitment
- Selected agent version hashes (immutable snapshots at routing time)
- Registry snapshot hash
- Trace root consistency (hash chain from first to last event)
- Spend-cap compliance (total cost ≤ cap)
- Payout split correctness (sum of payments = total cost)
- Receipt hash integrity (recomputed hash matches committed digest)

**Not proven:** LLM inference outputs, off-chain computation quality, or agent reasoning.

## Architecture

- **App**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Persistence**: Prisma 7 + PostgreSQL (`@prisma/adapter-pg`)
- **Agents**: versioned specialist registry with AI model and proof policy per agent
- **Execution**: 5-stage coordinator pipeline (initialize → route → spend-cap → execute → synthesize)
- **Trace**: structured hash-chained execution events (SHA-256 per event)
- **Proofs**: local deterministic TypeScript workflow verifier
- **Settlement**: Stellar USDC transfers + Trustless Work escrow milestones on Soroban
- **Wallet**: Stellar Wallets Kit (Freighter, LOBSTR, xBull, and more)
- **Contracts**: Soroban `agent_registry` and `receipt_anchor` contracts in `contracts/soroban/`

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — platform overview and demo entry points |
| `/dashboard` | Main interface — connect wallet, submit tasks, view live execution |
| `/marketplace` | Browse and filter all registered specialist agents |
| `/marketplace/[id]` | Agent profile — stats, capabilities, version history, "Hire Agent" CTA |
| `/settings` | Agent registry — publish, edit, and delete your own specialist agents |
| `/receipts/[id]` | Receipt explorer — cryptographic commitments and proof integrity checks |
| `/trace/[id]` | Execution trace — full hash-chained event log for a completed task |

## Operational Modes

Set via `APP_MODE` in `.env.local` (auto-detected if not set):

| Mode | Database | AI Keys | Blockchain | Use case |
|------|----------|---------|------------|----------|
| `demo` | not required | optional | mocked | Quick local demo without setup |
| `local` | required | optional (falls back to mock) | optional | Development |
| `production` | required | required | required | Live deployment |

`ESCROW_MODE=disabled|demo|live` and `PROOF_MODE=disabled|local` are independent of `APP_MODE`.

## Environment Setup

Copy `.env.local.example` to `.env.local`. Key variables:

```env
APP_MODE=local                    # demo | local | production

DATABASE_URL=postgresql://user:password@localhost:5432/agent_network
# Note: if your password contains @, URL-encode it as %40

ENCRYPTION_KEY=<64-char hex>      # generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GROQ_API_KEY=gsk_...

COORDINATOR_STELLAR_PUBLIC_KEY=G...
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
STELLAR_EXPLORER_URL=https://stellar.expert/explorer/testnet
STELLAR_USDC_CODE=USDC
STELLAR_USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5

ESCROW_MODE=demo                  # disabled | demo | live
TRUSTLESS_WORK_API_URL=https://dev.api.trustlesswork.com
TRUSTLESS_WORK_API_KEY=...
TRUSTLESS_WORK_SIGNER_ADDRESS=G...
TRUSTLESS_WORK_ESCROW_TYPE=multi-release

PROOF_MODE=local                  # disabled | local
COORDINATOR_CONCURRENCY_LIMIT=2
```

## Development

```bash
npm install
npx prisma generate
npx prisma db push          # create tables (dev only)
npm run dev                 # Next.js dev server with Turbopack
```

If API routes hang or return 404 after a code change, delete `.next/` and restart:

```bash
rm -rf .next && npm run dev
```

Run checks:

```bash
npm test                    # vitest test suite
npx tsc --noEmit            # type-check
npm run lint                # eslint
npm run build               # prisma generate + next build
```

Run a single test file:

```bash
npx vitest run src/services/__tests__/trace-chain.test.ts
```

## Golden-Path Demo

Seed the three built-in specialist agents and demo data:

```bash
npm run demo:seed
```

The canonical demo prompt:

> Audit a Soroban escrow milestone release flow for security risks, compare the market positioning against existing AI work platforms, and produce a concise investor-ready launch memo with proof-backed settlement requirements.

Expected flow:

1. Coordinator snapshots the agent registry and routes to CodeAuditor ($1.00), MarketAnalyst ($0.75), and CreativeWriter ($0.50) — total: $2.25 USDC.
2. Spend-cap check passes (well under the $5.00 demo cap).
3. Serial payment intents recorded on Stellar (one per specialist).
4. Specialist AI calls execute concurrently; trace events stream live to the dashboard.
5. Receipt commits to input hash, agent version hashes, trace root, spend cap, outputs, and payout summary.
6. Local verifier checks all 5 integrity constraints and marks the proof as verified.
7. Trustless Work escrow milestones release automatically on proof verification (in `ESCROW_MODE=live`).

In the dashboard, click **Load demo flow** to pre-fill the canonical prompt and spend cap.

Reset demo task data only:

```bash
npm run demo:reset -- --force
```

Reset demo task plus demo-owned agents:

```bash
npm run demo:reset -- --force --include-agents
```

## Soroban Contracts

Contract sources are in `contracts/soroban/`.

```bash
cd contracts/soroban
cargo build --target wasm32-unknown-unknown --release
```

See `contracts/soroban/README.md` for deploy and invocation commands.

## Trustless Work

Verix integrates with Trustless Work for on-chain escrow creation, milestone management, and USDC release on Stellar/Soroban. Verix anchors agent registry and receipt trust metadata; Trustless Work handles the actual settlement contracts.

See [TESTING.md](./TESTING.md) for a full end-to-end QA walkthrough.
