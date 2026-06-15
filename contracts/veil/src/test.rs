#![cfg(test)]
//! Unit tests for the Veil registry (NFR-6: success + rejection paths per fn).
//!
//! The real on-chain proof verification is exercised end-to-end against the
//! deployed Nethermind verifier in the integration script. Here we swap in a
//! mock router so we can test Veil's own logic (deadline, dedup, journal
//! reconstruction, auth, storage) deterministically without running Groth16.

use super::*;
use soroban_sdk::{
    contract as sdk_contract, contractimpl as sdk_contractimpl,
    testutils::{Address as _, Ledger},
    Address, Bytes, BytesN, Env,
};

/// Mock RISC Zero router. `verify` succeeds unless the seal's first byte is
/// 0xFF, in which case it panics — mimicking an invalid proof being rejected.
#[sdk_contract]
struct MockRouter;

#[sdk_contractimpl]
impl MockRouter {
    pub fn verify(_env: Env, seal: Bytes, _image_id: BytesN<32>, _journal: BytesN<32>) {
        if !seal.is_empty() && seal.get(0) == Some(0xFF) {
            panic!("mock: invalid proof");
        }
    }
}

struct Ctx {
    env: Env,
    veil: VeilRegistryClient<'static>,
    owner: Address,
    predictor: Address,
    image_id: BytesN<32>,
    deadline: u64,
}

fn setup(deadline: u64, now: u64) -> Ctx {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(now);

    let router = env.register(MockRouter, ());
    let veil_id = env.register(VeilRegistry, ());
    let veil = VeilRegistryClient::new(&env, &veil_id);

    let owner = Address::generate(&env);
    let predictor = Address::generate(&env);
    let image_id = BytesN::from_array(&env, &[9u8; 32]);

    veil.init(&owner, &router, &image_id, &deadline);

    Ctx { env, veil, owner, predictor, image_id, deadline }
}

fn good_seal(env: &Env) -> Bytes {
    Bytes::from_array(env, &[0x01, 0x02, 0x03])
}
fn bad_seal(env: &Env) -> Bytes {
    Bytes::from_array(env, &[0xFF, 0x02, 0x03])
}
fn h(env: &Env, b: u8) -> BytesN<32> {
    BytesN::from_array(env, &[b; 32])
}

#[test]
fn commit_with_valid_proof_is_stored() {
    let c = setup(1_000, 100);
    let x_hash = h(&c.env, 0xAA);
    let commitment_c = h(&c.env, 0xBB);

    c.veil
        .commit(&c.predictor, &good_seal(&c.env), &x_hash, &commitment_c);

    let stored = c.veil.get_commitment(&c.predictor).unwrap();
    assert_eq!(stored.predictor, c.predictor);
    assert_eq!(stored.commitment_c, commitment_c);
    assert_eq!(stored.x_hash, x_hash);
    assert_eq!(stored.image_id, c.image_id);
    assert_eq!(stored.committed_at, 100);

    // all_commitments lists it
    let all = c.veil.all_commitments();
    assert_eq!(all.len(), 1);
}

#[test]
#[should_panic] // mock router traps on an invalid proof -> whole call reverts (FR-2)
fn commit_with_invalid_proof_is_rejected() {
    let c = setup(1_000, 100);
    c.veil
        .commit(&c.predictor, &bad_seal(&c.env), &h(&c.env, 1), &h(&c.env, 2));
}

#[test]
fn commit_at_or_after_deadline_is_rejected() {
    // now == deadline -> rejected (FR-3: "at or after")
    let c = setup(500, 500);
    let res = c
        .veil
        .try_commit(&c.predictor, &good_seal(&c.env), &h(&c.env, 1), &h(&c.env, 2));
    assert_eq!(res, Err(Ok(Error::DeadlinePassed)));
}

#[test]
fn commit_after_deadline_is_rejected() {
    let c = setup(500, 600);
    let res = c
        .veil
        .try_commit(&c.predictor, &good_seal(&c.env), &h(&c.env, 1), &h(&c.env, 2));
    assert_eq!(res, Err(Ok(Error::DeadlinePassed)));
}

#[test]
fn double_commit_is_rejected() {
    let c = setup(1_000, 100);
    c.veil
        .commit(&c.predictor, &good_seal(&c.env), &h(&c.env, 1), &h(&c.env, 2));
    let res = c
        .veil
        .try_commit(&c.predictor, &good_seal(&c.env), &h(&c.env, 3), &h(&c.env, 4));
    assert_eq!(res, Err(Ok(Error::AlreadyCommitted)));
}

#[test]
fn init_twice_is_rejected() {
    let c = setup(1_000, 100);
    let router2 = c.env.register(MockRouter, ());
    let res = c
        .veil
        .try_init(&c.owner, &router2, &c.image_id, &c.deadline);
    assert_eq!(res, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn get_commitment_none_when_absent() {
    let c = setup(1_000, 100);
    assert!(c.veil.get_commitment(&c.predictor).is_none());
}

#[test]
fn get_config_returns_stored_config() {
    let c = setup(1_234, 100);
    let cfg = c.veil.get_config();
    assert_eq!(cfg.deadline, 1_234);
    assert_eq!(cfg.image_id, c.image_id);
}

#[test]
fn two_predictors_both_listed() {
    let c = setup(1_000, 100);
    let p2 = Address::generate(&c.env);
    c.veil
        .commit(&c.predictor, &good_seal(&c.env), &h(&c.env, 1), &h(&c.env, 2));
    c.veil
        .commit(&p2, &good_seal(&c.env), &h(&c.env, 3), &h(&c.env, 4));
    assert_eq!(c.veil.all_commitments().len(), 2);
}
