#!/usr/bin/env node
/**
 * Simple SQL migration runner for Lumen.
 * Reads all .sql files from ../db/migrations/ in order and applies them.
 * Tracks applied migrations in a _migrations table.
 *
 * Usage: DATABASE_URL=... node scripts/migrate.mjs
 */

import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../db/migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Skipping migrations.");
    process.exit(0);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    // Ensure _migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Get already-applied migrations
    const { rows: applied } = await client.query(
      "SELECT name FROM _migrations ORDER BY name"
    );
    const appliedSet = new Set(applied.map((r) => r.name));

    // Read migration files sorted by name
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql") && !f.startsWith("."))
      .sort();

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  skip  ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      console.log(`  apply ${file}...`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        count++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  FAILED ${file}:`, err);
        process.exit(1);
      }
    }

    console.log(
      count > 0 ? `Applied ${count} migration(s).` : "No new migrations."
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
