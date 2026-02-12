import { ethers } from "ethers";
import { getProvider, getUSDCContract, formatUSDC } from "./blockchain-config";

/**
 * Server-side wallet management for the coordinator
 * This wallet is used to pay specialist agents on SKALE
 */

let coordinatorWallet: ethers.Wallet | null = null;

/**
 * Initialize coordinator wallet from private key in environment
 */
export function getCoordinatorWallet(): ethers.Wallet {
    if (coordinatorWallet) {
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

    console.log(`[Wallet] Initialized coordinator wallet: ${coordinatorWallet.address}`);

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

        const balance = await usdcContract.balanceOf(wallet.address);
        return formatUSDC(balance);
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
