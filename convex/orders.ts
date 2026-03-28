import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireAuth, requireAdmin } from "./lib/auth.helpers";
import { aggregateOrders } from "./lib/aggregates";
import { getProductDiscountedPrice } from "./lib/discounts";

const shippingAddressValidator = v.object({
  name: v.string(),
  phone: v.string(),
  addressLine1: v.string(),
  addressLine2: v.optional(v.string()),
  city: v.string(),
  postalCode: v.optional(v.string()),
});

const orderItemObject = v.object({
  _id: v.id("orderItems"),
  _creationTime: v.number(),
  orderId: v.id("orders"),
  productId: v.id("products"),
  variantId: v.id("productVariants"),
  productName: v.string(),
  size: v.string(),
  color: v.optional(v.string()),
  unitPrice: v.number(),
  quantity: v.number(),
  totalPrice: v.number(),
});

const orderObject = v.object({
  _id: v.id("orders"),
  _creationTime: v.number(),
  userId: v.id("users"),
  status: v.union(
    v.literal("pending"),
    v.literal("processed"),
    v.literal("shipped"),
    v.literal("delivered"),
    v.literal("cancelled")
  ),
  shippingAddress: shippingAddressValidator,
  subtotal: v.number(),
  discountAmount: v.number(),
  total: v.number(),
  paymentMethod: v.optional(v.string()),
  paymentStatus: v.union(
    v.literal("unpaid"),
    v.literal("paid"),
    v.literal("refunded")
  ),
  notes: v.optional(v.string()),
});

/**
 * Create an order from the current user's cart.
 * SERVER-SIDE: recalculates all prices, validates stock, decrements inventory.
 */
export const create = mutation({
  args: {
    shippingAddress: shippingAddressValidator,
    notes: v.optional(v.string()),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Load cart
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(100);

    if (cartItems.length === 0) throw new ConvexError("Cart is empty");

    let subtotal = 0;
    let discountAmount = 0;

    // Validate all items and calculate prices server-side
    const enrichedItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        if (!product || !product.isActive) {
          throw new ConvexError(`Product "${item.productId}" is no longer available`);
        }

        const variant = await ctx.db.get(item.variantId);
        if (!variant || variant.productId !== product._id) {
          throw new ConvexError("Variant not found");
        }
        if (variant.stock < item.quantity) {
          throw new ConvexError(
            `Insufficient stock for "${product.name}" (${variant.size})`
          );
        }

        // Server-side price calculation - never trust client
        const { discountedPrice, discountAmount: itemDiscount } =
          await getProductDiscountedPrice(ctx, product);

        const unitPrice = discountedPrice;
        const itemTotal = unitPrice * item.quantity;
        subtotal += product.basePrice * item.quantity;
        discountAmount += itemDiscount * item.quantity;

        return {
          productId: product._id,
          variantId: variant._id,
          productName: product.name,
          size: variant.size,
          color: variant.color,
          unitPrice,
          quantity: item.quantity,
          totalPrice: itemTotal,
          // For stock decrement
          variantDbId: variant._id,
          currentStock: variant.stock,
        };
      })
    );

    const total = subtotal - discountAmount;

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      status: "pending",
      shippingAddress: args.shippingAddress,
      subtotal,
      discountAmount,
      total,
      paymentStatus: "unpaid",
      notes: args.notes,
    });

    const order = await ctx.db.get(orderId);
    if (order) await aggregateOrders.insertIfDoesNotExist(ctx, order);

    // Insert order items and decrement stock
    await Promise.all(
      enrichedItems.map(async (item) => {
        await ctx.db.insert("orderItems", {
          orderId,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          size: item.size,
          color: item.color,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        });

        // Decrement stock
        await ctx.db.patch(item.variantDbId, {
          stock: item.currentStock - item.quantity,
        });
      })
    );

    // Clear cart
    let done = false;
    while (!done) {
      const items = await ctx.db
        .query("cartItems")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .take(64);
      if (items.length === 0) { done = true; } else {
        await Promise.all(items.map((i) => ctx.db.delete(i._id)));
      }
    }

    return orderId;
  },
});

/** Customer: their own orders */
export const getMyOrders = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    return await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** Customer: single order with items (REACTIVE for live status) */
export const getMyOrder = query({
  args: { orderId: v.id("orders") },
  returns: v.union(
    v.object({
      order: orderObject,
      items: v.array(orderItemObject),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.userId !== user._id) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .take(50);

    return { order, items };
  },
});

/** Admin: all orders paginated */
export const listAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processed"),
        v.literal("shipped"),
        v.literal("delivered"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("orders").order("desc").paginate(args.paginationOpts);
  },
});

/** Admin: single order detail */
export const getById = query({
  args: { orderId: v.id("orders") },
  returns: v.union(
    v.object({
      order: orderObject,
      items: v.array(orderItemObject),
      customerName: v.optional(v.string()),
      customerEmail: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .take(50);

    const customer = await ctx.db.get(order.userId);

    return {
      order,
      items,
      customerName: customer?.name,
      customerEmail: customer?.email ?? "",
    };
  },
});

/** Admin: update order status */
export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("processed"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const oldOrder = await ctx.db.get(args.orderId);
    if (!oldOrder) throw new ConvexError("Order not found");

    await ctx.db.patch(args.orderId, { status: args.status });
    const newOrder = await ctx.db.get(args.orderId);
    if (newOrder) await aggregateOrders.replaceOrInsert(ctx, oldOrder, newOrder);

    return null;
  },
});

/** Admin/Customer: update payment status (called after mock payment) */
export const updatePaymentStatus = mutation({
  args: {
    orderId: v.id("orders"),
    paymentStatus: v.union(
      v.literal("unpaid"),
      v.literal("paid"),
      v.literal("refunded")
    ),
    paymentMethod: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    // Only the order owner or admin can update payment
    if (order.userId !== user._id && user.role !== "admin") {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.patch(args.orderId, {
      paymentStatus: args.paymentStatus,
      ...(args.paymentMethod ? { paymentMethod: args.paymentMethod } : {}),
    });
    return null;
  },
});
