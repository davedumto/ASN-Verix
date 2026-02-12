import { defineConfig, configVariable } from "hardhat/config";

export default defineConfig({
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    skaleCalypso: {
      type: "http",
      chainType: "l1",
      url: "https://974399131.rpc.thirdweb.com",
      accounts: [configVariable("COORDINATOR_PRIVATE_KEY")],
    },
  },
});
