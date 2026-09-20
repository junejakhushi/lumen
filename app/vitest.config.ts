import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    testTimeout: 30_000,
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
