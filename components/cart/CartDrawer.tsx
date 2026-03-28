"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useCart } from "./CartProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { getGuestCart, removeFromGuestCart, updateGuestCartQuantity } from "@/lib/guest-cart";
import { Id } from "@/convex/_generated/dataModel";

export function CartDrawer() {
  const { data: session } = authClient.useSession();
  const { isOpen, setIsOpen, guestItemCount, removeGuestItem, updateGuestQuantity } = useCart();

  const cartItems = useQuery(api.cart.get, session ? {} : "skip");
  const removeItem = useMutation(api.cart.remove);
  const updateItemQty = useMutation(api.cart.updateQuantity);

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const guestItems = !session ? getGuestCart() : [];

  const handleRemove = async (cartItemId: Id<"cartItems">) => {
    setLoadingId(cartItemId);
    try {
      await removeItem({ cartItemId });
    } finally {
      setLoadingId(null);
    }
  };

  const handleQtyChange = async (cartItemId: Id<"cartItems">, qty: number) => {
    if (qty < 1) return;
    setLoadingId(cartItemId + "_qty");
    try {
      await updateItemQty({ cartItemId, quantity: qty });
    } finally {
      setLoadingId(null);
    }
  };

  const subtotal = session
    ? (cartItems?.reduce((sum, i) => sum + i.discountedPrice * i.quantity, 0) ?? 0)
    : 0;

  const isEmpty = session
    ? (cartItems?.length ?? 0) === 0
    : guestItems.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <p className="text-muted-foreground text-sm">Your cart is empty</p>
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} asChild>
                <Link href="/products">Browse Products</Link>
              </Button>
            </div>
          ) : session ? (
            <div className="space-y-4">
              {(cartItems ?? []).map((item) => (
                <div key={item._id} className="flex gap-3">
                  <div className="h-16 w-16 rounded border bg-muted flex-shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        width={64}
                        height={64}
                        className="object-cover h-full w-full"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.size}{item.color ? ` · ${item.color}` : ""}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          disabled={item.quantity <= 1 || loadingId === item._id + "_qty"}
                          onClick={() => handleQtyChange(item._id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          disabled={item.quantity >= item.stock || loadingId === item._id + "_qty"}
                          onClick={() => handleQtyChange(item._id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          ৳{(item.discountedPrice * item.quantity).toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={loadingId === item._id}
                          onClick={() => handleRemove(item._id)}
                        >
                          {loadingId === item._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Guest cart - show item count only (no product details without API)
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You have {guestItemCount} item{guestItemCount !== 1 ? "s" : ""} in your cart.
              </p>
              <p className="text-xs text-muted-foreground">
                Sign in to view prices and checkout.
              </p>
            </div>
          )}
        </div>

        {!isEmpty && (
          <>
            <Separator />
            <div className="pt-4 space-y-3">
              {session && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">৳{subtotal.toLocaleString()}</span>
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => setIsOpen(false)}
                asChild
              >
                <Link href={session ? "/checkout" : "/login?next=/checkout"}>
                  {session ? "Proceed to Checkout" : "Sign in to Checkout"}
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsOpen(false)}
                asChild
              >
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
