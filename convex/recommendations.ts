import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth.helpers";
import { getProductDiscountedPrice } from "./lib/discounts";

const recommendedProductCard = v.object({
  _id: v.id("products"),
  name: v.string(),
  slug: v.string(),
  basePrice: v.number(),
  discountedPrice: v.number(),
  averageRating: v.number(),
  totalRatings: v.number(),
  imageUrl: v.union(v.string(), v.null()),
});

/** "You may also like" — shown on ALL product detail pages */
export const getAlsoLike = query({
  args: {},
  returns: v.array(recommendedProductCard),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("productRecommendations")
      .withIndex("by_type", (q) => q.eq("type", "also_like"))
      .order("asc")
      .take(20);

    const cards = await Promise.all(
      rows.map(async (row) => {
        const product = await ctx.db.get(row.recommendedProductId);
        if (!product || !product.isActive) return null;

        const { discountedPrice } = await getProductDiscountedPrice(ctx, product);
        const imageUrl =
          product.media.length > 0
            ? await ctx.storage.getUrl(product.media[0].storageId)
            : null;

        return {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          basePrice: product.basePrice,
          discountedPrice,
          averageRating: product.averageRating,
          totalRatings: product.totalRatings,
          imageUrl,
        };
      })
    );

    return cards.filter(Boolean) as NonNullable<(typeof cards)[0]>[];
  },
});

/**
 * "People also bought" — shown at checkout.
 * Filtered by the sizes present in the cart.
 * If sizes = [] returns storewide (forSize = null) recommendations.
 */
export const getAlsoBought = query({
  args: {
    sizes: v.array(v.string()), // sizes currently in cart
  },
  returns: v.array(recommendedProductCard),
  handler: async (ctx, args) => {
    const matchedProductIds = new Set<string>();
    const rows: Doc<"productRecommendations">[] = [];

    if (args.sizes.length === 0) {
      // No sizes - return generic (no forSize) ones
      const generic = await ctx.db
        .query("productRecommendations")
        .withIndex("by_type_and_forSize", (q) =>
          q.eq("type", "also_bought").eq("forSize", undefined)
        )
        .take(20);
      rows.push(...generic);
    } else {
      // Fetch recommendations for each size
      for (const size of args.sizes) {
        const sizeRecs = await ctx.db
          .query("productRecommendations")
          .withIndex("by_type_and_forSize", (q) =>
            q.eq("type", "also_bought").eq("forSize", size)
          )
          .take(20);
        rows.push(...sizeRecs);
      }
    }

    const cards = await Promise.all(
      rows
        .filter((row) => {
          const id = row.recommendedProductId;
          if (matchedProductIds.has(id)) return false;
          matchedProductIds.add(id);
          return true;
        })
        .map(async (row) => {
          const product = await ctx.db.get(row.recommendedProductId);
          if (!product || !product.isActive) return null;

          const { discountedPrice } = await getProductDiscountedPrice(ctx, product);
          const imageUrl =
            product.media.length > 0
              ? await ctx.storage.getUrl(product.media[0].storageId)
              : null;

          return {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            basePrice: product.basePrice,
            discountedPrice,
            averageRating: product.averageRating,
            totalRatings: product.totalRatings,
            imageUrl,
          };
        })
    );

    return cards.filter(Boolean) as NonNullable<(typeof cards)[0]>[];
  },
});

/** Admin: get all recommendations of a type */
export const listByType = query({
  args: {
    type: v.union(v.literal("also_like"), v.literal("also_bought")),
  },
  returns: v.array(
    v.object({
      _id: v.id("productRecommendations"),
      _creationTime: v.number(),
      type: v.union(v.literal("also_like"), v.literal("also_bought")),
      recommendedProductId: v.id("products"),
      forSize: v.optional(v.string()),
      sortOrder: v.number(),
      productName: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("productRecommendations")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .take(100);

    return (
      await Promise.all(
        rows.map(async (row) => {
          const product = await ctx.db.get(row.recommendedProductId);
          return {
            ...row,
            productName: product?.name ?? "(deleted)",
          };
        })
      )
    );
  },
});

/** Admin: add a recommendation */
export const add = mutation({
  args: {
    type: v.union(v.literal("also_like"), v.literal("also_bought")),
    recommendedProductId: v.id("products"),
    forSize: v.optional(v.string()),
    sortOrder: v.number(),
  },
  returns: v.id("productRecommendations"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.recommendedProductId);
    if (!product) throw new ConvexError("Product not found");
    return await ctx.db.insert("productRecommendations", args);
  },
});

/** Admin: remove a recommendation */
export const remove = mutation({
  args: { id: v.id("productRecommendations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});

/** Admin: reorder recommendations */
export const updateSortOrder = mutation({
  args: {
    id: v.id("productRecommendations"),
    sortOrder: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { sortOrder: args.sortOrder });
    return null;
  },
});
