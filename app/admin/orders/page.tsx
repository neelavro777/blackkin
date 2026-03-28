"use client";

import { useState } from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Eye } from "lucide-react";
import Link from "next/link";

type OrderStatus = "pending" | "processed" | "shipped" | "delivered" | "cancelled";

const STATUS_COLORS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processed: "secondary",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const { results, status, loadMore } = usePaginatedQuery(
    api.orders.listAll,
    { status: statusFilter === "all" ? undefined : statusFilter },
    { initialNumItems: 20 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage customer orders</p>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processed">Processed</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage" ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : results.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
            ) : results.map((order) => (
              <TableRow key={order._id}>
                <TableCell className="font-mono text-xs">{order._id.slice(-8)}</TableCell>
                <TableCell className="text-sm">{new Date(order._creationTime).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">৳{order.total.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={order.paymentStatus === "paid" ? "default" : "outline"} className="text-xs">
                    {order.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[order.status]} className="text-xs capitalize">
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link href={`/admin/orders/${order._id}`}><Eye className="h-3 w-3" /></Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {status === "CanLoadMore" && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => loadMore(20)}>Load More</Button>
        </div>
      )}
    </div>
  );
}
