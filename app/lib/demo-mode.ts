/**
 * Demo mode: a way in when nothing at all has been configured.
 *
 * A deployment with no DATABASE_URL, no DEV_ACCESS_CODE and no ATELIER_PASSCODE_HASH has no
 * client data, no pieces and no bookings, so there is nothing for the gate to protect — but
 * without a code there is also no way to see whether the deployment works. In that state, and
 * only that state, two fixed codes are accepted.
 *
 * Setting any of those three variables turns this off for good.
 */

export const DEMO_CLIENT_CODE = "LUMEN";
export const DEMO_ATELIER_CODE = "ATELIER";

export function isUnconfigured(): boolean {
  return (
    !process.env.DATABASE_URL &&
    !process.env.DEV_ACCESS_CODE &&
    !process.env.ATELIER_PASSCODE_HASH
  );
}

export type DemoRole = "client" | "atelier";

/** Which side a code opens in demo mode, or null when demo mode does not apply. */
export function demoRoleFor(code: string): DemoRole | null {
  if (!isUnconfigured()) return null;
  const submitted = code.trim().toUpperCase();
  if (submitted === DEMO_CLIENT_CODE) return "client";
  if (submitted === DEMO_ATELIER_CODE) return "atelier";
  return null;
}
