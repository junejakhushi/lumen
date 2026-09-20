import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests run against a real dev server with no database and no Spaces bucket: the app
 * falls back to the pipeline's manifests, which is how the review tool is used on a laptop.
 *
 * Approving a piece writes the review back into its manifest, so the tests work on a throwaway
 * copy of `private/assets_out` rather than the real pipeline output.
 */

const SOURCE_ASSETS = resolve(__dirname, "..", "private", "assets_out");
const E2E_ASSETS = resolve(__dirname, ".e2e-assets");

if (existsSync(SOURCE_ASSETS)) {
  rmSync(E2E_ASSETS, { recursive: true, force: true });
  cpSync(SOURCE_ASSETS, E2E_ASSETS, { recursive: true });
}

export const E2E = {
  clientCode: "E2ECODE",
  atelierCode: "E2EATELIER",
  assetsDir: E2E_ASSETS,
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100/gate",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NODE_ENV: "development",
      DEV_ACCESS_CODE: E2E.clientCode,
      // argon2 hash of E2E.atelierCode — the atelier passcode path is exercised for real
      ATELIER_PASSCODE_HASH:
        "$argon2id$v=19$m=65536,p=4,t=3$L4Bwtd8LcmT6iEEXWS9uKQ$uk6IYOzsw5aSXTtTIPTmN2kBmv33JPzjb1ho4YKCpg4",
      SESSION_SECRET: "e2e-secret-must-be-at-least-32-chars-long!",
      ASSETS_OUT_DIR: "./.e2e-assets",
      PRIVATE_DIR: "./.e2e-private",
      STUDIO_NAME: "The Atelier",
      // Booking specs need a database; they skip themselves when this is unset.
      ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
    },
  },
});
