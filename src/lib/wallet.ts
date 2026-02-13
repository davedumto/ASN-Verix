import { ethers } from "ethers";
import { getProvider, getUSDCContract, formatUSDC, SKALE_CONFIG } from "./blockchain-config";

/**
 * Server-side wallet management for the coordinator
 * This wallet is used to pay specialist agents on SKALE
 */

let coordinatorWallet: ethers.Wallet | null = null;
let cachedRpcUrl: string | null = null;

/**
 * Initialize coordinator wallet from private key in environment
 */
export function getCoordinatorWallet(): ethers.Wallet {
    const currentRpcUrl = SKALE_CONFIG.rpcUrl;

    // Re-create wallet if RPC URL has changed (e.g. env var update)
    if (coordinatorWallet && cachedRpcUrl === currentRpcUrl) {
        return coordinatorWallet;
    }

    const privateKey = process.env.COORDINATOR_PRIVATE_KEY;

    if (!privateKey) {
        throw new Error(
            "COORDINATOR_PRIVATE_KEY not configured in environment variables"
        );
    }

    const provider = getProvider();
    coordinatorWallet = new ethers.Wallet(privateKey, provider);
    cachedRpcUrl = currentRpcUrl;

    console.log(`[Wallet] Initialized coordinator wallet: ${coordinatorWallet.address}`);
    console.log(`[Wallet] Using RPC: ${SKALE_CONFIG.rpcUrl}`);

    return coordinatorWallet;
}

/**
 * Get coordinator wallet address
 */
export function getCoordinatorAddress(): string {
    const wallet = getCoordinatorWallet();
    return wallet.address;
}

/**
 * Get coordinator's USDC balance
 */
export async function getCoordinatorUSDCBalance(): Promise<string> {
    try {
        const wallet = getCoordinatorWallet();
        const usdcContract = getUSDCContract(wallet);

        console.log(`[Wallet] Fetching USDC balance for ${wallet.address} via ${SKALE_CONFIG.rpcUrl}`);
        const balance = await usdcContract.balanceOf(wallet.address);
        const formatted = formatUSDC(balance);
        console.log(`[Wallet] Raw balance: ${balance.toString()}, Formatted: ${formatted}`);
        return formatted;
    } catch (error) {
        console.error("[Wallet] Error fetching USDC balance:", error);
        throw error;
    }
}

/**
 * Get coordinator's native sFUEL balance (for gas)
 */
export async function getCoordinatorSFuelBalance(): Promise<string> {
    try {
        const wallet = getCoordinatorWallet();

        if (!wallet.provider) {
            throw new Error("Wallet provider not initialized");
        }

        const balance = await wallet.provider.getBalance(wallet.address);
        return ethers.formatEther(balance);
    } catch (error) {
        console.error("[Wallet] Error fetching sFUEL balance:", error);
        throw error;
    }
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
