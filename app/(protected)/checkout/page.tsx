"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useQuery(api.cart.getCartWithPricing, {});
  const cartSizes = cart ? Array.from(new Set(cart.items.map((i) => i.size))) : [];
  const recommendations = useQuery(
    api.recommendations.getAlsoBought,
    cart !== undefined ? { sizes: cartSizes } : "skip"
  );
  const createOrder = useMutation(api.orders.create);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createOrder({
        shippingAddress: {
          name,
          phone,
          addressLine1,
          ...(addressLine2 ? { addressLine2 } : {}),
          city,
          ...(postalCode ? { postalCode } : {}),
        },
        ...(notes ? { notes } : {}),
      });
      toast.success("Order placed!");
      router.push("/account/orders");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart === undefined) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground text-lg">Your cart is empty</p>
          <Link href="/products">
            <Button variant="outline">Browse Products</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-8">Checkout</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: Shipping Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-lg font-medium">Shipping Information</h2>

            <div className="space-y-1">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+880 1XXX XXXXXX"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Input
                id="addressLine1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                required
                placeholder="House/Flat, Road, Area"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  placeholder="Dhaka"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="1207"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    defaultChecked
                    className="accent-primary"
                  />
                  <span>Cash on Delivery</span>
                </label>
                <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    disabled
                    className="accent-primary"
                  />
                  <span>Online Payment</span>
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </label>
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label htmlFor="notes">Order Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing Order...
                </>
              ) : (
                "Place Order"
              )}
            </Button>
          </form>

          {/* Right: Order Summary */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Order Summary</h2>

            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={item._id} className="flex gap-4 items-start">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded-md bg-muted flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Size: {item.size}
                      {item.color ? ` · ${item.color}` : ""}
                      {" · "}Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium whitespace-nowrap">
                    ৳{(item.discountedPrice * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>৳{cart.subtotal.toLocaleString()}</span>
              </div>
              {cart.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-৳{cart.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>৳{cart.total.toLocaleString()}</span>
              </div>
            </div>

            {/* People Also Bought */}
            {recommendations && recommendations.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  People Also Bought
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {recommendations.map((product) => (
                    <Link
                      key={product._id}
                      href={`/products/${product.slug}`}
                      className="w-36 flex-shrink-0 block border rounded-md overflow-hidden hover:shadow-sm transition-shadow"
                    >
                      <div className="aspect-square relative bg-muted">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-2 space-y-0.5">
                        <p className="text-xs font-medium line-clamp-2">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ৳{product.discountedPrice.toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
