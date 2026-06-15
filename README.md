# Veil

Provably honest AI predictions, anchored on Stellar.

> Status: in development for Stellar Hacks, Real-World ZK. This README is a work in progress. See `PRD.md` for the full concept.

## What it is

Veil lets a predictor produce an AI forecast, prove it was genuinely computed by a model while keeping the model weights private, commit it on-chain before an event, then reveal and be scored after. The zero-knowledge proof is verified inside a Soroban smart contract on Stellar testnet.

The ZK is load-bearing: the proof attests that a committed prediction is the output of running a model on a public input with private weights, so the forecast cannot be fabricated after the fact and the model itself stays secret.

## How it works

1. **Predict**, off-chain in a RISC Zero zkVM. A small model computes Y = f(X, W) with weights W private, then a commitment C = Hash(Y, salt). Only X or its hash and C are public.
2. **Commit**, on-chain before the deadline. The Soroban registry verifies the proof and stores the commitment with a timestamp.
3. **Resolve**, after the event. The predictor reveals Y and salt, the contract checks Hash(Y, salt) equals C, scores accuracy by distance from the actual outcome, and updates the leaderboard.

## Architecture

- `zk/` — RISC Zero guest (the model) and host prover
- `contracts/` — Soroban verifier (forked from Nethermind) and the `veil` registry
- `web/` — Next.js frontend and the server-side proving endpoint

## Running locally

TODO, Sprint 5. Will cover toolchain setup, building the guest, deploying the contracts to testnet, and running the frontend.

## What is real and what is mocked

TODO, Sprint 5. State plainly which parts use real proofs versus placeholders. For example, the actual outcome is owner-set rather than read from an oracle in this version.

## Demo video

TODO, Sprint 5.

## Project docs

- `PRD.md` — the concept and rationale
- `REQUIREMENTS_SPRINTS.md` — requirements and the sprint plan
- `instructions.md` — build rules for the coding agent
- `ENV_ACCESS.md` — how each layer reads configuration
- `memory.md` — live build state

## License

TODO. The submission requires an open-source repo, add a license before submitting.
