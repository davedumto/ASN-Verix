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
  const info = await getStellarWalletBalanceInfo(address);
  return info.balance;
}

/**
 * Fetch a Stellar account balance for the configured USDC asset. If USDC is not
 * configured, return native XLM so the UI can still prove the wallet exists.
 */
export async function getStellarWalletBalance(address: string): Promise<string> {
  const info = await getStellarWalletBalanceInfo(address);
  return info.balance;
}

export async function getStellarWalletBalanceInfo(address: string): Promise<{
  balance: string;
  assetCode: string;
  assetIssuer?: string;
  nativeBalance: string;
  nativeAssetCode: "XLM";
  hasConfiguredAsset: boolean;
  hasAnyRequestedAsset: boolean;
  availableAssets: Array<{
    assetCode: string;
    assetIssuer?: string;
    balance: string;
    isConfiguredAsset: boolean;
  }>;
}> {
  if (!isStellarPublicKey(address)) {
    throw new Error("Wallet address must be a Stellar public key (G...).");
  }

  const account = await fetchStellarAccount(address);
  const native = account.balances.find((b) => b.asset_type === "native");
  const nativeBalance = native?.balance ?? "0";
  const availableAssets = account.balances
    .filter((b) => b.asset_type !== "native" && b.asset_code)
    .map((b) => ({
      assetCode: b.asset_code as string,
      assetIssuer: b.asset_issuer,
      balance: b.balance,
      isConfiguredAsset:
        Boolean(STELLAR_USDC.code && STELLAR_USDC.issuer) &&
        b.asset_code === STELLAR_USDC.code &&
        b.asset_issuer === STELLAR_USDC.issuer,
    }));

  if (isConfiguredStellarAsset()) {
    const usdc = account.balances.find(
      (b) =>
        b.asset_code === STELLAR_USDC.code &&
        b.asset_issuer === STELLAR_USDC.issuer
    );
    const sameCodeAsset = account.balances.find((b) => b.asset_code === STELLAR_USDC.code);
    const displayAsset = usdc ?? sameCodeAsset;

    if (displayAsset) {
      return {
        balance: displayAsset.balance,
        assetCode: displayAsset.asset_code ?? STELLAR_USDC.code ?? "USDC",
        assetIssuer: displayAsset.asset_issuer,
        nativeBalance,
        nativeAssetCode: "XLM",
        hasConfiguredAsset: Boolean(usdc),
        hasAnyRequestedAsset: true,
        availableAssets,
      };
    }

    return {
      balance: "0",
      assetCode: STELLAR_USDC.code ?? "USDC",
      assetIssuer: STELLAR_USDC.issuer,
      nativeBalance,
      nativeAssetCode: "XLM",
      hasConfiguredAsset: false,
      hasAnyRequestedAsset: false,
      availableAssets,
    };
  }

  return {
    balance: nativeBalance,
    assetCode: "XLM",
    nativeBalance,
    nativeAssetCode: "XLM",
    hasConfiguredAsset: true,
    hasAnyRequestedAsset: true,
    availableAssets,
  };
}

export function generateMockWallet(): { address: string; privateKey: string } {
  return {
    address: "G" + "A".repeat(55),
    privateKey: "stellar-signing-is-wallet-managed",
  };
}
