import { NextResponse } from "next/server";
import { getCoordinatorAddress, getStellarWalletBalanceInfo } from "@/lib/wallet";
import { isStellarPublicKey } from "@/lib/stellar-config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedAddress = searchParams.get("address");
    const hasUserAddress = isStellarPublicKey(requestedAddress);

    const address = hasUserAddress ? requestedAddress : getCoordinatorAddress();
    const balanceInfo = await getStellarWalletBalanceInfo(address);

    return NextResponse.json({
      balance: parseFloat(balanceInfo.balance),
      address,
      network: "stellar-testnet",
      assetCode: balanceInfo.assetCode,
      nativeBalance: parseFloat(balanceInfo.nativeBalance),
      nativeAssetCode: balanceInfo.nativeAssetCode,
      hasConfiguredAsset: balanceInfo.hasConfiguredAsset,
      source: hasUserAddress ? "connected-wallet" : "coordinator",
    });
  } catch (error) {
    console.error("[API] Error fetching wallet balance:", error);

    // Return mock balance if wallet not configured
    return NextResponse.json({
      balance: 0,
      address: "Not configured",
      network: "stellar-testnet",
      error: error instanceof Error ? error.message : "Wallet not configured"
    });
  }
}
