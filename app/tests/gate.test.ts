import { afterEach, describe, expect, it } from "vitest";
import { demoRoleFor, isUnconfigured } from "@/lib/demo-mode";

/** Demo mode must never be reachable on a deployment that has been configured. */

const VARS = ["DATABASE_URL", "DEV_ACCESS_CODE", "ATELIER_PASSCODE_HASH"] as const;

afterEach(() => {
  for (const v of VARS) delete process.env[v];
});

describe("demo mode", () => {
  it("lets someone in when nothing at all is configured", () => {
    expect(isUnconfigured()).toBe(true);
    expect(demoRoleFor("LUMEN")).toBe("client");
    expect(demoRoleFor("ATELIER")).toBe("atelier");
    expect(demoRoleFor("lumen")).toBe("client"); // codes are not case-sensitive
    expect(demoRoleFor(" atelier ")).toBe("atelier");
  });

  it("refuses anything else, even unconfigured", () => {
    expect(demoRoleFor("LUMEN1")).toBeNull();
    expect(demoRoleFor("")).toBeNull();
  });

  it.each(VARS)("switches itself off once %s is set", (variable) => {
    process.env[variable] = "something";
    expect(isUnconfigured()).toBe(false);
    expect(demoRoleFor("LUMEN")).toBeNull();
    expect(demoRoleFor("ATELIER")).toBeNull();
  });
});
