import { describe, expect, it } from "vitest";
import { computePrice, formatPrice, formatPriceRange, TAX_PCT } from "@/lib/pricing";
import { cmToIn, formatWristIn, inToCm, toQuarterInch } from "@/lib/units";
import { formatRange } from "@/lib/pdf/DesignBrief";

describe("money reads as dollars", () => {
  it("writes whole dollars with thousands separators", () => {
    expect(formatPrice(2360)).toBe("$2,360");
    expect(formatPrice(999)).toBe("$999");
    // A computed line is fractional; it must not print as $3,342.807.
    expect(formatPrice(3342.807)).toBe("$3,343");
  });

  it("never falls back to lakh notation on a large figure", () => {
    const big = formatPrice(1_250_000);
    expect(big).toBe("$1,250,000");
    expect(big).not.toContain("L");
    expect(big).not.toContain("₹");
  });

  it("writes a range as two dollar figures", () => {
    expect(formatPriceRange(2040, 2360)).toBe("$2,040–$2,360");
  });

  it("formats the brief's own range in dollars", () => {
    expect(formatRange(2040, 2360)).toBe("$2,040–2,360");
    expect(formatRange(2040, 2360)).not.toContain("₹");
  });
});

describe("computePrice", () => {
  const price = computePrice({
    weight_g: 10,
    metal: "yellow",
    karat: "18",
    rate24_per_g: 85,
    stones: [],
  });

  it("prices gold per gram at the karat's purity", () => {
    expect(price.purity).toBeCloseTo(0.75, 5);
    expect(price.rate_per_g).toBeCloseTo(63.75, 5);
    expect(price.metal_value).toBeCloseTo(637.5, 5);
  });

  it("applies sales tax rather than GST", () => {
    expect(price.tax_pct).toBe(TAX_PCT);
    expect(price.tax).toBeCloseTo(price.subtotal * TAX_PCT, 5);
    expect(price).not.toHaveProperty("gst");
  });

  it("rounds the total to the nearest ten dollars", () => {
    expect(price.total % 10).toBe(0);
    expect(Math.abs(price.total - (price.subtotal + price.tax))).toBeLessThanOrEqual(5);
  });
});

describe("wrist sizes in inches", () => {
  it("converts both ways", () => {
    expect(cmToIn(2.54)).toBeCloseTo(1, 10);
    expect(inToCm(1)).toBeCloseTo(2.54, 10);
    expect(cmToIn(inToCm(6.75))).toBeCloseTo(6.75, 10);
  });

  it("lands on quarter inches, as a tape is read", () => {
    expect(toQuarterInch(6.31)).toBe(6.25);
    expect(toQuarterInch(6.4)).toBe(6.5);
  });

  it("writes a wrist without a trailing zero", () => {
    expect(formatWristIn(16)).toBe("6.25 in");
    expect(formatWristIn(inToCm(7))).toBe("7 in");
  });
});
