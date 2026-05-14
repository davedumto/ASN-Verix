import { NextRequest, NextResponse } from "next/server";
import { getSessionId, setSessionCookie } from "@/lib/auth";

/**
 * GET /api/session
 *
 * Returns the caller's session ID, creating one if none exists.
 * The session is persisted in an httpOnly cookie (asn_session) and also
 * returned in the JSON body so the frontend can cache it in localStorage.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const existing = getSessionId(request);
  const sessionId = existing ?? crypto.randomUUID();

  const response = NextResponse.json({ sessionId });

  if (!existing) {
    setSessionCookie(response, sessionId);
  }

  return response;
}
