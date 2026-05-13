import { NextRequest, NextResponse } from "next/server";
import { verifyPayment } from "@/services/payment";

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

    const verified = await verifyPayment(txHash);

    return NextResponse.json({
      txHash,
      verified,
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
