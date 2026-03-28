import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config.js";

const app = defineApp();

app.use(betterAuth);
app.use(aggregate, { name: "aggregateProducts" });
app.use(aggregate, { name: "aggregateOrders" });
app.use(aggregate, { name: "aggregateUsers" });

export default app;
