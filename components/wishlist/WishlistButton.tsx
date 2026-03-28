"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";

interface WishlistButtonProps {
  productId: Id<"products">;
}

export default function WishlistButton({ productId }: WishlistButtonProps) {
  const { data: session } = authClient.useSession();
  const inWishlist = useQuery(
    api.wishlist.check,
    session ? { productId } : "skip"
  );
  const toggleMutation = useMutation(api.wishlist.toggle);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!session) {
      toast.error("Sign in to save to wishlist");
      return;
    }

    setLoading(true);
    try {
      await toggleMutation({ productId });
      toast.success(inWishlist ? "Removed from wishlist" : "Added to wishlist");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart
          className="h-4 w-4"
          fill={inWishlist ? "currentColor" : "none"}
        />
      )}
    </Button>
  );
}
