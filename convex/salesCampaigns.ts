import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/auth.helpers";

const scopeValidator = v.union(
  v.object({ type: v.literal("storewide") }),
  v.object({ type: v.literal("category"), categoryId: v.id("categories") }),
  v.object({ type: v.literal("tag"), tagId: v.id("tags") }),
  v.object({ type: v.literal("product"), productId: v.id("products") })
);

const campaignObject = v.object({
  _id: v.id("salesCampaigns"),
  _creationTime: v.number(),
  name: v.string(),
  discountType: v.union(v.literal("percentage"), v.literal("fixed")),
  discountValue: v.number(),
  startTime: v.number(),
  endTime: v.number(),
  scope: scopeValidator,
  isActive: v.boolean(),
});

export const listAll = query({
  args: {},
  returns: v.array(campaignObject),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("salesCampaigns").order("desc").take(200);
  },
});

export const listActive = query({
  args: {},
  returns: v.array(campaignObject),
  handler: async (ctx) => {
    return await ctx.db
      .query("salesCampaigns")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(100);
  },
});

function validateDiscount(
  discountType: "percentage" | "fixed",
  discountValue: number
) {
  if (discountValue <= 0) {
    throw new ConvexError("Discount value must be positive");
  }
  if (discountType === "percentage" && discountValue > 100) {
    throw new ConvexError("Percentage discount cannot exceed 100%");
  }
}

export const create = mutation({
  args: {
    name: v.string(),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(),
    startTime: v.number(),
    endTime: v.number(),
    scope: scopeValidator,
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("salesCampaigns"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    validateDiscount(args.discountType, args.discountValue);
    if (args.endTime <= args.startTime) {
      throw new ConvexError("End time must be after start time");
    }
    return await ctx.db.insert("salesCampaigns", {
      name: args.name || "Sale",
      discountType: args.discountType,
      discountValue: args.discountValue,
      startTime: args.startTime,
      endTime: args.endTime,
      scope: args.scope,
      isActive: args.isActive ?? true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("salesCampaigns"),
    name: v.optional(v.string()),
    discountType: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
    discountValue: v.optional(v.number()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    scope: v.optional(scopeValidator),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;

    const current = await ctx.db.get(id);
    if (!current) throw new ConvexError("Campaign not found");

    const discountType = updates.discountType ?? current.discountType;
    const discountValue = updates.discountValue ?? current.discountValue;
    validateDiscount(discountType, discountValue);

    const startTime = updates.startTime ?? current.startTime;
    const endTime = updates.endTime ?? current.endTime;
    if (endTime <= startTime) throw new ConvexError("End time must be after start time");

    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("salesCampaigns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});
