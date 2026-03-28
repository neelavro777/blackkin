import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./lib/auth.helpers";

const categoryObject = v.object({
  _id: v.id("categories"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  imageId: v.optional(v.id("_storage")),
  isActive: v.boolean(),
  sortOrder: v.number(),
});

/** Active categories for storefront filters & display */
export const list = query({
  args: {},
  returns: v.array(categoryObject),
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(100);
  },
});

/** Admin: all categories including inactive */
export const listAll = query({
  args: {},
  returns: v.array(categoryObject),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("categories").order("asc").take(200);
  },
});

/** Single category by slug */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(categoryObject, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    sortOrder: v.number(),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new ConvexError("Slug already in use");
    return await ctx.db.insert("categories", { ...args, isActive: true });
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    if (updates.slug) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug!))
        .unique();
      if (existing && existing._id !== id) throw new ConvexError("Slug already in use");
    }
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
    return null;
  },
});

export const toggleActive = mutation({
  args: { id: v.id("categories"), isActive: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { isActive: args.isActive });
    return null;
  },
});
