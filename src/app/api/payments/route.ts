import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { taskId, specialistId, amount } = body;

    if (!taskId || !specialistId || !amount) {
      return NextResponse.json(
        { error: "taskId, specialistId, and amount are required" },
        { status: 400 }
      );
    }

    // TODO: Implement x402 payment flow on SKALE
    const payment = {
      id: crypto.randomUUID(),
      taskId,
      specialistId,
      amount,
      currency: "USDC",
      txHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
      status: "confirmed",
      protocol: "x402",
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Payment failed:", error);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}
