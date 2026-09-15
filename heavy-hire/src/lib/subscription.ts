import type { SubscriptionTier } from "@prisma/client";

// Maximum active equipment listings per owner subscription tier.
// ENTERPRISE has no cap.
export const LISTING_LIMITS: Record<SubscriptionTier, number> = {
  FREE: 3,
  BASIC: 10,
  PROFESSIONAL: 30,
  ENTERPRISE: Infinity,
};

export function getListingLimit(tier: SubscriptionTier): number {
  return LISTING_LIMITS[tier] ?? LISTING_LIMITS.FREE;
}
