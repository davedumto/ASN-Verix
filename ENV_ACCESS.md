# ENV_ACCESS.md, Veil

How each layer reads configuration. Companion to `.env.example`. The single most important rule is at the bottom: a Soroban contract cannot read environment variables at all.

Env files are per workspace. The Rust host reads the root `.env`. The frontend reads its own `web/.env.local`, which Next.js loads automatically and which is gitignored. Duplicate only the variables a layer needs into that layer's file.

---

## 1. Rust host and prover (`zk/host`)

Load `.env` once at startup, then read with the standard library.

```rust
fn main() {
    dotenvy::dotenv().ok(); // loads .env into the process environment
    let rpc = std::env::var("STELLAR_RPC_URL").expect("STELLAR_RPC_URL not set");
    let veil = std::env::var("VEIL_CONTRACT_ID").expect("VEIL_CONTRACT_ID not set");
    // ...
}
```

Add the `dotenvy` crate. Note: `RISC0_DEV_MODE`, `BONSAI_API_KEY`, and `BONSAI_API_URL` are read by the RISC Zero and Bonsai SDKs directly from the environment. You do not read those yourself, you just make sure they are exported in the shell or process that runs the host.

## 2. The zkVM guest (`zk/methods/guest`)

The guest does not read OS environment variables. Its inputs come from the host over the executor channel.

```rust
use risc0_zkvm::guest::env;

fn main() {
    let x: u64 = env::read();   // input written by the host, NOT an OS env var
    // ... compute Y = f(X, W), then C = Hash(Y, salt) ...
    env::commit(&c);            // public journal output
}
```

`env::read` and `env::commit` are RISC Zero's input and journal channels. They have nothing to do with `.env`. The private weights W and salt are passed in here as inputs, never as environment variables.

## 3. Soroban contracts (`contracts/`)

Contracts run sandboxed in WASM on-chain and have no access to the host environment. Every value a contract needs is passed in as a function argument and persisted in contract storage. Configuration is set once at initialization.

```rust
pub fn init(e: Env, owner: Address, verifier: Address, deadline: u64, image_id: BytesN<32>) {
    e.storage().instance().set(&DataKey::Owner, &owner);
    e.storage().instance().set(&DataKey::Verifier, &verifier);
    e.storage().instance().set(&DataKey::Deadline, &deadline);
    e.storage().instance().set(&DataKey::ImageId, &image_id);
}
```

The contract later reads these from its own storage, not from any env. The values themselves originate in `.env` and are injected by the deploy script in the next section.

## 4. Deploy and invoke scripts (the `stellar` CLI)

Bash scripts source `.env` and pass the values to the CLI as flags or invoke arguments.

```bash
set -a; source .env; set +a

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/veil.wasm \
  --source "$STELLAR_ACCOUNT" \
  --network "$STELLAR_NETWORK"

# then invoke init, passing the config the contract stores:
stellar contract invoke --id "$VEIL_CONTRACT_ID" --source "$STELLAR_ACCOUNT" \
  --network "$STELLAR_NETWORK" -- init \
  --owner "$STELLAR_ACCOUNT" \
  --verifier "$VERIFIER_CONTRACT_ID" \
  --image_id "$GUEST_IMAGE_ID" \
  --deadline 1735500000
```

Confirm exact flag names and any env vars the CLI honors natively with `stellar --help` and the loaded Stellar skill, the CLI also supports a keychain (`stellar keys`) and named networks (`stellar network add`) so you can reference an alias instead of a raw secret.

## 5. Next.js frontend (`web/`)

Public values, safe in the browser, are inlined at build time:

```ts
const contractId = process.env.NEXT_PUBLIC_VEIL_CONTRACT_ID;
```

Secret values are read only in server code, an API route or server component, and never reach the browser:

```ts
// web/app/api/prove/route.ts, runs server-side only
const bonsaiKey = process.env.BONSAI_API_KEY; // never exposed to the client
```

The proving endpoint that triggers the host prover lives here, server-side, which is why the Bonsai key stays out of any `NEXT_PUBLIC_` variable.

---

## Gotchas, read these

- **Contracts cannot read env.** Anything a contract needs is a constructor or function argument, set at init and stored on-chain. If you find yourself wanting a contract to read a variable, you actually want to pass it in.
- **Guest input is not env.** `env::read` in the guest is the host input channel, not the OS environment. W and salt go in this way.
- **The SDK reads the proving vars.** Set `RISC0_DEV_MODE` and the Bonsai variables in the environment, the SDK consumes them. Do not parse them by hand.
- **Only `NEXT_PUBLIC_` reaches the browser.** Never give a secret that prefix. The Stellar secret key and Bonsai key are server-only.
- **Per-workspace env files.** Keep the frontend subset in `web/.env.local`, not the root `.env`.
