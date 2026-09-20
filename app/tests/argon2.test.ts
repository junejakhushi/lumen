import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/argon2";

/**
 * The WASM implementation has to accept hashes the native `argon2` package produced, since
 * they are already sitting in the database and in ATELIER_PASSCODE_HASH.
 */

// Produced by `argon2.hash("ATELIER2026")` with the node-argon2 package.
const NATIVE_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$OcKRk/jLifrchfFx6LYFvg$hdaHm/80P3t2Hl3yo3Xkfo2s3BjOhW7lUbA7Ym9/z5w";

describe("argon2 through wasm", () => {
  it("verifies a hash made by the native package", async () => {
    expect(await verifyPassword(NATIVE_HASH, "ATELIER2026")).toBe(true);
  });

  it("rejects the wrong passcode", async () => {
    expect(await verifyPassword(NATIVE_HASH, "atelier2027")).toBe(false);
    expect(await verifyPassword(NATIVE_HASH, "")).toBe(false);
  });

  it("round-trips its own hashes", async () => {
    const hash = await hashPassword("a quiet viewing");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "a quiet viewing")).toBe(true);
    expect(await verifyPassword(hash, "a quiet viewin")).toBe(false);
  });

  it("gives every hash its own salt", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
});
