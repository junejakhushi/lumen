#!/usr/bin/env node
/**
 * Seed script for Lumen demo deployment.
 *
 * Creates:
 * - 3 demo access codes (expiring in 48 hours)
 * - Today's gold rate
 * - An atelier passcode hash (printed, set as ATELIER_PASSCODE_HASH env var)
 *
 * Usage:
 *   DATABASE_URL=... node scripts/seed.mjs
 *
 * For the access codes, set DEV_ACCESS_CODE=<code> in env as a fallback
 * when the DB isn't available.
 */

import pg from "pg";
import argon2 from "argon2";

const CONNECTION = process.env.DATABASE_URL;

const DEMO_CODES = ["LUMEN1", "LUMEN2", "LUMEN3"];
const GOLD_RATE_24K = 7200; // ₹/g — approximate demo rate
const EXPIRY_HOURS = 48;

async function main() {
  if (!CONNECTION) {
    console.log("No DATABASE_URL set. Printing demo values for manual setup:\n");
    console.log("Demo access codes:", DEMO_CODES.join(", "));
    console.log("Set DEV_ACCESS_CODE=LUMEN1 in your .env for local dev.\n");
    console.log(`Gold rate (24K): ₹${GOLD_RATE_24K}/g`);
    console.log("\nTo generate an atelier passcode hash:");
    console.log('  node -e "require(\'argon2\').hash(process.argv[1]).then(console.log)" <passcode>');
    console.log("Then set ATELIER_PASSCODE_HASH=<hash> in env.\n");
    return;
  }

  const client = new pg.Client({ connectionString: CONNECTION });
  await client.connect();

  try {
    // 1. Create demo access codes
    console.log("Creating demo access codes...");
    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

    for (const code of DEMO_CODES) {
      // argon2, because /api/gate verifies with argon2.verify — a sha256 hash here would
      // mean the code silently never works.
      const hash = await argon2.hash(code);

      await client.query(
        `INSERT INTO access_codes (hash, label, expires_at, revoked)
         VALUES ($1, $2, $3, false)
         ON CONFLICT DO NOTHING`,
        [hash, `Demo code: ${code}`, expiresAt]
      );
      console.log(`  ✓ ${code} (expires ${expiresAt.toISOString()})`);
    }

    // 2. Set today's gold rate
    console.log("\nSetting gold rate...");
    await client.query(
      `INSERT INTO gold_rates (time, rate24, pt, set_by)
       VALUES (now(), $1, $2, 'seed')`,
      [GOLD_RATE_24K, 3200] // Pt rate
    );
    console.log(`  ✓ 24K: ₹${GOLD_RATE_24K}/g, Pt: ₹3200/g`);

    // 3. Print summary
    console.log("\n--- Seed complete ---");
    console.log(`Access codes: ${DEMO_CODES.join(", ")}`);
    console.log(`Codes expire: ${expiresAt.toISOString()}`);
    console.log(`Gold rate: ₹${GOLD_RATE_24K}/g (24K)`);
    console.log("\nSet these env vars:");
    console.log(`  DEV_ACCESS_CODE=${DEMO_CODES[0]}`);
    console.log("  ATELIER_PASSCODE_HASH=<argon2 hash of your atelier passcode>");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
