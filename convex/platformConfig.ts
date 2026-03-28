import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./lib/auth.helpers";

// ─── SIZES ───────────────────────────────────────────────────

export const listSizes = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("platformSizes"),
      _creationTime: v.number(),
      name: v.string(),
      measurements: v.string(),
      sortOrder: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("platformSizes")
      .order("asc")
      .take(100);
  },
});

export const createSize = mutation({
  args: {
    name: v.string(),
    measurements: v.string(),
    sortOrder: v.number(),
  },
  returns: v.id("platformSizes"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("platformSizes")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    if (existing) throw new ConvexError("Size already exists");
    return await ctx.db.insert("platformSizes", args);
  },
});

export const updateSize = mutation({
  args: {
    id: v.id("platformSizes"),
    name: v.optional(v.string()),
    measurements: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(clean).length > 0) {
      await ctx.db.patch(id, clean);
    }
    return null;
  },
});

export const deleteSize = mutation({
  args: { id: v.id("platformSizes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});

// ─── COLORS ──────────────────────────────────────────────────

export const listColors = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("platformColors"),
      _creationTime: v.number(),
      name: v.string(),
      hexCode: v.optional(v.string()),
      sortOrder: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("platformColors")
      .order("asc")
      .take(100);
  },
});

export const createColor = mutation({
  args: {
    name: v.string(),
    hexCode: v.optional(v.string()),
    sortOrder: v.number(),
  },
  returns: v.id("platformColors"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("platformColors")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    if (existing) throw new ConvexError("Color already exists");
    return await ctx.db.insert("platformColors", args);
  },
});

export const updateColor = mutation({
  args: {
    id: v.id("platformColors"),
    name: v.optional(v.string()),
    hexCode: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(clean).length > 0) {
      await ctx.db.patch(id, clean);
    }
    return null;
  },
});

export const deleteColor = mutation({
  args: { id: v.id("platformColors") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});

// ─── FABRICS ─────────────────────────────────────────────────

export const listFabrics = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("platformFabrics"),
      _creationTime: v.number(),
      name: v.string(),
      sortOrder: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("platformFabrics")
      .order("asc")
      .take(100);
  },
});

export const createFabric = mutation({
  args: {
    name: v.string(),
    sortOrder: v.number(),
  },
  returns: v.id("platformFabrics"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("platformFabrics")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    if (existing) throw new ConvexError("Fabric already exists");
    return await ctx.db.insert("platformFabrics", args);
  },
});

export const updateFabric = mutation({
  args: {
    id: v.id("platformFabrics"),
    name: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(clean).length > 0) {
      await ctx.db.patch(id, clean);
    }
    return null;
  },
});

export const deleteFabric = mutation({
  args: { id: v.id("platformFabrics") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});
