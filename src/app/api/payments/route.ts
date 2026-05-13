import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPayment } from "@/services/payment";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  const payments = await prisma.payment.findMany({
    where: taskId ? { taskId } : undefined,
    include: {
      specialist: {
        select: {
          id: true,
          name: true,
          walletAddress: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    payments.map((p) => ({
      id: p.id,
      taskId: p.taskId,
      specialistId: p.specialistId,
      specialistName: p.specialist.name,
      amount: Number(p.amount),
      currency: p.currency,
      txHash: p.txHash,
      blockNumber: p.blockNumber,
      from: p.fromAddress,
      to: p.toAddress,
      status: p.status,
      protocol: p.protocol,
      createdAt: p.createdAt.toISOString(),
      confirmedAt: p.confirmedAt?.toISOString(),
    }))
  );
}

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

    const payment = await createPayment(taskId, specialistId, Number(amount));

    return NextResponse.json(payment, {
      status: payment.status === "confirmed" ? 201 : 502,
    });
  } catch (error) {
    console.error("Payment failed:", error);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}
