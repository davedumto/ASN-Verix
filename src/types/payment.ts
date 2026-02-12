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
  protocol: "x402" | "ap2";
  createdAt: string;
  confirmedAt?: string;
}

export interface WalletBalance {
  address: string;
  balance: number;
  network: string;
}
