/**
 * Pure package helpers (no Supabase / React) so they can be unit tested.
 */
import { DELIVERY_PRICING, DeliveryType } from "@/types/delivery";

/** Tracking number format: SWF-<AGENT_PREFIX>-XXXX (4 random digits). */
export const generateTrackingNumber = (agentCode: string = "D01") => {
  const safe =
    (agentCode || "D01").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "D01";
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `SWF-${safe}-${randomNum}`;
};

/** Base delivery cost (KES) for a delivery type. */
export const getCostByType = (type: DeliveryType): number => {
  switch (type) {
    case "pickup_point":
      return DELIVERY_PRICING.pickupPointCost;
    case "doorstep":
      return DELIVERY_PRICING.doorstepCost;
    case "errand":
      return DELIVERY_PRICING.errandCost;
    default:
      return DELIVERY_PRICING.pickupPointCost;
  }
};

/** Agent commission for a given cost (15% of cost). */
export const getCommission = (cost: number): number => cost * DELIVERY_PRICING.commissionRate;
