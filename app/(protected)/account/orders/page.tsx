"use client";

import { usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/components/Navbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type OrderStatus = "pending" | "processed" | "shipped" | "delivered" | "cancelled";

function getStatusVariant(
  status: string
): "outline" | "secondary" | "default" | "destructive" {
  switch (status as OrderStatus) {
    case "pending":
      return "outline";
    case "processed":
      return "secondary";
    case "shipped":
    case "delivered":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export default function OrdersPage() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.orders.getMyOrders,
    {},
    { initialNumItems: 10 }
  );

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-8">My Orders</h1>

        {status === "LoadingFirstPage" ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-muted-foreground">No orders yet</p>
            <Link href="/products">
              <Button variant="outline">Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-mono text-sm">
                      ...{order._id.slice(-8)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order._creationTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      ৳{order.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.paymentStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/account/orders/${order._id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {status === "CanLoadMore" && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => loadMore(10)}>
                  Load More
                </Button>
              </div>
            )}

            {status === "LoadingMore" && (
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
