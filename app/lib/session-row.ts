import { randomUUID } from "node:crypto";

/**
 * A try-on session (SPEC §5.8): one row per visit, referenced by every event and quote so a
 * Session Report can be built from them. Anonymous — an id and a device class, nothing more.
 */

export function deviceClass(userAgent: string | null): string {
  const ua = (userAgent ?? "").toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/iphone|android|mobile/.test(ua)) return "phone";
  if (!ua) return "unknown";
  return "desktop";
}

/** Create the session row; returns the id to keep in the cookie, or null without a database. */
export async function startSession(
  userAgent: string | null,
  accessCodeId: string | null
): Promise<string | null> {
  const id = randomUUID();
  if (!process.env.DATABASE_URL) return id;
  try {
    const { query } = await import("@/lib/db");
    const isUuid = accessCodeId && /^[0-9a-f-]{36}$/i.test(accessCodeId);
    await query(
      `INSERT INTO sessions (id, started_at, device, access_code_id)
       VALUES ($1, now(), $2, $3)`,
      [id, deviceClass(userAgent), isUuid ? accessCodeId : null]
    );
    return id;
  } catch (err) {
    console.error("[session] could not start", err);
    return id;
  }
}
