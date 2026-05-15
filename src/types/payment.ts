export interface Payment {
  id: string;
  taskId: string;
  specialistId: string;
  amount: number;
  currency: "USDC";
  txHash?: string;
  blockNumber?: number;
  from?: string;
  to?: string;
  status: "pending" | "confirmed" | "failed";
  protocol: "trustless_work" | "stellar" | "x402" | "ap2";
  createdAt: string;
  confirmedAt?: string;
}

export interface WalletBalance {
  address: string;
  balance: number;
  network: string;
  assetCode?: string;
  assetIssuer?: string;
  nativeBalance?: number;
  nativeAssetCode?: "XLM";
  hasConfiguredAsset?: boolean;
  hasAnyRequestedAsset?: boolean;
  availableAssets?: Array<{
    assetCode: string;
    assetIssuer?: string;
    balance: number;
    isConfiguredAsset: boolean;
  }>;
  source?: "connected-wallet" | "coordinator";
  error?: string;
}
