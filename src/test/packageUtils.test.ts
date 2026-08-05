import { describe, it, expect } from "vitest";
import { generateTrackingNumber, getCostByType, getCommission } from "@/lib/packageUtils";
import { DELIVERY_PRICING } from "@/types/delivery";

describe("generateTrackingNumber", () => {
  it("uses the SWF-<PREFIX>-#### format", () => {
    expect(generateTrackingNumber("KMB")).toMatch(/^SWF-KMB-\d{4}$/);
  });

  it("uppercases and strips non-alphanumeric characters", () => {
    expect(generateTrackingNumber("ka-b!")).toMatch(/^SWF-KAB-\d{4}$/);
  });

  it("caps the prefix at 4 characters", () => {
    expect(generateTrackingNumber("ABCDEFG")).toMatch(/^SWF-ABCD-\d{4}$/);
  });

  it("falls back to D01 for empty or unusable prefixes", () => {
    expect(generateTrackingNumber("")).toMatch(/^SWF-D01-\d{4}$/);
    expect(generateTrackingNumber("!!!")).toMatch(/^SWF-D01-\d{4}$/);
    expect(generateTrackingNumber()).toMatch(/^SWF-D01-\d{4}$/);
  });

  it("always produces a 4-digit suffix between 1000 and 9999", () => {
    for (let i = 0; i < 50; i++) {
      const n = Number(generateTrackingNumber("D01").split("-")[2]);
      expect(n).toBeGreaterThanOrEqual(1000);
      expect(n).toBeLessThanOrEqual(9999);
    }
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
