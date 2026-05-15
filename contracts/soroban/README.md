# Verix Soroban Contracts

EPIC 8 moved the project from the previous SKALE/EVM demo path to the Stellar
ecosystem. Trustless Work remains the escrow system of record; these contracts
only provide small public anchors for marketplace trust signals.

## Contracts

- `agent_registry`: anchors agent IDs, owners, active version hashes, and metadata URIs.
- `receipt_anchor`: anchors verified receipt hashes, trace roots, and proof references.

## Build

```bash
cd contracts/soroban
cargo build --target wasm32-unknown-unknown --release
```

## Deploy

Install the Stellar CLI and configure a testnet identity first.

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/verix_agent_registry.wasm \
  --source <stellar-identity> \
  --network testnet

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/verix_receipt_anchor.wasm \
  --source <stellar-identity> \
  --network testnet
```

Set the returned contract IDs:

```env
SOROBAN_AGENT_REGISTRY_CONTRACT_ID=C...
SOROBAN_RECEIPT_ANCHOR_CONTRACT_ID=C...
```

## Receipt Anchor Invocation

After `verifyProof()` marks a receipt verified, the backend stores the configured
anchor contract ID on the receipt. For a live Soroban transaction, invoke:

```bash
stellar contract invoke \
  --id "$SOROBAN_RECEIPT_ANCHOR_CONTRACT_ID" \
  --source <stellar-identity> \
  --network testnet \
  -- \
  anchor_receipt \
  --verifier <G...> \
  --receipt_hash <32-byte receipt hash> \
  --task_id_hash <32-byte task id hash> \
  --trace_root <32-byte trace root> \
  --proof_ref <proof id or artifact URI>
```

Trustless Work multi-release escrow should be used for real payout settlement.
Do not duplicate escrow behavior in custom contracts unless the hackathon scope
changes.
