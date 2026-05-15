import { NextRequest, NextResponse } from "next/server";
import { getCoordinatorAddress, getStellarWalletBalanceInfo } from "@/lib/wallet";
import { isStellarPublicKey } from "@/lib/stellar-config";

export async function GET(request: NextRequest) {
  console.log("[wallet] GET /api/wallet/balance — start");
  const { searchParams } = new URL(request.url);
  const requestedAddress = searchParams.get("address");
  const hasUserAddress = isStellarPublicKey(requestedAddress);
  let address = hasUserAddress ? requestedAddress : "Not configured";

  try {
    address = hasUserAddress ? requestedAddress : getCoordinatorAddress();
    console.log(`[wallet] fetching Stellar balance for ${address}`);

    const balanceInfo = await getStellarWalletBalanceInfo(address);
    console.log(`[wallet] ok — USDC=${balanceInfo.balance} XLM=${balanceInfo.nativeBalance}`);

    return NextResponse.json({
      balance: parseFloat(balanceInfo.balance),
      address,
      network: "stellar-testnet",
      assetCode: balanceInfo.assetCode,
      assetIssuer: balanceInfo.assetIssuer,
      nativeBalance: parseFloat(balanceInfo.nativeBalance),
      nativeAssetCode: balanceInfo.nativeAssetCode,
      hasConfiguredAsset: balanceInfo.hasConfiguredAsset,
      hasAnyRequestedAsset: balanceInfo.hasAnyRequestedAsset,
      availableAssets: balanceInfo.availableAssets.map((asset) => ({
        ...asset,
        balance: parseFloat(asset.balance),
      })),
      source: hasUserAddress ? "connected-wallet" : "coordinator",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[wallet] error for ${address}: ${message}`);
    if (error instanceof Error) console.error(error.stack);

    return NextResponse.json({
      balance: 0,
      address,
      network: "stellar-testnet",
      assetCode: "USDC",
      nativeBalance: 0,
      nativeAssetCode: "XLM",
      hasConfiguredAsset: false,
      hasAnyRequestedAsset: false,
      availableAssets: [],
      source: hasUserAddress ? "connected-wallet" : "coordinator",
      error: message,
    });
  }
}
