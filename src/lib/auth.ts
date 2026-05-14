/**
 * Minimal session-based auth for demo-safe ownership.
 *
 * Sessions are opaque random UUIDs generated on first browser visit and
 * persisted in an httpOnly cookie (`asn_session`). The session ID is also
 * accepted via the `X-Session-Id` request header so the API client can send
 * it explicitly without relying on cookie forwarding.
 *
 * Admin bypass: any request carrying `X-Admin-Token: <ADMIN_SECRET>` is
 * treated as an admin and may mutate any resource regardless of ownership.
 * Set ADMIN_SECRET in your environment; if unset, the admin bypass is
 * disabled.
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "asn_session";
export const SESSION_HEADER = "x-session-id";
export const ADMIN_TOKEN_HEADER = "x-admin-token";

/** Lifetime of the session cookie: 30 days. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Extract the caller's session ID.
 * Reads the X-Session-Id header first (explicit API clients), then falls back
 * to the httpOnly cookie (browser flows).
 */
export function getSessionId(request: NextRequest): string | null {
  return (
    request.headers.get(SESSION_HEADER) ??
    request.cookies.get(SESSION_COOKIE)?.value ??
    null
  );
}

/**
 * True when the request carries a valid admin token.
 * The ADMIN_SECRET env var must be set; an empty secret never matches.
 */
export function isAdminRequest(request: NextRequest): boolean {
  const secret = env.ADMIN_SECRET;
  if (!secret) return false;
  const token = request.headers.get(ADMIN_TOKEN_HEADER);
  return Boolean(token && token === secret);
}

/**
 * Returns true when the caller is allowed to mutate a resource.
 *
 * Rules (in order):
 *  1. Admin token present → always allowed.
 *  2. Resource has no ownerId (legacy/seeded data) → allowed by any authenticated session.
 *  3. Session ID matches ownerId → allowed.
 *  4. Otherwise → denied.
 */
export function canMutate(
  request: NextRequest,
  ownerId: string | undefined | null
): boolean {
  if (isAdminRequest(request)) return true;
  const session = getSessionId(request);
  if (!session) return false;
  if (!ownerId) return true; // unowned resource — any session may mutate
  return session === ownerId;
}

/**
 * Set the session cookie on a response.
 * Call this on the `GET /api/session` endpoint and whenever a new session is
 * issued alongside a mutating response.
 */
export function setSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    // secure: true in production; Next.js sets this automatically in HTTPS
    secure: process.env.NODE_ENV === "production",
  });
}

/** Standard 401 response for missing session. */
export function unauthorizedResponse(message = "Session required"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** Standard 403 response for session present but lacking ownership. */
export function forbiddenResponse(message = "You do not own this resource"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
