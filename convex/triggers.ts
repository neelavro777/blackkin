import { Triggers } from "convex-helpers/server/triggers";
import { customMutation, customCtx } from "convex-helpers/server/customFunctions";
import { mutation as rawMutation } from "./_generated/server";
import { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { aggregateUsers } from "./lib/aggregates";

const triggers = new Triggers<DataModel>();

// ─── USERS: cascade deletion to better-auth + aggregate sync ────
triggers.register("users", async (ctx, change) => {
  // Keep aggregate in sync
  if (change.operation === "insert") {
    if (change.newDoc.role === "customer") {
      await aggregateUsers.insertIfDoesNotExist(ctx, change.newDoc);
    }
  } else if (change.operation === "update") {
    // Role could change (unlikely but guard it)
    if (change.oldDoc.role === "customer") {
      await aggregateUsers.deleteIfExists(ctx, change.oldDoc);
    }
    if (change.newDoc.role === "customer") {
      await aggregateUsers.insertIfDoesNotExist(ctx, change.newDoc);
    }
  } else if (change.operation === "delete") {
    if (change.oldDoc.role === "customer") {
      await aggregateUsers.deleteIfExists(ctx, change.oldDoc);
    }

    const { authUserId } = change.oldDoc;

    if (!authUserId || typeof authUserId !== "string" || authUserId.trim() === "") {
      console.warn(`Skipping better-auth cleanup for user with invalid authUserId: ${authUserId}`);
      return;
    }

    // Cascade deletion to better-auth tables
    const tablesWithUserId = [
      "session",
      "account",
      "twoFactor",
      "oauthConsent",
      "oauthAccessToken",
      "oauthApplication",
    ] as const;

    for (const model of tablesWithUserId) {
      await ctx.runMutation(
        components.betterAuth.adapter.deleteMany,
        { input: { model, where: [{ field: "userId", value: authUserId }] } } as any,
      );
    }

    await ctx.runMutation(
      components.betterAuth.adapter.deleteOne,
      { input: { model: "user", where: [{ field: "_id", value: authUserId }] } } as any,
    );
  }
});

/**
 * Use this `mutation` instead of the raw one for any mutation that writes to
 * the `users` table, so that the delete trigger fires automatically.
 */
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
