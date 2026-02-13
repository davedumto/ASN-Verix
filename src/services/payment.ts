import { Payment } from "@/types/payment";
import { ethers } from "ethers";
import { getCoordinatorWallet } from "@/lib/wallet";
import { getUSDCContract, parseUSDC, formatUSDC } from "@/lib/blockchain-config";

/** Retry an async fn up to `attempts` times with exponential backoff */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4, delayMs = 500): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isTimeout =
        err instanceof Error &&
        (err.message.includes("TIMEOUT") || err.message.includes("timeout"));
      if (!isTimeout || i === attempts - 1) throw err;
      console.log(`[Payment] RPC timeout, retrying (${i + 1}/${attempts}) in ${delayMs * (i + 1)}ms...`);
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw new Error("withRetry: unreachable");
}

/**
 * Map specialist name to their wallet address by deriving it from the private key in env vars.
 */
function getSpecialistAddress(specialistName: string): string {
  const keyMap: Record<string, string | undefined> = {
    CodeAuditor: process.env.CODE_AUDITOR_PRIVATE_KEY,
    MarketAnalyst: process.env.MARKET_ANALYST_PRIVATE_KEY,
    CreativeWriter: process.env.CREATIVE_WRITER_PRIVATE_KEY,
  };

  const privateKey = keyMap[specialistName];
  if (!privateKey) {
    throw new Error(`No private key configured for specialist: ${specialistName}`);
  }

  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}

/**
 * Payment Service
 *
 * Handles x402 payment flow + settlement on SKALE:
 * 1. Specialist returns 402 Payment Required
 * 2. Coordinator creates x402 payment
 * 3. Payment sent on SKALE (gasless, instant)
 * 4. AP2 settlement finalization (future)
 * 5. Specialist delivers result
 */

export async function createPayment(
  taskId: string,
  specialistId: string,
  amount: number
): Promise<Payment> {
  console.log(`[Payment] Creating USDC payment of $${amount} to ${specialistId}...`);

  try {
    // Get coordinator wallet
    const wallet = getCoordinatorWallet();
    const usdcContract = getUSDCContract(wallet);

    // Derive real specialist wallet address from their private key
    const specialistAddress = getSpecialistAddress(specialistId);

    console.log(`[Payment] From: ${wallet.address}`);
    console.log(`[Payment] To: ${specialistAddress}`);

    // Check coordinator balance (with retry for flaky RPC)
    const balance = await withRetry(() => usdcContract.balanceOf(wallet.address));
    const balanceFormatted = formatUSDC(balance);
    console.log(`[Payment] Coordinator USDC balance: $${balanceFormatted}`);

    const amountWei = parseUSDC(amount.toString());

    if (balance < amountWei) {
      throw new Error(
        `Insufficient USDC balance. Need $${amount}, have $${balanceFormatted}`
      );
    }

    // Execute USDC transfer on SKALE (with retry for flaky RPC)
    console.log(`[Payment] Sending ${amount} USDC...`);
    const tx = await withRetry(() => usdcContract.transfer(specialistAddress, amountWei));

    console.log(`[Payment] Transaction submitted: ${tx.hash}`);
    console.log(`[Payment] Waiting for confirmation...`);

    // Wait for transaction confirmation (with retry)
    const receipt = (await withRetry(() => tx.wait())) as ethers.TransactionReceipt;

    if (!receipt || receipt.status === 0) {
      throw new Error("Transaction failed on-chain");
    }

    console.log(`[Payment] ✅ Payment confirmed in block ${receipt.blockNumber}`);

    const payment: Payment = {
      id: crypto.randomUUID(),
      taskId,
      specialistId,
      amount,
      currency: "USDC",
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      from: wallet.address,
      to: specialistAddress,
      status: "confirmed",
      protocol: "x402",
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };

    return payment;
  } catch (error) {
    console.error("[Payment] Error creating payment:", error);

    // Return failed payment
    const payment: Payment = {
      id: crypto.randomUUID(),
      taskId,
      specialistId,
      amount,
      currency: "USDC",
      txHash: "",
      status: "failed",
      protocol: "x402",
      createdAt: new Date().toISOString(),
    };

    return payment;
  }
}

export async function verifyPayment(txHash: string): Promise<boolean> {
  try {
    const wallet = getCoordinatorWallet();

    if (!wallet.provider) {
      throw new Error("Wallet provider not initialized");
    }

    const receipt = await wallet.provider.getTransactionReceipt(txHash);

    if (!receipt) {
      console.log(`[Payment] Transaction ${txHash} not found`);
      return false;
    }

    const confirmed = receipt.status === 1;
    console.log(`[Payment] Transaction ${txHash} status: ${confirmed ? "confirmed" : "failed"}`);

    return confirmed;
  } catch (error) {
    console.error(`[Payment] Error verifying tx ${txHash}:`, error);
    return false;
  }
}

export async function settleViaAP2(
  paymentId: string
): Promise<{ settled: boolean; settlementId: string }> {
  // TODO: Implement AP2 agent-to-agent settlement protocol
  // For now, just log the settlement intent
  console.log(`[Payment] AP2 settlement logged for payment: ${paymentId}`);

  return {
    settled: true,
    settlementId: crypto.randomUUID(),
  };
}
