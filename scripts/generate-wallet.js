#!/usr/bin/env node

console.log(`
Verix now uses Stellar/Soroban for hackathon settlement.

Create a Stellar testnet keypair with one of:

  stellar keys generate <identity> --network testnet
  stellar keys address <identity>

or use a wallet supported by Trustless Work.

Add the public key to .env.local:

  COORDINATOR_STELLAR_PUBLIC_KEY=G...
  TRUSTLESS_WORK_SIGNER_ADDRESS=G...

Then fund it on Stellar testnet and configure Trustless Work credentials.
`);
