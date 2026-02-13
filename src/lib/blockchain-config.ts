import { ethers } from "ethers";

/**
 * SKALE Network Configuration
 * Testnet: Calypso Hub Testnet
 */
export const SKALE_CONFIG = {
    chainId: 974399131,
    chainName: "SKALE Calypso Hub Testnet",
    rpcUrl:
        process.env.SKALE_RPC_URL ||
        "https://testnet.skalenodes.com/v1/giant-half-dual-testnet",
    blockExplorer: "https://staging-utter-unripe-menkar.explorer.staging-v3.skalenodes.com",
    nativeCurrency: {
        name: "sFUEL",
        symbol: "sFUEL",
        decimals: 18,
    },
};

/**
 * USDC Token Configuration on SKALE Testnet
 * Note: This is a placeholder - update with actual SKALE testnet USDC address
 */
export const USDC_CONFIG = {
    address: process.env.USDC_CONTRACT_ADDRESS || "0x4E2B3DD08B71F45Bb4bcfAE425D697c650e4212B",
    decimals: 6,
    symbol: "USDC",
    // Standard ERC-20 ABI (only the functions we need)
    abi: [
        "function balanceOf(address account) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
    ],
};

/**
 * Get configured JSON-RPC provider for SKALE
 * Uses staticNetwork to skip ethers' network auto-detection,
 * which can fail silently on some SKALE RPC endpoints.
 * Uses FetchRequest with extended timeout for production reliability.
 */
export function getProvider(): ethers.JsonRpcProvider {
    const network = new ethers.Network(SKALE_CONFIG.chainName, SKALE_CONFIG.chainId);
    const fetchReq = new ethers.FetchRequest(SKALE_CONFIG.rpcUrl);
    fetchReq.timeout = 30000; // 30s per request (default is too short for testnet)
    return new ethers.JsonRpcProvider(fetchReq, network, {
        staticNetwork: network,
        batchMaxCount: 1, // disable batching — testnet RPCs handle single requests better
    });
}

/**
 * Get USDC contract instance
 */
export function getUSDCContract(signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(
        USDC_CONFIG.address,
        USDC_CONFIG.abi,
        signerOrProvider
    );
}

/**
 * Format USDC amount from wei to human-readable
 */
export function formatUSDC(amount: bigint): string {
    return ethers.formatUnits(amount, USDC_CONFIG.decimals);
}

/**
 * Parse USDC amount from human-readable to wei
 */
export function parseUSDC(amount: string): bigint {
    return ethers.parseUnits(amount, USDC_CONFIG.decimals);
}
