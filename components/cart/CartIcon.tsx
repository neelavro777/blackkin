"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useCart } from "./CartProvider";

export function CartIcon() {
  const { data: session } = authClient.useSession();
  const { guestItemCount, setIsOpen } = useCart();

  // Only reactive for logged-in users
  const cartItems = useQuery(
    api.cart.get,
    session ? {} : "skip"
  );

  const count = session
    ? (cartItems?.reduce((sum, i) => sum + i.quantity, 0) ?? 0)
    : guestItemCount;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => setIsOpen(true)}
      aria-label="Open cart"
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-foreground text-background text-[10px] font-medium flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
