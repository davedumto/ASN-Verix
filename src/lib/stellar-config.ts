import { env } from "@/lib/env";

export const STELLAR_CONFIG = {
  network: env.STELLAR_NETWORK,
  horizonUrl: env.STELLAR_HORIZON_URL,
  sorobanRpcUrl: env.SOROBAN_RPC_URL,
  networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
  explorerBaseUrl: env.STELLAR_EXPLORER_URL,
} as const;

export const STELLAR_USDC = {
  code: env.STELLAR_USDC_CODE,
  issuer: env.STELLAR_USDC_ISSUER,
} as const;

export function isStellarPublicKey(value: string | undefined | null): value is string {
  return typeof value === "string" && /^G[A-Z2-7]{55}$/.test(value);
}

export function isConfiguredStellarAsset(): boolean {
  return Boolean(STELLAR_USDC.code && STELLAR_USDC.issuer);
}

export function stellarAccountExplorerUrl(address: string): string {
  return `${STELLAR_CONFIG.explorerBaseUrl}/account/${address}`;
}

export function stellarTxExplorerUrl(txHash: string): string {
  return `${STELLAR_CONFIG.explorerBaseUrl}/tx/${txHash}`;
}

export async function fetchStellarAccount(address: string): Promise<{
  id: string;
  balances: Array<{
    balance: string;
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
  }>;
}> {
  const url = `${STELLAR_CONFIG.horizonUrl.replace(/\/$/, "")}/accounts/${address}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Stellar Horizon account lookup failed: ${res.status}`);
  }
  return res.json();
}
