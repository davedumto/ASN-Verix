#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String};

#[contracttype]
#[derive(Clone)]
pub struct AgentRecord {
    pub owner: Address,
    pub active_version_hash: BytesN<32>,
    pub metadata_uri: String,
    pub updated_ledger: u32,
}

#[contracttype]
pub enum DataKey {
    Agent(BytesN<32>),
    Version(BytesN<32>, BytesN<32>),
}

#[contract]
pub struct AgentRegistry;

#[contractimpl]
impl AgentRegistry {
    pub fn register_agent(
        env: Env,
        agent_id: BytesN<32>,
        owner: Address,
        version_hash: BytesN<32>,
        metadata_uri: String,
    ) {
        owner.require_auth();

        let key = DataKey::Agent(agent_id.clone());
        if let Some(existing) = env.storage().persistent().get::<_, AgentRecord>(&key) {
            existing.owner.require_auth();
        }

        let record = AgentRecord {
            owner: owner.clone(),
            active_version_hash: version_hash.clone(),
            metadata_uri: metadata_uri.clone(),
            updated_ledger: env.ledger().sequence(),
        };

        env.storage().persistent().set(&key, &record);
        env.storage()
            .persistent()
            .set(&DataKey::Version(agent_id.clone(), version_hash.clone()), &true);

        env.events().publish(
            (String::from_str(&env, "agent_registered"), owner),
            (agent_id, version_hash, metadata_uri),
        );
    }

    pub fn update_version(
        env: Env,
        agent_id: BytesN<32>,
        version_hash: BytesN<32>,
        metadata_uri: String,
    ) {
        let key = DataKey::Agent(agent_id.clone());
        let mut record = env
            .storage()
            .persistent()
            .get::<_, AgentRecord>(&key)
            .expect("agent not registered");

        record.owner.require_auth();

        let version_key = DataKey::Version(agent_id.clone(), version_hash.clone());
        if env.storage().persistent().has(&version_key) {
            panic!("version hash already anchored");
        }

        record.active_version_hash = version_hash.clone();
        record.metadata_uri = metadata_uri.clone();
        record.updated_ledger = env.ledger().sequence();

        env.storage().persistent().set(&key, &record);
        env.storage().persistent().set(&version_key, &true);
        env.events().publish(
            (String::from_str(&env, "agent_version_updated"), record.owner),
            (agent_id, version_hash, metadata_uri),
        );
    }

    pub fn get_agent(env: Env, agent_id: BytesN<32>) -> Option<AgentRecord> {
        env.storage().persistent().get(&DataKey::Agent(agent_id))
    }

    pub fn has_version(env: Env, agent_id: BytesN<32>, version_hash: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Version(agent_id, version_hash))
    }
}
