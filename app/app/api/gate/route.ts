import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { startSession } from "@/lib/session-row";
import { demoRoleFor } from "@/lib/demo-mode";
import { z } from "zod";

const bodySchema = z.object({
  code: z.string().min(1).max(64),
});

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit check
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many tries for now. Please wait ${limit.retryAfterSeconds} seconds, then try again.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
        },
      }
    );
  }

  // Parse body
  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    body = bodySchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Enter your access code to continue." },
      { status: 400 }
    );
  }

  const submittedCode = body.code;

  // --- Unconfigured deployment: let someone in to see that it runs (lib/demo-mode) ---
  const demoRole = demoRoleFor(submittedCode);
  if (demoRole) {
    console.warn(
      `[gate] demo mode: accepted the built-in ${demoRole} code. This deployment has no ` +
        "DATABASE_URL, DEV_ACCESS_CODE or ATELIER_PASSCODE_HASH; set any of them to turn it off."
    );
    const response = NextResponse.json({ ok: true, demo: true });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    session.accessCodeId = "demo";
    session.isAtelier = demoRole === "atelier";
    session.createdAt = Date.now();
    await session.save();
    return response;
  }

  // --- Check atelier passcode (env-based, argon2) ---
  const atelierHash = process.env.ATELIER_PASSCODE_HASH;
  if (atelierHash) {
    try {
      // Dynamic import to avoid issues when argon2 isn't installed
      const argon2 = await import("argon2");
      const isAtelier = await argon2.verify(atelierHash, submittedCode);
      if (isAtelier) {
        const response = NextResponse.json({ ok: true });
        const session = await getIronSession<SessionData>(
          request,
          response,
          sessionOptions
        );
        session.accessCodeId = "atelier";
        session.isAtelier = true;
        session.createdAt = Date.now();
        await session.save();
        return response;
      }
    } catch {
      // argon2 not available or verify failed — continue to DB check
    }
  }

  // --- DEV fallback: env-based access code (no DB required) ---
  const devCode = process.env.DEV_ACCESS_CODE;
  if (devCode && submittedCode.toLowerCase() === devCode.toLowerCase()) {
    const response = NextResponse.json({ ok: true });
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );
    session.accessCodeId = "dev";
    session.isAtelier = false;
    session.createdAt = Date.now();
    session.sid = (await startSession(request.headers.get("user-agent"), null)) ?? undefined;
    await session.save();
    return response;
  }

  // --- DB-based access code check ---
  if (process.env.DATABASE_URL) {
    try {
      const { query } = await import("@/lib/db");
      const rows = await query<{
        id: string;
        hash: string;
      }>(
        `SELECT id, hash FROM access_codes
         WHERE revoked = false
           AND (expires_at IS NULL OR expires_at > now())
         ORDER BY created_at DESC
         LIMIT 20`
      );

      const argon2 = await import("argon2");
      for (const row of rows) {
        try {
          const valid = await argon2.verify(row.hash, submittedCode);
          if (valid) {
            const response = NextResponse.json({ ok: true });
            const session = await getIronSession<SessionData>(
              request,
              response,
              sessionOptions
            );
            session.accessCodeId = row.id;
            session.isAtelier = false;
            session.createdAt = Date.now();
            session.sid =
              (await startSession(request.headers.get("user-agent"), row.id)) ?? undefined;
            await session.save();
            return response;
          }
        } catch {
          // Individual verify failure, try next
        }
      }
    } catch {
      // DB not available — fall through to error
    }
  }

  return NextResponse.json(
    {
      error:
        "That code doesn't match an invitation. Check the letters and try again.",
    },
    { status: 401 }
  );
}
