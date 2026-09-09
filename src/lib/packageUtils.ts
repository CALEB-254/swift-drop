/**
 * Pure package helpers (no Supabase / React) so they can be unit tested.
 */
import { DELIVERY_PRICING, DeliveryType } from "@/types/delivery";

/** Alphabet without look-alike characters (no I, O, 0, 1). */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Cryptographically random suffix so tracking numbers cannot be guessed. */
const randomSuffix = (length = 10) => {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
};

/** Tracking number format: SWF-<AGENT_PREFIX>-XXXXXXXXXX (high-entropy suffix). */
export const generateTrackingNumber = (agentCode: string = "D01") => {
  const safe =
    (agentCode || "D01").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "D01";
  return `SWF-${safe}-${randomSuffix()}`;
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
