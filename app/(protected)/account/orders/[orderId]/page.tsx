"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            className={`h-5 w-5 ${
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({
  productId,
  orderId,
}: {
  productId: Id<"products">;
  orderId: Id<"orders">;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const createReview = useMutation(api.reviews.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setSubmitting(true);
    try {
      await createReview({
        productId,
        orderId,
        rating,
        ...(comment ? { comment } : {}),
      });
      toast.success("Review submitted!");
      setSubmitted(true);
      setOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <p className="text-sm text-muted-foreground">Review submitted. Thank you!</p>;
  }

  return (
    <div className="mt-2">
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Leave a Review
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 mt-2 p-3 border rounded-md bg-muted/30">
          <div className="space-y-1">
            <p className="text-xs font-medium">Your Rating</p>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium">Comment (optional)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit Review"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as Id<"orders">;
  const data = useQuery(api.orders.getMyOrder, { orderId });

  if (data === undefined) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (data === null) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Order not found</p>
          <Link href="/account/orders">
            <Button variant="outline">Back to Orders</Button>
          </Link>
        </div>
      </>
    );
  }

  const { order, items } = data;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Back */}
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        {/* Order Header */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Order Detail</h1>
          <p className="font-mono text-sm text-muted-foreground">{order._id}</p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
            <Badge variant="outline">{order.paymentStatus}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(order._creationTime).toLocaleDateString()}
          </p>
        </div>

        <Separator />

        {/* Items */}
        <div className="space-y-4">
          <h2 className="font-medium">Items</h2>
          {items.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Size: {item.size}
                    {item.color ? ` · ${item.color}` : ""}
                    {" · "}Qty: {item.quantity}
                    {" · "}Unit: ৳{item.unitPrice.toLocaleString()}
                  </p>
                </div>
                <p className="text-sm font-medium whitespace-nowrap">
                  ৳{item.totalPrice.toLocaleString()}
                </p>
              </div>
              {order.status === "delivered" && (
                <ReviewForm
                  productId={item.productId as Id<"products">}
                  orderId={order._id}
                />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Price Summary */}
        <div className="space-y-2 text-sm">
          <h2 className="font-medium">Price Summary</h2>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>৳{order.subtotal.toLocaleString()}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-৳{order.discountAmount.toLocaleString()}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>৳{order.total.toLocaleString()}</span>
          </div>
        </div>

        <Separator />

        {/* Shipping Address */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">{order.shippingAddress.name}</p>
            <p>{order.shippingAddress.phone}</p>
            <p>{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && (
              <p>{order.shippingAddress.addressLine2}</p>
            )}
            <p>
              {order.shippingAddress.city}
              {order.shippingAddress.postalCode
                ? `, ${order.shippingAddress.postalCode}`
                : ""}
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
