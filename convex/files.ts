import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth.helpers";

/**
 * Generate a short-lived upload URL for Convex file storage.
 * Admin only — product media uploads.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get a signed serving URL for a storage ID.
 * Returns null if the file doesn't exist.
 */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get serving URLs for multiple storage IDs at once (batch).
 */
export const getUrls = query({
  args: { storageIds: v.array(v.id("_storage")) },
  returns: v.array(v.union(v.string(), v.null())),
  handler: async (ctx, args) => {
    return await Promise.all(
      args.storageIds.map((id) => ctx.storage.getUrl(id))
    );
  },
});
