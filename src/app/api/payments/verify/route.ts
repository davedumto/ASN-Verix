import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash } = body;

    if (!txHash) {
      return NextResponse.json(
        { error: "txHash is required" },
        { status: 400 }
      );
    }

    // TODO: Verify transaction on SKALE chain
    return NextResponse.json({
      txHash,
      verified: true,
      blockNumber: 12345,
      network: "skale-testnet",
    });
  } catch (error) {
    console.error("Verification failed:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
