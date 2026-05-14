import { ethers } from "ethers";
import { env } from "@/lib/env";

/**
 * SKALE Network Configuration
 * Testnet: Calypso Hub Testnet
 */
export const SKALE_CONFIG = {
    chainId: 974399131,
    chainName: "SKALE Calypso Hub Testnet",
    rpcUrl: env.SKALE_RPC_URL,
    blockExplorer: "https://staging-utter-unripe-menkar.explorer.staging-v3.skalenodes.com",
    nativeCurrency: {
        name: "sFUEL",
        symbol: "sFUEL",
        decimals: 18,
    },
};

/**
 * USDC Token Configuration on SKALE Testnet
 */
export const USDC_CONFIG = {
    address: env.USDC_CONTRACT_ADDRESS,
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
 * RPC endpoints — ordered by priority.
 * Thirdweb with secret key (authenticated, no rate limits) → SKALE native → Thirdweb public.
 */
const THIRDWEB_RPC = "https://974399131.rpc.thirdweb.com";
const SKALE_NATIVE_RPC = "https://testnet.skalenodes.com/v1/giant-half-dual-testnet";

function getRpcEndpoints(): string[] {
    if (env.SKALE_RPC_URL !== SKALE_NATIVE_RPC) {
        // Custom RPC configured — use it first, then fall back
        return [env.SKALE_RPC_URL, SKALE_NATIVE_RPC, THIRDWEB_RPC];
    }
    return [THIRDWEB_RPC, SKALE_NATIVE_RPC];
}

/**
 * Get configured JSON-RPC provider for SKALE
 * Uses staticNetwork to skip ethers' network auto-detection.
 * Attaches Thirdweb secret key header when available for authenticated access.
 */
export function getProvider(rpcUrl?: string): ethers.JsonRpcProvider {
    const url = rpcUrl || SKALE_CONFIG.rpcUrl;
    const network = new ethers.Network(SKALE_CONFIG.chainName, SKALE_CONFIG.chainId);
    const fetchReq = new ethers.FetchRequest(url);
    fetchReq.timeout = 30_000;

    // Attach Thirdweb secret key header for authenticated (no rate-limit) access
    const secretKey = env.THIRDWEB_SECRET_KEY;
    if (secretKey && url.includes("thirdweb.com")) {
        fetchReq.setHeader("x-secret-key", secretKey);
    }

    const provider = new ethers.JsonRpcProvider(fetchReq, network, {
        staticNetwork: network,
        batchMaxCount: 1,
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
    const endpoints = getRpcEndpoints();
    let lastError: unknown;

    for (let i = 0; i < endpoints.length; i++) {
        const rpcUrl = endpoints[i];
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
            if (i < endpoints.length - 1) {
                console.warn(`[RPC] ${rpcUrl} failed (${code}), trying next...`);
            } else {
                console.error(`[RPC] All ${endpoints.length} RPCs failed. Last error: ${code}`);
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
