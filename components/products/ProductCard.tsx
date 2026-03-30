"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Id } from "@/convex/_generated/dataModel";

interface ProductCardProps {
  product: {
    _id: Id<"products">;
    name: string;
    slug: string;
    basePrice: number;
    discountedPrice: number;
    discountAmount: number;
    campaignName: string | null;
    averageRating: number;
    totalRatings: number;
    media: Array<{
      storageId: Id<"_storage">;
      type: "image" | "video";
      sortOrder: number;
    }>;
  };
  imageUrl?: string | null;
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= Math.round(rating) ? "text-yellow-400" : "text-muted-foreground"}>
        &#9733;
      </span>
    );
  }
  return <span className="text-sm">{stars}</span>;
}

export default function ProductCard({ product, imageUrl }: ProductCardProps) {
  const { name, slug, basePrice, discountedPrice, discountAmount, averageRating, totalRatings } = product;
  const isDiscounted = discountAmount > 0;

  return (
    <Link href={`/products/${slug}`} className="block">
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-square relative overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}
          {isDiscounted && (
            <div className="absolute top-2 left-2">
              <Badge variant="destructive">-{discountAmount.toLocaleString()}</Badge>
            </div>
          )}
        </div>
        <CardContent className="p-3 space-y-1">
          <p className="text-sm font-medium leading-tight line-clamp-2">{name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold">
              ৳{discountedPrice.toLocaleString()}
            </span>
            {isDiscounted && (
              <span className="text-xs text-muted-foreground line-through">
                ৳{basePrice.toLocaleString()}
              </span>
            )}
          </div>
          {totalRatings > 0 && (
            <div className="flex items-center gap-1">
              <StarRating rating={averageRating} />
              <span className="text-xs text-muted-foreground">({totalRatings})</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
