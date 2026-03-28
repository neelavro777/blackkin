"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type OrderStatus = "pending" | "processed" | "shipped" | "delivered" | "cancelled";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as Id<"orders">;

  const data = useQuery(api.orders.getById, { orderId });
  const updateStatus = useMutation(api.orders.updateStatus);
  const [updating, setUpdating] = useState(false);

  async function handleStatusChange(status: OrderStatus) {
    setUpdating(true);
    try {
      await updateStatus({ orderId, status });
      toast.success(`Status updated to ${status}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  if (data === undefined) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) {
    return <div className="py-12 text-center text-muted-foreground">Order not found</div>;
  }

  const { order, items, customerName, customerEmail } = data;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Order Details</h1>
          <p className="text-sm text-muted-foreground font-mono">{orderId}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Customer</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{customerName ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{customerEmail}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Payment</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={order.paymentStatus === "paid" ? "default" : "outline"}>{order.paymentStatus}</Badge>
            <p className="text-sm text-muted-foreground mt-1">{order.paymentMethod ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Order Status</CardTitle>
            <Badge>{order.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Select value={order.status} onValueChange={(v) => handleStatusChange(v as OrderStatus)} disabled={updating}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["pending", "processed", "shipped", "delivered", "cancelled"] as OrderStatus[]).map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Shipping Address</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p className="font-medium">{order.shippingAddress.name}</p>
          <p>{order.shippingAddress.phone}</p>
          <p>{order.shippingAddress.addressLine1}</p>
          {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
          <p>{order.shippingAddress.city}{order.shippingAddress.postalCode ? `, ${order.shippingAddress.postalCode}` : ""}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Items</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {items.map((item) => (
            <div key={item._id} className="py-3 flex justify-between text-sm">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-muted-foreground">{item.size}{item.color ? ` · ${item.color}` : ""} × {item.quantity}</p>
              </div>
              <p className="font-medium">৳{item.totalPrice.toLocaleString()}</p>
            </div>
          ))}
          <Separator />
          <div className="pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>৳{order.subtotal.toLocaleString()}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span><span>-৳{order.discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span><span>৳{order.total.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
