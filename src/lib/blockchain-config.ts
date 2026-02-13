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
 * RPC endpoints — primary + fallback.
 * If the env var is set we use that first, otherwise SKALE native first, Thirdweb second.
 */
const RPC_ENDPOINTS = process.env.SKALE_RPC_URL
    ? [process.env.SKALE_RPC_URL, "https://testnet.skalenodes.com/v1/giant-half-dual-testnet", "https://974399131.rpc.thirdweb.com"]
    : ["https://testnet.skalenodes.com/v1/giant-half-dual-testnet", "https://974399131.rpc.thirdweb.com"];

/**
 * Get configured JSON-RPC provider for SKALE
 * Uses staticNetwork to skip ethers' network auto-detection,
 * which can fail silently on some SKALE RPC endpoints.
 */
export function getProvider(rpcUrl?: string): ethers.JsonRpcProvider {
    const url = rpcUrl || SKALE_CONFIG.rpcUrl;
    const network = new ethers.Network(SKALE_CONFIG.chainName, SKALE_CONFIG.chainId);
    const fetchReq = new ethers.FetchRequest(url);
    fetchReq.timeout = 30_000; // 30s — production RPCs can be slow
    const provider = new ethers.JsonRpcProvider(fetchReq, network, {
        staticNetwork: network,
        batchMaxCount: 1, // disable batching — testnet RPCs handle single requests better
    });

    return provider;
}

/**
 * Try an async operation with RPC failover.
 * Only retries on TIMEOUT / SERVER_ERROR / NETWORK_ERROR.
 * On-chain errors (nonce, revert, insufficient funds) are thrown immediately.
 */
export async function withRpcFailover<T>(fn: (provider: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
    const retryableCodes = new Set(["TIMEOUT", "SERVER_ERROR", "NETWORK_ERROR"]);
    let lastError: unknown;

    for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
        const rpcUrl = RPC_ENDPOINTS[i];
        try {
            const provider = getProvider(rpcUrl);
            return await fn(provider);
        } catch (error: unknown) {
            const code = (error as { code?: string })?.code;
            lastError = error;

            if (!retryableCodes.has(code || "")) {
                // On-chain / contract error — don't retry on different RPC
                console.error(`[RPC] ${rpcUrl} failed with non-retryable error (${code})`);
                throw error;
            }

            // Retryable network error — try next RPC
            if (i < RPC_ENDPOINTS.length - 1) {
                console.warn(`[RPC] ${rpcUrl} failed (${code}), trying next...`);
            } else {
                console.error(`[RPC] All ${RPC_ENDPOINTS.length} RPCs failed. Last error: ${code}`);
            }
        }
    }
    throw lastError;
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
