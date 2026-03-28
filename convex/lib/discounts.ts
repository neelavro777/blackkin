import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

type ScopeType = Doc<"salesCampaigns">["scope"]["type"];

// Priority order: most specific wins
const SCOPE_PRIORITY: Record<ScopeType, number> = {
  product: 4,
  tag: 3,
  category: 2,
  storewide: 1,
};

/**
 * Finds all currently active sales campaigns that apply to a given product.
 * Returns them sorted by priority (most specific first).
 */
export async function getApplicableCampaigns(
  ctx: QueryCtx | MutationCtx,
  product: Doc<"products">
): Promise<Doc<"salesCampaigns">[]> {
  const now = Date.now();

  // Query campaigns that are active and not yet expired
  const campaigns = await ctx.db
    .query("salesCampaigns")
    .withIndex("by_isActive", (q) => q.eq("isActive", true))
    .collect();

  const applicable: Doc<"salesCampaigns">[] = [];

  for (const campaign of campaigns) {
    // Check time window
    if (campaign.startTime > now || campaign.endTime < now) continue;

    const scope = campaign.scope;

    if (scope.type === "storewide") {
      applicable.push(campaign);
      continue;
    }

    if (scope.type === "category" && scope.categoryId === product.categoryId) {
      applicable.push(campaign);
      continue;
    }

    if (scope.type === "product" && scope.productId === product._id) {
      applicable.push(campaign);
      continue;
    }

    if (scope.type === "tag") {
      const productTag = await ctx.db
        .query("productTags")
        .withIndex("by_productId_and_tagId", (q) =>
          q.eq("productId", product._id).eq("tagId", scope.tagId)
        )
        .unique();
      if (productTag) {
        applicable.push(campaign);
      }
    }
  }

  // Sort by priority descending (most specific first)
  applicable.sort(
    (a, b) => SCOPE_PRIORITY[b.scope.type] - SCOPE_PRIORITY[a.scope.type]
  );

  return applicable;
}

/**
 * Calculates the discounted price for a product given applicable campaigns.
 * Uses the highest-priority campaign. If same priority, picks highest discount.
 * Price never goes below 0.
 */
export function calculateDiscountedPrice(
  basePrice: number,
  campaigns: Doc<"salesCampaigns">[]
): { discountedPrice: number; discountAmount: number; campaignName: string | null } {
  if (campaigns.length === 0) {
    return { discountedPrice: basePrice, discountAmount: 0, campaignName: null };
  }

  // Get highest priority level
  const maxPriority = Math.max(...campaigns.map((c) => SCOPE_PRIORITY[c.scope.type]));
  const topCampaigns = campaigns.filter(
    (c) => SCOPE_PRIORITY[c.scope.type] === maxPriority
  );

  // Among same priority, find best (highest) discount
  let bestCampaign = topCampaigns[0];
  let bestDiscount = computeDiscount(basePrice, topCampaigns[0]);

  for (let i = 1; i < topCampaigns.length; i++) {
    const d = computeDiscount(basePrice, topCampaigns[i]);
    if (d > bestDiscount) {
      bestDiscount = d;
      bestCampaign = topCampaigns[i];
    }
  }

  const discountAmount = Math.min(bestDiscount, basePrice);
  const discountedPrice = Math.max(0, basePrice - discountAmount);

  return {
    discountedPrice,
    discountAmount,
    campaignName: bestCampaign.name,
  };
}

function computeDiscount(basePrice: number, campaign: Doc<"salesCampaigns">): number {
  if (campaign.discountType === "percentage") {
    return Math.round((basePrice * campaign.discountValue) / 100);
  }
  return campaign.discountValue;
}

/**
 * Convenience: get discounted price for a product, querying campaigns automatically.
 */
export async function getProductDiscountedPrice(
  ctx: QueryCtx | MutationCtx,
  product: Doc<"products">
) {
  const campaigns = await getApplicableCampaigns(ctx, product);
  const effectivePrice = product.basePrice;
  return calculateDiscountedPrice(effectivePrice, campaigns);
}
