#![no_std]
//! Veil commitment registry (Sprint 2).
//!
//! Stores predictor commitments backed by a verified RISC Zero Groth16 proof.
//! A commitment is accepted only if:
//!   1. the predictor authorizes the call,
//!   2. the current ledger time is strictly before the round deadline (FR-3),
//!   3. the proof verifies on-chain via the RISC Zero verifier router (FR-2),
//!   4. the proof's journal digest matches `sha256(x_hash || commitment_c)`,
//!      binding the proof to exactly these public values (the journal is
//!      `x_hash || C` — see the guest), and
//!   5. the image ID matches the configured Veil guest (so only the real model
//!      program can produce accepted commitments).
//!
//! The journal carries only `x_hash` and `C` — never `Y` or `W` (NFR-2). Reveal,
//! scoring, and the leaderboard arrive in Sprint 3.

use risc0_interface::RiscZeroVerifierRouterClient;
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Bytes, BytesN,
    Env, Map, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    DeadlinePassed = 3,
    AlreadyCommitted = 4,
    JournalMismatch = 5,
    ImageIdMismatch = 6,
}

#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub owner: Address,
    pub router: Address,
    pub image_id: BytesN<32>,
    /// Round deadline as a ledger unix timestamp (seconds). Commits at or after
    /// this instant are rejected. Distinct from the hackathon deadline (FR-3).
    pub deadline: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Commitment {
    pub predictor: Address,
    pub commitment_c: BytesN<32>,
    pub x_hash: BytesN<32>,
    pub image_id: BytesN<32>,
    pub committed_at: u64,
}

/// Emitted when a commitment is accepted.
#[contractevent]
#[derive(Clone)]
pub struct Committed {
    #[topic]
    pub predictor: Address,
    pub commitment_c: BytesN<32>,
    pub committed_at: u64,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Config,
    /// predictor -> Commitment
    Commit(Address),
    /// ordered list of predictors who have committed (for enumeration)
    Predictors,
}

#[contract]
pub struct VeilRegistry;

#[contractimpl]
impl VeilRegistry {
    /// One-time configuration. `router` is the deployed RISC Zero verifier
    /// router; `image_id` is the Veil guest's program ID; `deadline` is the
    /// round cutoff (unix seconds).
    pub fn init(
        env: Env,
        owner: Address,
        router: Address,
        image_id: BytesN<32>,
        deadline: u64,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        owner.require_auth();
        env.storage().instance().set(
            &DataKey::Config,
            &Config { owner, router, image_id, deadline },
        );
        env.storage()
            .instance()
            .set(&DataKey::Predictors, &Vec::<Address>::new(&env));
        Ok(())
    }

    /// Submit a commitment backed by a valid proof (FR-1..FR-4).
    ///
    /// - `predictor`: the committing account (must authorize).
    /// - `seal`: the Groth16 seal from the host (`encode_seal`).
    /// - `x_hash`, `commitment_c`: the journal's two halves; the contract
    ///    recomputes the journal digest from them and checks the proof against it.
    pub fn commit(
        env: Env,
        predictor: Address,
        seal: Bytes,
        x_hash: BytesN<32>,
        commitment_c: BytesN<32>,
    ) -> Result<(), Error> {
        predictor.require_auth();
        let cfg = Self::config(&env)?;

        // FR-3: reject at or after the deadline.
        let now = env.ledger().timestamp();
        if now >= cfg.deadline {
            return Err(Error::DeadlinePassed);
        }

        // One commitment per predictor per round.
        if env.storage().persistent().has(&DataKey::Commit(predictor.clone())) {
            return Err(Error::AlreadyCommitted);
        }

        // Reconstruct the journal exactly as the guest committed it: x_hash || C.
        let mut journal_bytes = Bytes::new(&env);
        journal_bytes.append(&Bytes::from_array(&env, &x_hash.to_array()));
        journal_bytes.append(&Bytes::from_array(&env, &commitment_c.to_array()));
        let journal_digest = env.crypto().sha256(&journal_bytes);

        // FR-2: verify the proof on-chain. The router client traps on an invalid
        // proof, which reverts this whole call — exactly the rejection we want.
        let router = RiscZeroVerifierRouterClient::new(&env, &cfg.router);
        router.verify(&seal, &cfg.image_id, &journal_digest.into());

        // Store the record (FR-4).
        let record = Commitment {
            predictor: predictor.clone(),
            commitment_c,
            x_hash,
            image_id: cfg.image_id.clone(),
            committed_at: now,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Commit(predictor.clone()), &record);

        let mut predictors: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Predictors)
            .unwrap_or_else(|| Vec::new(&env));
        predictors.push_back(predictor);
        env.storage().instance().set(&DataKey::Predictors, &predictors);

        Committed {
            predictor: record.predictor.clone(),
            commitment_c: record.commitment_c.clone(),
            committed_at: record.committed_at,
        }
        .publish(&env);
        Ok(())
    }

    /// Fetch a predictor's commitment, if any.
    pub fn get_commitment(env: Env, predictor: Address) -> Option<Commitment> {
        env.storage()
            .persistent()
            .get(&DataKey::Commit(predictor))
    }

    /// All commitments (for listing open commitments in the UI).
    pub fn all_commitments(env: Env) -> Map<Address, Commitment> {
        let mut out = Map::new(&env);
        let predictors: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Predictors)
            .unwrap_or_else(|| Vec::new(&env));
        for p in predictors.iter() {
            if let Some(c) = env.storage().persistent().get(&DataKey::Commit(p.clone())) {
                out.set(p, c);
            }
        }
        out
    }

    pub fn get_config(env: Env) -> Result<Config, Error> {
        Self::config(&env)
    }

    fn config(env: &Env) -> Result<Config, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)
    }
}

mod test;
