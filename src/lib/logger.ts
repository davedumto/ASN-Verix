import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<Record<string, string>> };
type Handler<C = void> = (
  req: NextRequest,
  ctx: C
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Next.js App Router route handler with:
 *  - Incoming log:  [API] → METHOD /path
 *  - Outgoing log:  [API] ← METHOD /path STATUS (Xms)
 *  - Error log:     [API] ✗ METHOD /path (Xms) <full error message + stack>
 *
 * Usage:
 *   export const GET = withLogging(async (req) => { ... });
 */
export function withLogging<C = RouteContext>(handler: Handler<C>): Handler<C> {
  return async (req: NextRequest, ctx: C) => {
    const label = `${req.method} ${req.nextUrl.pathname}`;
    const start = Date.now();
    console.log(`[API] → ${label}`);
    try {
      const res = await handler(req, ctx);
      console.log(`[API] ← ${label} ${res.status} (${Date.now() - start}ms)`);
      return res;
    } catch (err) {
      const ms = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error(`[API] ✗ ${label} (${ms}ms): ${message}`);
      if (stack) console.error(stack);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/** Log a named operation's result and duration — use inside route handlers. */
export function logOp(name: string, start: number, ok = true, detail?: string) {
  const ms = Date.now() - start;
  const icon = ok ? "✓" : "✗";
  console.log(`[API]   ${icon} ${name} (${ms}ms)${detail ? ` — ${detail}` : ""}`);
}
