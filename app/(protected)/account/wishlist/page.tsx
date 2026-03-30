"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart } from "lucide-react";
import { toast } from "sonner";

export default function WishlistPage() {
  const wishlist = useQuery(api.wishlist.get);
  const toggleWishlist = useMutation(api.wishlist.toggle);

  const handleRemove = async (productId: Id<"products">) => {
    try {
      await toggleWishlist({ productId });
      toast.success("Removed from wishlist");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  if (wishlist === undefined) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (wishlist.length === 0) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Heart className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">Your wishlist is empty</p>
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
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-8">My Wishlist</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {wishlist.map((item) => {
            const isDiscounted =
              item.discountedPrice !== undefined &&
              item.basePrice !== undefined &&
              item.discountedPrice < item.basePrice;

            return (
              <Card key={item._id} className="overflow-hidden">
                <div className="aspect-square relative bg-muted">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No image
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="text-sm font-medium leading-tight line-clamp-2">
                    {item.productName}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">
                      ৳{(item.discountedPrice ?? item.basePrice).toLocaleString()}
                    </span>
                    {isDiscounted && (
                      <Badge variant="secondary" className="text-xs line-through">
                        ৳{item.basePrice.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Link href={`/products/${item.productSlug}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Product
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => handleRemove(item.productId as Id<"products">)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
