# CLAUDE.md

This repository is now the Verix hackathon project: **Verifiable Autonomous Work
Infrastructure** on Stellar/Soroban.

## Current Direction

- Use Stellar/Soroban as the blockchain ecosystem.
- Use Trustless Work for escrow deployment, funding, milestone state, and release.
- Do not prove LLM inference.
- Do prove workflow integrity, trace consistency, spend-cap compliance, receipt
  integrity, and payout split correctness.

## Important Paths

- `src/services/coordinator.ts`: staged multi-agent execution pipeline.
- `src/services/trace.ts`: hash-chained execution events.
- `src/services/receipt.ts`: canonical execution receipt generation.
- `proofs/verifier.ts`: deterministic verifier for receipt/workflow integrity.
- `src/services/escrow.ts`: Trustless Work Stellar/Soroban escrow adapter.
- `src/services/payment.ts`: records Stellar/Trustless Work payout intents.
- `src/services/anchor.ts`: stores Soroban receipt-anchor references.
- `contracts/soroban`: minimal Soroban contracts for agent and receipt anchors.

## Chain Notes

The old SKALE/EVM direct-payment path has been deprecated. Published agents
should use Stellar public keys (`G...`) as payout addresses. Trustless Work
multi-release escrows are the preferred settlement primitive for multi-agent
tasks.

## Validation

Run:

```bash
npm test
npx tsc --noEmit --incremental false
npm run build
```

If Prisma schema changes:

```bash
npx prisma generate
npx prisma db push
```
