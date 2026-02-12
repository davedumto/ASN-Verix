import hre from "hardhat";

async function main() {
  console.log("Deploying TestUSDC to SKALE Calypso Hub Testnet...\n");

  const TestUSDC = await hre.artifacts.readArtifact("TestUSDC");
  const [deployer] = await hre.network.provider.request({
    method: "eth_accounts",
  }) as string[];

  console.log("Deployer address:", deployer);

  // Get deployer balance
  const balance = await hre.network.provider.request({
    method: "eth_getBalance",
    params: [deployer, "latest"],
  });
  console.log("Deployer sFUEL balance:", parseInt(balance as string, 16) / 1e18, "sFUEL\n");

  // Deploy using raw transaction
  const factory = new hre.ethers.ContractFactory(
    TestUSDC.abi,
    TestUSDC.bytecode,
    (await hre.ethers.getSigners())[0]
  );

  console.log("Sending deploy transaction...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("\n========================================");
  console.log("TestUSDC deployed successfully!");
  console.log("Contract address:", address);
  console.log("Network: SKALE Calypso Hub Testnet");
  console.log("========================================\n");

  // Check initial supply
  const totalSupply = await contract.totalSupply();
  console.log("Total supply:", Number(totalSupply) / 1e6, "USDC");
  console.log("Deployer received: 1,000,000 USDC\n");

  console.log("Next steps:");
  console.log(`1. Update .env.local: USDC_CONTRACT_ADDRESS=${address}`);
  console.log(`2. Mint test USDC to specialist wallets if needed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
