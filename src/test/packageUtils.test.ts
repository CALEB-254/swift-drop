import { describe, it, expect } from "vitest";
import { generateTrackingNumber, getCostByType, getCommission } from "@/lib/packageUtils";
import { DELIVERY_PRICING } from "@/types/delivery";

describe("generateTrackingNumber", () => {
  it("uses the SWF-<PREFIX>-<random> format", () => {
    expect(generateTrackingNumber("KMB")).toMatch(/^SWF-KMB-[2-9A-HJ-NP-Z]{10}$/);
  });

  it("uppercases and strips non-alphanumeric characters", () => {
    expect(generateTrackingNumber("ka-b!")).toMatch(/^SWF-KAB-[2-9A-HJ-NP-Z]{10}$/);
  });

  it("caps the prefix at 4 characters", () => {
    expect(generateTrackingNumber("ABCDEFG")).toMatch(/^SWF-ABCD-[2-9A-HJ-NP-Z]{10}$/);
  });

  it("falls back to D01 for empty or unusable prefixes", () => {
    expect(generateTrackingNumber("")).toMatch(/^SWF-D01-[2-9A-HJ-NP-Z]{10}$/);
    expect(generateTrackingNumber("!!!")).toMatch(/^SWF-D01-[2-9A-HJ-NP-Z]{10}$/);
    expect(generateTrackingNumber()).toMatch(/^SWF-D01-[2-9A-HJ-NP-Z]{10}$/);
  });

  it("produces unique high-entropy suffixes", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(generateTrackingNumber("D01").split("-")[2]);
    }
    expect(seen.size).toBe(200);
  });
});

describe("delivery pricing", () => {
  it("returns the configured cost per delivery type", () => {
    expect(getCostByType("pickup_point")).toBe(DELIVERY_PRICING.pickupPointCost);
    expect(getCostByType("doorstep")).toBe(DELIVERY_PRICING.doorstepCost);
    expect(getCostByType("errand")).toBe(DELIVERY_PRICING.errandCost);
  });

  it("defaults unknown types to the pickup point cost", () => {
    // @ts-expect-error deliberately invalid type
    expect(getCostByType("unknown")).toBe(DELIVERY_PRICING.pickupPointCost);
  });

  it("computes a 15% commission", () => {
    expect(DELIVERY_PRICING.commissionRate).toBe(0.15);
    expect(getCommission(120)).toBeCloseTo(18);
    expect(getCommission(250)).toBeCloseTo(37.5);
    expect(getCommission(getCostByType("errand"))).toBeCloseTo(10.5);
    expect(getCommission(0)).toBe(0);
  });
});
