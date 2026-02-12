#!/usr/bin/env node

/**
 * Generate a new wallet for the coordinator
 * Run this once to create a wallet, then add the private key to .env.local
 */

const { ethers } = require("ethers");

function generateWallet() {
    console.log("\n🔐 Generating new wallet for coordinator...\n");

    const wallet = ethers.Wallet.createRandom();

    console.log("✅ Wallet generated successfully!\n");
    console.log("📋 Wallet Details:");
    console.log("─".repeat(60));
    console.log(`Address:     ${wallet.address}`);
    console.log(`Private Key: ${wallet.privateKey}`);
    console.log("─".repeat(60));

    console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
    console.log("  1. NEVER share or commit your private key");
    console.log("  2. Add it to .env.local as COORDINATOR_PRIVATE_KEY");
    console.log("  3. Keep a secure backup of this key");
    console.log("  4. This is for TESTNET ONLY - use secure key management in production\n");

    console.log("📝 Next Steps:");
    console.log("  1. Copy the private key above");
    console.log("  2. Add to .env.local:");
    console.log(`     COORDINATOR_PRIVATE_KEY=${wallet.privateKey}`);
    console.log("  3. Fund the wallet:");
    console.log(`     - Visit: https://staging-faucet.skale.network/`);
    console.log(`     - Enter address: ${wallet.address}`);
    console.log("     - Request test sFUEL and USDC tokens\n");
}

generateWallet();
