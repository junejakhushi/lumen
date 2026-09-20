import { argon2id, argon2Verify } from "hash-wasm";

/**
 * Argon2 through WebAssembly rather than a native module.
 *
 * The `argon2` package needs a compiled binary for the exact Node ABI it runs on, and there
 * is none for Node 24 — on a serverless host it simply fails to load, which made every
 * access code look wrong. WASM runs the same everywhere, and the hashes are ordinary PHC
 * strings, so ones already in the database keep verifying.
 */

const SALT_BYTES = 16;
const PARAMS = { parallelism: 4, iterations: 3, memorySize: 65536, hashLength: 32 } as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  return argon2id({ password, salt, ...PARAMS, outputType: "encoded" });
}

/** False for a wrong password; throws only if the hash itself is unreadable. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (!hash || !password) return false;
  return argon2Verify({ password, hash });
}
