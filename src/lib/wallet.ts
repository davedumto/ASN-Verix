import {
  fetchStellarAccount,
  isConfiguredStellarAsset,
  isStellarPublicKey,
  STELLAR_USDC,
} from "@/lib/stellar-config";
import { env } from "@/lib/env";

/**
 * Coordinator wallet identity for Stellar/Soroban integrations.
 *
 * Trustless Work release/approval calls operate with Stellar addresses. We keep
 * this intentionally public-key based; signing is handled by wallets or by the
 * Trustless Work helper flow, not by an EVM private key in this app process.
 */
export function getCoordinatorAddress(): string {
  const address = env.COORDINATOR_STELLAR_PUBLIC_KEY ?? env.TRUSTLESS_WORK_SIGNER_ADDRESS;
  if (!isStellarPublicKey(address)) {
    throw new Error("COORDINATOR_STELLAR_PUBLIC_KEY must be a Stellar public key (G...).");
  }
  return address;
}

/**
 * Fetch coordinator USDC balance from Stellar Horizon.
 *
 * If STELLAR_USDC_ISSUER is not configured, this falls back to native XLM so
 * the dashboard can still show that the wallet is reachable during local setup.
 */
export async function getCoordinatorUSDCBalance(): Promise<string> {
  const address = getCoordinatorAddress();
  const account = await fetchStellarAccount(address);

  if (isConfiguredStellarAsset()) {
    const usdc = account.balances.find(
      (b) =>
        b.asset_code === STELLAR_USDC.code &&
        b.asset_issuer === STELLAR_USDC.issuer
    );
    return usdc?.balance ?? "0";
  }

  const native = account.balances.find((b) => b.asset_type === "native");
  return native?.balance ?? "0";
}

export function generateMockWallet(): { address: string; privateKey: string } {
  return {
    address: "G" + "A".repeat(55),
    privateKey: "stellar-signing-is-wallet-managed",
  };
}
