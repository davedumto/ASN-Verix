import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---- Config ----
const RPC_URL = "https://974399131.rpc.thirdweb.com";
const PRIVATE_KEY = process.env.COORDINATOR_PRIVATE_KEY || readPrivateKeyFromEnv();

function readPrivateKeyFromEnv() {
  try {
    const envContent = readFileSync(join(__dirname, "..", ".env.local"), "utf-8");
    const match = envContent.match(/COORDINATOR_PRIVATE_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  throw new Error("COORDINATOR_PRIVATE_KEY not found. Set it in .env.local or as env var.");
}

async function main() {
  console.log("Deploying TestUSDC to SKALE Calypso Hub Testnet...\n");

  // Load compiled artifact from Hardhat
  const artifactPath = join(__dirname, "..", "artifacts", "contracts", "TestUSDC.sol", "TestUSDC.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

  // Connect to SKALE
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Deployer:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("sFUEL balance:", ethers.formatEther(balance), "sFUEL");

  if (balance === 0n) {
    console.error("\nError: No sFUEL. Get some from the SKALE faucet first.");
    console.error("Visit: https://www.sfuelstation.com/");
    process.exit(1);
  }

  // Deploy
  console.log("\nSending deploy transaction...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();

  console.log("Tx hash:", contract.deploymentTransaction()?.hash);
  console.log("Waiting for confirmation...");

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n========================================");
  console.log("  TestUSDC deployed successfully!");
  console.log(`  Contract: ${address}`);
  console.log("  Network:  SKALE Calypso Hub Testnet");
  console.log("========================================\n");

  // Verify
  const usdc = new ethers.Contract(address, artifact.abi, wallet);
  const totalSupply = await usdc.totalSupply();
  const deployerBalance = await usdc.balanceOf(wallet.address);

  console.log("Total supply:", Number(totalSupply) / 1e6, "USDC");
  console.log("Your balance:", Number(deployerBalance) / 1e6, "USDC\n");

  console.log("Next steps:");
  console.log(`  1. Update .env.local: USDC_CONTRACT_ADDRESS=${address}`);
  console.log(`  2. Update SKALE_RPC_URL=https://974399131.rpc.thirdweb.com`);
}

main().catch((error) => {
  console.error("Deploy failed:", error.message || error);
  process.exit(1);
});
