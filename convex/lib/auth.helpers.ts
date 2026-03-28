import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Derives the current user's doc from the Convex JWT identity.
 * Throws ConvexError("Unauthenticated") if not logged in.
 * NEVER accepts userId as argument — always server-derived.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) =>
      q.eq("authUserId", identity.subject)
    )
    .unique();

  if (!user) {
    throw new ConvexError("User not found");
  }

  if (user.isActive === false) {
    throw new ConvexError("Account deactivated");
  }

  return user;
}

/**
 * Derives the current user and checks for admin role.
 * Throws ConvexError("Unauthorized") if not admin.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireAuth(ctx);
  if (user.role !== "admin") {
    throw new ConvexError("Unauthorized");
  }
  return user;
}

/**
 * Returns the current user doc or null if not authenticated.
 */
export async function optionalAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) =>
      q.eq("authUserId", identity.subject)
    )
    .unique();

  if (!user || user.isActive === false) return null;
  return user;
}
