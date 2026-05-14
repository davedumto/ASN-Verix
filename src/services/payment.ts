import { Payment } from "@/types/payment";
import { ethers } from "ethers";
import { getCoordinatorWallet } from "@/lib/wallet";
import { getUSDCContract, parseUSDC, formatUSDC, withRpcFailover } from "@/lib/blockchain-config";
import { prisma } from "@/lib/db";
import { getSpecialistByName } from "@/services/discovery";
import { env } from "@/lib/env";

/**
 * Map specialist name to their wallet address by deriving it from the private key in env vars.
 */
function getSpecialistAddressFromPrivateKey(specialistName: string): string | undefined {
  const keyMap: Record<string, string | undefined> = {
    CodeAuditor: env.CODE_AUDITOR_PRIVATE_KEY,
    MarketAnalyst: env.MARKET_ANALYST_PRIVATE_KEY,
    CreativeWriter: env.CREATIVE_WRITER_PRIVATE_KEY,
  };

  const privateKey = keyMap[specialistName];
  if (!privateKey) return undefined;

  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}

async function persistPayment(payment: Payment, dbSpecialistId?: string): Promise<void> {
  if (!dbSpecialistId) return;

  try {
    await prisma.payment.upsert({
      where: { id: payment.id },
      create: {
        id: payment.id,
        taskId: payment.taskId,
        specialistId: dbSpecialistId,
        amount: payment.amount,
        currency: payment.currency,
        txHash: payment.txHash,
        blockNumber: payment.blockNumber,
        fromAddress: payment.from,
        toAddress: payment.to,
        status: payment.status,
        protocol: payment.protocol,
        createdAt: new Date(payment.createdAt),
        confirmedAt: payment.confirmedAt ? new Date(payment.confirmedAt) : null,
      },
      update: {
        amount: payment.amount,
        currency: payment.currency,
        txHash: payment.txHash,
        blockNumber: payment.blockNumber,
        fromAddress: payment.from,
        toAddress: payment.to,
        status: payment.status,
        protocol: payment.protocol,
        confirmedAt: payment.confirmedAt ? new Date(payment.confirmedAt) : null,
      },
    });
  } catch (error) {
    console.error(`[Payment] Failed to persist payment ${payment.id}:`, error);
  }
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
  const specialist = await getSpecialistByName(specialistId);
  const dbSpecialistId = specialist?.id;

  try {
    const specialistAddress = getSpecialistAddressFromPrivateKey(specialistId)
      ?? specialist?.walletAddress;

    if (!specialistAddress || specialistAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`No payout wallet configured for specialist: ${specialistId}`);
    }

    // Use RPC failover for the actual blockchain operations
    const result = await withRpcFailover(async (provider) => {
      const wallet = getCoordinatorWallet(provider);
      const usdcContract = getUSDCContract(wallet);

      console.log(`[Payment] From: ${wallet.address}`);
      console.log(`[Payment] To: ${specialistAddress}`);

      // Check coordinator balance
      const balance = await usdcContract.balanceOf(wallet.address);
      const balanceFormatted = formatUSDC(balance);
      console.log(`[Payment] Coordinator USDC balance: $${balanceFormatted}`);

      const amountWei = parseUSDC(amount.toString());

      if (balance < amountWei) {
        throw new Error(
          `Insufficient USDC balance. Need $${amount}, have $${balanceFormatted}`
        );
      }

      // Execute USDC transfer on SKALE
      // Fetch the correct nonce from the chain to avoid stale nonce errors
      const nonce = await provider.getTransactionCount(wallet.address, "latest");
      console.log(`[Payment] Sending ${amount} USDC (nonce: ${nonce})...`);
      const tx = await usdcContract.transfer(specialistAddress, amountWei, { nonce });

      console.log(`[Payment] Transaction submitted: ${tx.hash}`);
      console.log(`[Payment] Waiting for confirmation...`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed on-chain");
      }

      console.log(`[Payment] ✅ Payment confirmed in block ${receipt.blockNumber}`);

      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        from: wallet.address,
      };
    });

    const payment: Payment = {
      id: crypto.randomUUID(),
      taskId,
      specialistId,
      amount,
      currency: "USDC",
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      from: result.from,
      to: specialistAddress,
      status: "confirmed",
      protocol: "x402",
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };

    await persistPayment(payment, dbSpecialistId);
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

    await persistPayment(payment, dbSpecialistId);
    return payment;
  }
}

export async function verifyPayment(txHash: string): Promise<boolean> {
  try {
    return await withRpcFailover(async (provider) => {
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        console.log(`[Payment] Transaction ${txHash} not found`);
        return false;
      }

      const confirmed = receipt.status === 1;
      console.log(`[Payment] Transaction ${txHash} status: ${confirmed ? "confirmed" : "failed"}`);
      return confirmed;
    });
  } catch (error) {
    console.error(`[Payment] Error verifying tx ${txHash}:`, error);
    return false;
  }
}

export async function settleViaAP2(
  paymentId: string
): Promise<{ settled: boolean; settlementId: string }> {
  // TODO: Implement AP2 agent-to-agent settlement protocol
  console.log(`[Payment] AP2 settlement logged for payment: ${paymentId}`);

  return {
    settled: true,
    settlementId: crypto.randomUUID(),
  };
}
