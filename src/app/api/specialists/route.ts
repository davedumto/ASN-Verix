import { NextRequest, NextResponse } from "next/server";
import {
  getAllSpecialists,
  registerSpecialist,
  removeSpecialist,
} from "@/services/discovery";
import { encrypt, maskApiKey } from "@/lib/encryption";

export async function GET() {
  const specialists = await getAllSpecialists();

  // Strip encrypted API keys — only send masked version to client
  const safe = specialists.map((s) => ({
    ...s,
    apiKey: undefined,
    apiKeyMasked: s.apiKeyMasked || undefined,
  }));

  return NextResponse.json(safe);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, capabilities, priceUsdc, walletAddress, aiModel, apiKey } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    const specialist = {
      id: `specialist_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
      name,
      description,
      endpoint: `/api/specialists/${name.toLowerCase().replace(/\s+/g, "-")}/execute`,
      walletAddress: walletAddress || "0x0000000000000000000000000000000000000000",
      capabilities: Array.isArray(capabilities)
        ? capabilities
        : (capabilities || "").split(",").map((c: string) => c.trim()).filter(Boolean),
      priceUsdc: parseFloat(priceUsdc) || 0.5,
      reputation: 50,
      totalJobs: 0,
      status: "online" as const,
      aiModel: aiModel === "claude" ? ("claude" as const) : ("openai" as const),
      apiKey: apiKey ? encrypt(apiKey) : undefined,
      apiKeyMasked: apiKey ? maskApiKey(apiKey) : undefined,
    };

    const registered = await registerSpecialist(specialist);
    console.log(`[API] Registered specialist: ${specialist.name} (API key: ${apiKey ? "provided" : "none"})`);

    // Return without the encrypted key
    return NextResponse.json(
      {
        ...registered,
        apiKey: undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] Error registering specialist:", error);
    return NextResponse.json(
      { error: "Failed to register specialist" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const removed = await removeSpecialist(id);
    if (!removed) {
      return NextResponse.json({ error: "Specialist not found" }, { status: 404 });
    }

    console.log(`[API] Removed specialist: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error removing specialist:", error);
    return NextResponse.json(
      { error: "Failed to remove specialist" },
      { status: 500 }
    );
  }
}
