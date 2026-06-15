# memory.md, Veil

Living state for the Veil build. Read this at the start of every session to know where things stand. Update it at the end of every session: tick off progress, record anything discovered, append a session log entry. Do not re-open anything under Locked decisions without explicit approval.

Companion files: `PRD.md` is the why, `instructions.md` is the how and the rules.

---

## Project snapshot

Veil: provably honest AI predictions anchored on Stellar. A predictor proves a forecast was genuinely computed by a real model, with the weights kept private, commits it on-chain before an event, and reveals it after. The ZK proof is verified inside a Soroban contract on testnet.

**Current status:** Phase 0 done. Phase 1 (ZK→Soroban spike) in progress — local proving works end to end; on-chain verification of a Groth16 receipt on testnet is the remaining gate.
**Deadline:** June 29, 12:00PM PST.

---

## Status tracker

Update the marker as each phase passes its acceptance test in `instructions.md`.

- [x] Phase 0, setup. Toolchain installed; RISC Zero starter proves locally (real STARK receipt verifies, wrong witness rejected); funded testnet identity exists. `stellar` deploy of a contract still to be exercised in Phase 1.
- [ ] Phase 1, spike. Real Groth16 proof verified on testnet, tampered proof rejected. **Local proving + verify: DONE. STARK→Groth16 wrap (Bonsai) + on-chain verify: TODO.**
- [ ] Phase 2, real guest plus commitment contract. Valid commit stored, invalid proof and late commit rejected.
- [ ] Phase 3, resolve and score. Correct reveal scores and ranks, mismatched reveal rejected.
- [ ] Phase 4, frontend. Full loop runs from the browser against testnet.
- [ ] Phase 5, ship. Repo public, video recorded, submission filed early.

---

## Locked decisions

These are settled. Do not re-litigate without explicit approval. If new information makes one look wrong, flag it, do not silently change course.

1. **Proving system: RISC Zero.** Chosen because the guest is written in ordinary Rust, which suits model inference far better than circuit DSLs. Not Noir, not Circom.
2. **Verifier: fork Nethermind's `stellar-risc0-verifier`.** Do not write a Groth16 verifier from scratch. Keep the fork close to upstream.
3. **Privacy target: the model weights.** W is a private input to the guest. The input X may be public. The journal exposes only X or its hash, the commitment C, and the image ID. Y and W never appear in the journal.
4. **Commitment scheme:** C = Hash(Y, salt). Reveal checks `Hash(Y, salt)` equals stored C.
5. **Outcome source: owner-set for v1.** No real oracle. Reflector is a post-hackathon stretch only.
6. **Model: trivially small.** Linear or fixed-weight function. Sophistication is out of scope.
7. **Scope, one clean loop:** commit, verify, reveal, score, leaderboard. Single numeric prediction type.
8. **Testnet only.** Never mainnet. No secrets in the repo.
9. **Spike before product.** Phase 1 must be green before any Phase 2 work.

---

## Deployed artifacts

Fill in as they are created. Keep current.

- Testnet identity alias: `veil-deployer` → `GC5VG4DL567MOAPE7B7PQUDBP6OG5CMH6ADRFVWLK36V2AWLESIBXRKT` (funded on testnet)
- **Nethermind verifier stack (deployed to testnet 2026-06-15, `contracts/verifier/`):**
  - Router (call `verify` on THIS): `CAY5G7UCZF4BCX66NCKKMBKZMQCJUEYLGGE5WF25F25MHIVW52OB6WFZ`
  - TimelockController: `CDGC4HIWO5DDBPWTIPTD3DE7COLOSB7NQRNCIIV25GIPBSB7WX4YDNYE`
  - Groth16Verifier: `CAFRT6W3WYXRZJ4LEPT3KTLEU4QZALRUIQ5YCD4Q72P3VKAZY464XYZS`
  - EmergencyStop: `CCLQ42ASKGQ3WGDRX37HGJBLUPESB3GGTOMSPULJRC7NHCUMR65KGZ3T`
  - Selector: `73c457ba` · Verifier version: `3.0.0` · timelock-delay: 0 · registered & routable (unroutable=false)
  - Full state tracked in `contracts/verifier/deployment.toml`.
- Veil registry contract ID: _to fill_ (Phase 2)
- Guest image ID (spike `method`): `[970865094, 4012129450, 3202611349, 2417594342, 4018138017, 2997657552, 886013744, 1077926306]` — will change when the real model guest replaces the spike in Phase 2. NOTE: on-chain verify needs the 32-byte hex form of the image ID (not the u32-array form).
- Frontend deploy URL, if any: _to fill_

---

## Verified technical facts

Record things confirmed by doing, not assumed. Each entry should be something a future session can trust without re-checking. Examples to populate: the exact proof format the verifier expects, how ledger timestamp is read in the contract, the SDK and CLI versions that actually worked, any Soroban resource or fee limits hit during on-chain verification.

- **Toolchain that works on this machine (arm64 macOS):** rustc 1.93.1 (system) + RISC Zero toolchain via `rzup` (rzup 0.5.0, cargo-risczero 3.0.5, r0vm 3.0.5, risc0 rust 1.94.1, installed to `~/.risc0/bin`). Stellar CLI 26.1.0 via Homebrew. `wasm32-unknown-unknown` target present.
- **`zk/` layout:** standard RISC Zero cargo template (`cargo risczero new`, tag v3.0.5) — workspace with `host/` + `methods/` (+ `methods/guest/`). Guest package name is `method`, so generated constants are `METHOD_ELF` / `METHOD_ID`. risc0 crate versions pinned at `^3.0.5`.
- **Spike proven:** guest asserts `x*x==25` with `x` a private input, commits only the public `25`. `RISC0_DEV_MODE=0 cargo run -p host` produces a real STARK receipt that verifies locally; a wrong witness (`-- 7`) makes the guest panic so no proof is produced (correct rejection). First clean build ~3 min.
- **Privacy pattern confirmed:** private input via `env::read()` / `ExecutorEnv::builder().write(&x)`; public output via `env::commit()`. The witness never appears in the decoded journal.
- **Nethermind verifier is NOT a single contract** — it's a 4-contract stack (TimelockController → VerifierRouter → EmergencyStop → Groth16Verifier). You call `verify` on the **Router**, which dispatches by a 4-byte selector prefix in the seal. Build target is `wasm32v1-none` (not `wasm32-unknown-unknown`). Deploy/manage via `contracts/verifier/scripts/manage.sh`; needs Python 3.11+.
- **Router `verify` interface (THE on-chain encoding — clears most of Phase 1 task 8):** `verify(seal: Bytes, image_id: BytesN<32>, journal_digest: BytesN<32>)`. `journal_digest = sha256(journal_bytes)` (NOT raw journal). `seal = encode_seal(&receipt)` from the `risc0-ethereum-contracts` crate (includes the routing-selector prefix). CLI: `stellar contract invoke --id <ROUTER> -- verify --seal <hex> --image_id <hex> --journal <hex>`. (CLI arg is named `--journal` but it takes the journal DIGEST.)
- **Version match matters:** the deployed Groth16 verifier is version 3.0.0; proofs must be generated with a matching RISC Zero version (we have r0vm 3.0.5). A version mismatch is a documented failure mode.
- **Host deps needed for Groth16 + on-chain:** add `risc0-ethereum-contracts = "^3.0"`, `sha2 = "0.10"`, `hex = "0.4"` to `zk/host`; prove with `ProverOpts::groth16()` via `prove_with_opts`.
- **Groth16 generation needs Docker** (the stark2groth16 prover image); RISC Zero docs warn it typically needs x86_64 — on arm64 Mac it runs under Docker emulation. Docker 29.5.3 installed & daemon running. `RISC0_DEV_MODE` must be 0.
- **Public testnet RPC (`soroban-testnet.stellar.org`) is flaky** — saw a "Request timeout" on first deploy attempt; a straight retry succeeded. Nothing partial persisted on the failed attempt.

---

## Open questions and risks

- On-chain Groth16 verification cost and proof size. Unproven until Phase 1 passes. If it is a problem, simplify the guest before touching the verifier.
- Exact journal encoding the forked verifier expects. Confirm during Phase 1.
- Ledger timestamp source for deadline enforcement. Confirm against the loaded Stellar skill.

---

## Naming registry

Keep names consistent across contracts, guest, and frontend.

- Product: Veil
- Registry contract: `veil`
- Verifier contract: `verifier`
- Commitment value: C
- Prediction value: Y
- Private weights: W
- Salt: salt

---

## Session log

Append one short entry per session, newest at the top. Date, what changed, what is next.

- **2026-06-15** — Renamed Verix→Veil (README/env/.gitignore/CLAUDE.md/package.json). Installed full toolchain (rzup + RISC Zero, Stellar CLI). Generated funded testnet identity `veil-deployer`. Scaffolded `zk/` from the RISC Zero template and wrote the Sprint 1 spike (`x*x==25` with private witness). Verified a real STARK receipt locally and confirmed wrong-witness rejection. **Next:** fork Nethermind `stellar-risc0-verifier`, deploy to testnet, wrap the STARK→Groth16 via Bonsai (need BONSAI_API_KEY), and verify the Groth16 receipt on-chain — the Phase 1 gate.
