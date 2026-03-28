import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth.helpers";
import { aggregateProducts, aggregateOrders, aggregateUsers } from "./lib/aggregates";

export const getStats = query({
  args: {},
  returns: v.object({
    totalCustomers: v.number(),
    totalProducts: v.number(),
    totalCategories: v.number(),
    orders: v.object({
      pending: v.number(),
      processed: v.number(),
      shipped: v.number(),
      delivered: v.number(),
      cancelled: v.number(),
      total: v.number(),
    }),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [
      totalCustomers,
      totalProducts,
      pendingOrders,
      processedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      categories,
    ] = await Promise.all([
      aggregateUsers.count(ctx),
      aggregateProducts.count(ctx),
      aggregateOrders.count(ctx, { namespace: "pending" }),
      aggregateOrders.count(ctx, { namespace: "processed" }),
      aggregateOrders.count(ctx, { namespace: "shipped" }),
      aggregateOrders.count(ctx, { namespace: "delivered" }),
      aggregateOrders.count(ctx, { namespace: "cancelled" }),
      ctx.db.query("categories").take(200),
    ]);

    return {
      totalCustomers,
      totalProducts,
      totalCategories: categories.length,
      orders: {
        pending: pendingOrders,
        processed: processedOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        total:
          pendingOrders +
          processedOrders +
          shippedOrders +
          deliveredOrders +
          cancelledOrders,
      },
    };
  },
});
