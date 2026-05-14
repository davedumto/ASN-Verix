import { NextRequest, NextResponse } from "next/server";
import {
  getAllSpecialists,
  registerSpecialist,
  removeSpecialist,
  updateSpecialist,
} from "@/services/discovery";
import { ProofPolicy } from "@/types/specialist";
import { encrypt, maskApiKey } from "@/lib/encryption";
import {
  canMutate,
  forbiddenResponse,
  getSessionId,
  setSessionCookie,
  unauthorizedResponse,
} from "@/lib/auth";

const VALID_PROOF_POLICIES: ProofPolicy[] = ["trace-only", "receipt-proof", "escrow-eligible"];

function toProofPolicy(raw: string | undefined): ProofPolicy {
  if (raw && VALID_PROOF_POLICIES.includes(raw as ProofPolicy)) {
    return raw as ProofPolicy;
  }
  return "trace-only";
}

export async function GET() {
  const specialists = await getAllSpecialists();

  // Strip encrypted API keys — only send masked version to client
  const safe = specialists.map((s) => ({
    ...s,
    apiKey: undefined,
    apiKeyMasked: s.apiKeyMasked || undefined,
    // Omit ownerId from client responses (server-side ownership detail)
    ownerId: undefined,
  }));

  return NextResponse.json(safe);
}

export async function POST(request: NextRequest) {
  try {
    // Require a session to register a new specialist
    const existingSession = getSessionId(request);
    const sessionId = existingSession ?? crypto.randomUUID();

    const body = await request.json();
    const { name, description, capabilities, priceUsdc, walletAddress, aiModel, apiKey, proofPolicy } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    const parsedPrice = parseFloat(priceUsdc);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "Invalid price — must be a non-negative number" },
        { status: 400 }
      );
    }

    const walletAddr = walletAddress?.trim() || "0x0000000000000000000000000000000000000000";
    if (walletAddress && !/^0x[0-9a-fA-F]{40}$/.test(walletAddr)) {
      return NextResponse.json(
        { error: "Invalid wallet address — must be a 0x-prefixed 20-byte hex address" },
        { status: 400 }
      );
    }

    const specialist = {
      id: `specialist_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
      name,
      description,
      endpoint: `/api/specialists/${name.toLowerCase().replace(/\s+/g, "-")}/execute`,
      walletAddress: walletAddr,
      capabilities: Array.isArray(capabilities)
        ? capabilities
        : (capabilities || "").split(",").map((c: string) => c.trim()).filter(Boolean),
      priceUsdc: parsedPrice || 0.5,
      reputation: 50,
      totalJobs: 0,
      status: "online" as const,
      aiModel: aiModel === "claude" ? ("claude" as const) : ("openai" as const),
      apiKey: apiKey ? encrypt(apiKey) : undefined,
      apiKeyMasked: apiKey ? maskApiKey(apiKey) : undefined,
      proofPolicy: toProofPolicy(proofPolicy),
      currentVersion: 1,
    };

    const registered = await registerSpecialist(specialist, sessionId);
    console.log(`[API] Registered specialist: ${specialist.name} (session: ${sessionId})`);

    const response = NextResponse.json(
      { ...registered, apiKey: undefined, ownerId: undefined },
      { status: 201 }
    );

    if (!existingSession) {
      setSessionCookie(response, sessionId);
    }

    return response;
  } catch (error) {
    console.error("[API] Error registering specialist:", error);
    return NextResponse.json(
      { error: "Failed to register specialist" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/specialists?id=xxx
 *
 * Partially update a specialist the caller owns.
 * Only mutable fields are accepted; name and ownerId are immutable.
 * Changing price, wallet, capabilities, proofPolicy, or aiModel creates a
 * new immutable AgentVersion snapshot.
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const sessionId = getSessionId(request);
    if (!sessionId && !request.headers.get("x-admin-token")) {
      return unauthorizedResponse("A session is required to update specialists");
    }

    const body = await request.json();
    const { description, capabilities, priceUsdc, walletAddress, aiModel, proofPolicy, apiKey } = body;

    // Validate fields that are present
    if (priceUsdc !== undefined) {
      const parsed = parseFloat(priceUsdc);
      if (isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: "Invalid price — must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    if (walletAddress !== undefined && walletAddress !== "") {
      if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
        return NextResponse.json(
          { error: "Invalid wallet address — must be a 0x-prefixed 20-byte hex address" },
          { status: 400 }
        );
      }
    }

    if (capabilities !== undefined) {
      const caps = Array.isArray(capabilities)
        ? capabilities
        : String(capabilities).split(",").map((c: string) => c.trim()).filter(Boolean);
      if (caps.length === 0) {
        return NextResponse.json(
          { error: "At least one capability is required" },
          { status: 400 }
        );
      }
    }

    const VALID_POLICIES: ProofPolicy[] = ["trace-only", "receipt-proof", "escrow-eligible"];
    if (proofPolicy !== undefined && !VALID_POLICIES.includes(proofPolicy as ProofPolicy)) {
      return NextResponse.json(
        { error: `Invalid proof policy — must be one of: ${VALID_POLICIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Look up existing to check ownership
    const { specialist: existing, ownerId } = await updateSpecialist(id, {}); // dry read
    if (!existing) {
      return NextResponse.json({ error: "Specialist not found" }, { status: 404 });
    }
    if (!canMutate(request, ownerId)) {
      return forbiddenResponse("You can only update specialists you registered");
    }

    // Build the update payload
    const fields: Parameters<typeof updateSpecialist>[1] = {};
    if (description !== undefined) fields.description = description;
    if (priceUsdc !== undefined) fields.priceUsdc = parseFloat(priceUsdc);
    if (walletAddress !== undefined) fields.walletAddress = walletAddress || "0x0000000000000000000000000000000000000000";
    if (proofPolicy !== undefined) fields.proofPolicy = proofPolicy as ProofPolicy;
    if (aiModel !== undefined) fields.aiModel = aiModel === "claude" ? "claude" : "openai";
    if (capabilities !== undefined) {
      fields.capabilities = Array.isArray(capabilities)
        ? capabilities
        : String(capabilities).split(",").map((c: string) => c.trim()).filter(Boolean);
    }
    if (apiKey !== undefined && apiKey !== "") {
      fields.apiKey = encrypt(apiKey);
      fields.apiKeyMasked = maskApiKey(apiKey);
    }

    const { specialist: updated } = await updateSpecialist(id, fields);

    console.log(`[API] Updated specialist: ${id}`);
    return NextResponse.json({ ...updated, apiKey: undefined, ownerId: undefined });
  } catch (error) {
    console.error("[API] Error updating specialist:", error);
    return NextResponse.json(
      { error: "Failed to update specialist" },
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

    // Require a session
    const sessionId = getSessionId(request);
    if (!sessionId && !request.headers.get("x-admin-token")) {
      return unauthorizedResponse("A session is required to remove specialists");
    }

    const result = await removeSpecialist(id);
    if (!result.found) {
      return NextResponse.json({ error: "Specialist not found" }, { status: 404 });
    }

    // Check ownership
    if (!canMutate(request, result.ownerId)) {
      return forbiddenResponse("You can only remove specialists you registered");
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
