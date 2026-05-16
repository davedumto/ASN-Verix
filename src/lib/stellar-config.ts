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

/**
 * Sign a Stellar XDR transaction envelope with a secret key and return the
 * base64-encoded signed XDR, ready to submit via TW's /helper/send-transaction.
 */
export async function signStellarXdr(unsignedXdr: string, secretKey: string): Promise<string> {
  const { TransactionBuilder, Keypair, Networks } = await import("@stellar/stellar-sdk");
  const keypair = Keypair.fromSecret(secretKey);
  const networkPassphrase = env.STELLAR_NETWORK_PASSPHRASE;
  const tx = TransactionBuilder.fromXDR(unsignedXdr, networkPassphrase);
  tx.sign(keypair);
  return tx.toEnvelope().toXDR("base64");
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
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 6000);
  const url = `${STELLAR_CONFIG.horizonUrl.replace(/\/$/, "")}/accounts/${address}`;
  console.log(`[Stellar] fetchStellarAccount → ${url}`);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (res.status === 404) {
      // Account not yet created/funded on this Stellar network — not an error.
      console.log(`[Stellar] account ${address.slice(0, 8)}… not found on network (unfunded)`);
      return { id: address, balances: [] };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Stellar Horizon ${res.status}: ${body.slice(0, 120)}`);
    }

    return res.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Stellar Horizon timed out after 6s (url: ${url})`);
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
