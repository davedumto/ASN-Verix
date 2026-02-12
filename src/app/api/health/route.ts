import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      coordinator: "online",
      discovery: "online",
      payment: "online",
      reputation: "online",
    },
  });
}
