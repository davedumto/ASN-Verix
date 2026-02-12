import { NextResponse } from "next/server";
import { getCoordinatorUSDCBalance, getCoordinatorAddress } from "@/lib/wallet";

export async function GET() {
  try {
    const address = getCoordinatorAddress();
    const balance = await getCoordinatorUSDCBalance();

    return NextResponse.json({
      balance: parseFloat(balance),
      address,
      network: "skale-testnet",
    });
  } catch (error) {
    console.error("[API] Error fetching wallet balance:", error);

    // Return mock balance if wallet not configured
    return NextResponse.json({
      balance: 0,
      address: "Not configured",
      network: "skale-testnet",
      error: error instanceof Error ? error.message : "Wallet not configured"
    });
  }
}
