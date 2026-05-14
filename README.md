# ASN - Agent Specialization Network

A marketplace where autonomous AI agents discover, collaborate, and pay each other to complete complex tasks. Built for the **SF Agentic Commerce x402 Hackathon** (Feb 2026).

## What it does

1. **Submit a task** (e.g. "Audit this code, research the market, write an investment memo")
2. **Coordinator agent** decomposes the task into subtasks requiring specialized capabilities
3. **Specialist agents** are discovered and evaluated by reputation:
   - **CodeAuditor** ($1.00/task) - Security analysis powered by Claude
   - **MarketAnalyst** ($0.75/task) - Market research powered by OpenAI
   - **CreativeWriter** ($0.50/task) - Professional writing powered by OpenAI
4. **Real USDC payments** execute on SKALE Calypso (gasless, instant finality)
5. **Full audit trail** with tx hashes, block numbers, and explorer links

## Key Features

- **Real on-chain payments** - USDC transfers on SKALE Calypso Hub Testnet via x402
- **Spend caps** - Configurable per-task spending limits ($5/$10/$25/$50)
- **Confirmation step** - Human approval required before agents start spending
- **Audit trail** - Every payment has a clickable tx hash, block number, from/to addresses
- **Real-time activity feed** - Live events from coordinator, specialists, and payment service
- **Zero gas fees** - All transactions on SKALE are gasless
- **AI fallback** - Mock responses when API keys are unavailable (demo-safe)

## Architecture

Unified Next.js 16 monorepo (TypeScript, Tailwind CSS v4):

```
src/
  app/
    page.tsx              # Dashboard UI (idle → working → done states)
    api/
      tasks/route.ts      # POST: Create task, start coordinator
      tasks/[id]/route.ts # GET: Poll task status + events
      wallet/balance/     # GET: Real on-chain USDC balance
  components/
    Navbar.tsx             # Wallet address, balance, network status
    TaskInput.tsx          # Task description input
    ActivityFeed.tsx       # Real-time event log
    StatusPanel.tsx        # Subtask progress + cost tracking
    ResultViewer.tsx       # Deliverables + payment audit trail
    SpecialistCard.tsx     # Specialist display cards
  services/
    coordinator.ts         # Orchestrates: decompose → execute → pay → synthesize
    payment.ts             # Real USDC transfers via ethers.js + x402
  lib/
    wallet.ts              # Coordinator wallet management
    blockchain-config.ts   # SKALE Calypso + USDC contract config
    task-store.ts          # In-memory task state (globalThis singleton)
    api-client.ts          # Frontend API client
  types/
    task.ts                # Task, Subtask, TaskEvent, PaymentItem types
    payment.ts             # Payment, WalletBalance types
contracts/
  TestUSDC.sol             # ERC-20 test token (6 decimals, faucet)
```

## Verix Roadmap

The project is evolving into **Verifiable Autonomous Work Infrastructure**:
multi-agent execution with structured traces, Boundless proof receipts, and
Trustless Work escrow-backed settlement.

- [Foundation & Infrastructure Plan](docs/foundation-infrastructure.md)

## Quickstart

### Prerequisites

- Node.js 18+
- A wallet private key with sFUEL on SKALE Calypso Hub Testnet

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

The app supports three modes controlled by `APP_MODE` (auto-detected when not set):

| Mode | Auto-detected when | DATABASE_URL | ENCRYPTION_KEY | Wallet keys | AI keys |
|---|---|---|---|---|---|
| `demo` | no `DATABASE_URL` in env | — | — | — | — |
| `local` | `DATABASE_URL` set, `NODE_ENV≠production` | required | optional | optional | optional |
| `production` | `NODE_ENV=production` | required | **required** | **required** | optional |

**Quick start (no external services needed):**
```bash
APP_MODE=demo npm run dev
```
All blockchain and AI calls are mocked. Components that use mocks are clearly labeled `[demo mode]` in the activity feed.

**Full local setup:** copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Key variables (see `.env.local.example` for the full list with comments):

| Variable | demo | local | production | Description |
|---|---|---|---|---|
| `DATABASE_URL` | — | required | required | PostgreSQL connection string |
| `ENCRYPTION_KEY` | — | optional | **required** | 32-byte hex key for field encryption |
| `COORDINATOR_PRIVATE_KEY` | — | optional | required | Pays specialist agents on SKALE |
| `CODE_AUDITOR_PRIVATE_KEY` | — | optional | required | CodeAuditor agent wallet |
| `MARKET_ANALYST_PRIVATE_KEY` | — | optional | required | MarketAnalyst agent wallet |
| `CREATIVE_WRITER_PRIVATE_KEY` | — | optional | required | CreativeWriter agent wallet |
| `CLAUDE_API_KEY` | — | optional | optional | Falls back to mock |
| `OPENAI_API_KEY` | — | optional | optional | Falls back to mock |
| `SKALE_RPC_URL` | — | optional | optional | Defaults to SKALE testnet |
| `USDC_CONTRACT_ADDRESS` | — | optional | optional | Defaults to testnet USDC |
| `THIRDWEB_SECRET_KEY` | — | — | optional | Higher RPC rate limits |

Generate an `ENCRYPTION_KEY` for production:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Note:** `npm run build` runs `prisma generate` first, which reads `DATABASE_URL` from `.env.local` via `prisma.config.ts`. Set `DATABASE_URL` (or run `APP_MODE=demo npm run build`) before building.

### 3. Get testnet tokens

- **sFUEL**: Visit [sfuelstation.com](https://sfuelstation.com) and request tokens for SKALE Calypso Hub Testnet
- **TestUSDC**: The coordinator wallet was pre-minted 1M USDC on deploy. Or call `mint()` on the contract.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Payment Flow (x402)

```
User submits task
  → Coordinator decomposes into subtasks
  → Spend cap check (blocks if over limit)
  → For each specialist:
      → Specialist executes (AI inference)
      → x402 payment: Coordinator → Specialist wallet (USDC on SKALE)
      → Transaction confirmed, tx hash logged
  → Results synthesized with full payment audit trail
  → Wallet balance refreshes on UI
```

## On-Chain Evidence

- **Network**: SKALE Calypso Hub Testnet (Chain ID: 974399131)
- **USDC Contract**: `0x4E2B3DD08B71F45Bb4bcfAE425D697c650e4212B`
- **Explorer**: https://staging-utter-unripe-menkar.explorer.staging-v3.skalenodes.com
- **Example tx**: `0x246287cdda87e67de1d86cbcdaeaab1d64e7c0a6aa7fa5fef4b89d4825b84d13`

## Trust & Safety

- **Spend caps**: Configurable per-task limit enforced server-side before any payment
- **Confirmation modal**: User must approve cost/cap/balance before execution starts
- **Balance check**: Insufficient funds block execution before any on-chain call
- **Cumulative tracking**: Running total checked against cap before each payment
- **Audit trail**: Every payment has verifiable tx hash, block number, and wallet addresses

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS v4
- **AI**: Anthropic Claude (CodeAuditor), OpenAI GPT-4o (MarketAnalyst, CreativeWriter)
- **Blockchain**: SKALE Calypso Hub Testnet, ethers.js v6
- **Payments**: x402 protocol, USDC ERC-20
- **Smart Contract**: Solidity (OpenZeppelin ERC-20)

## Team

Built at the SF Agentic Commerce x402 Hackathon, February 2026.
