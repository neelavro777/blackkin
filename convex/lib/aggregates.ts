import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "../_generated/api";
import { DataModel } from "../_generated/dataModel";

/**
 * Counts active products.
 * Updated in product insert/delete/toggleActive via helper functions.
 */
export const aggregateProducts = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "products";
}>(components.aggregateProducts, {
  sortKey: () => null,
});

/**
 * Counts orders, namespaced by status.
 * Enables: aggregateOrders.count(ctx, { namespace: "pending" })
 * Updated in orders.create and orders.updateStatus via helper functions.
 */
export const aggregateOrders = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "orders";
}>(components.aggregateOrders, {
  namespace: (doc) => doc.status,
  sortKey: (doc) => doc._creationTime,
});

/**
 * Counts users with role "customer".
 * Updated via the trigger registered in triggers.ts.
 */
export const aggregateUsers = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "users";
}>(components.aggregateUsers, {
  sortKey: () => null,
});
