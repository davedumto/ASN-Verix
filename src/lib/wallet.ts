import { ethers } from "ethers";
import { getProvider, getUSDCContract, formatUSDC, withRpcFailover } from "./blockchain-config";

/**
 * Server-side wallet management for the coordinator
 * This wallet is used to pay specialist agents on SKALE
 */

/**
 * Get coordinator wallet address (does not need RPC)
 */
export function getCoordinatorAddress(): string {
    const privateKey = process.env.COORDINATOR_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("COORDINATOR_PRIVATE_KEY not configured in environment variables");
    }
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
}

/**
 * Get coordinator wallet connected to a specific provider
 */
export function getCoordinatorWallet(provider?: ethers.Provider): ethers.Wallet {
    const privateKey = process.env.COORDINATOR_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("COORDINATOR_PRIVATE_KEY not configured in environment variables");
    }
    const p = provider || getProvider();
    return new ethers.Wallet(privateKey, p);
}

/**
 * Get coordinator's USDC balance (with RPC failover)
 */
export async function getCoordinatorUSDCBalance(): Promise<string> {
    const address = getCoordinatorAddress();
    console.log(`[Wallet] Fetching USDC balance for ${address}...`);

    return withRpcFailover(async (provider) => {
        const wallet = new ethers.Wallet(process.env.COORDINATOR_PRIVATE_KEY!, provider);
        const usdcContract = getUSDCContract(wallet);
        const balance = await usdcContract.balanceOf(address);
        const formatted = formatUSDC(balance);
        console.log(`[Wallet] Raw balance: ${balance.toString()}, Formatted: ${formatted}`);
        return formatted;
    });
}

/**
 * Get coordinator's native sFUEL balance (for gas)
 */
export async function getCoordinatorSFuelBalance(): Promise<string> {
    const address = getCoordinatorAddress();

    return withRpcFailover(async (provider) => {
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
    });
}

/**
 * Generate a new random wallet (for testing/setup)
 * WARNING: Only use for testing. In production, use secure key generation
 */
export function generateNewWallet(): { address: string; privateKey: string } {
    const wallet = ethers.Wallet.createRandom();
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
    };
}
