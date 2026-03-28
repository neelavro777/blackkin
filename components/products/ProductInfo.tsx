"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SizeSelector from "./SizeSelector";
import AddToCartButton from "@/components/cart/AddToCartButton";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { Id } from "@/convex/_generated/dataModel";

interface Variant {
  _id: Id<"productVariants">;
  size: string;
  color?: string;
  fabric?: string;
  stock: number;
  priceOverride?: number;
}

interface Tag {
  _id: string;
  name: string;
  slug: string;
}

interface PlatformSize {
  name: string;
  measurements?: string;
}

interface ProductInfoProps {
  product: {
    _id: Id<"products">;
    name: string;
    basePrice: number;
    discountedPrice: number;
    discountAmount: number;
    campaignName: string | null;
    averageRating: number;
    totalRatings: number;
    variants: Variant[];
    tags: Tag[];
  };
  platformSizes: PlatformSize[];
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= Math.round(rating) ? "text-yellow-400" : "text-muted-foreground"}>
        &#9733;
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1 text-sm">
      <span>{stars}</span>
      <span className="text-muted-foreground">({count} reviews)</span>
    </div>
  );
}

export default function ProductInfo({ product, platformSizes }: ProductInfoProps) {
  const { _id, name, basePrice, discountedPrice, discountAmount, campaignName, averageRating, totalRatings, variants, tags } = product;

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const uniqueSizes = Array.from(new Set(variants.map((v) => v.size)));

  const sizesWithStock: Array<{ name: string; measurements?: string; inStock: boolean }> = uniqueSizes.map((sizeName) => {
    const platform = platformSizes.find((ps) => ps.name === sizeName);
    const hasStock = variants.some((v) => v.size === sizeName && v.stock > 0);
    return {
      name: sizeName,
      measurements: platform?.measurements,
      inStock: hasStock,
    };
  });

  const variantsForSize = selectedSize
    ? variants.filter((v) => v.size === selectedSize)
    : [];

  const uniqueColors = Array.from(
    new Set(variantsForSize.map((v) => v.color).filter((c): c is string => !!c))
  );

  const selectedVariant =
    selectedSize && uniqueColors.length === 0
      ? variantsForSize[0] ?? null
      : selectedSize && selectedColor
      ? variantsForSize.find((v) => v.color === selectedColor) ?? null
      : null;

  const selectedVariantId = selectedVariant?._id ?? null;

  const isDiscounted = discountAmount > 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{name}</h1>

      {totalRatings > 0 && <StarRating rating={averageRating} count={totalRatings} />}

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-2xl font-bold">৳{discountedPrice.toLocaleString()}</span>
        {isDiscounted && (
          <>
            <span className="text-sm text-muted-foreground line-through">
              ৳{basePrice.toLocaleString()}
            </span>
            {campaignName && <Badge variant="secondary">{campaignName}</Badge>}
          </>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag._id} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {sizesWithStock.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Size</p>
          <SizeSelector
            sizes={sizesWithStock}
            selectedSize={selectedSize}
            onChange={(size) => {
              setSelectedSize(size);
              setSelectedColor(null);
            }}
          />
        </div>
      )}

      {selectedSize && uniqueColors.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Color</p>
          <div className="flex flex-wrap gap-2">
            {uniqueColors.map((color) => {
              const inStock = variantsForSize.some((v) => v.color === color && v.stock > 0);
              return (
                <Button
                  key={color}
                  variant={selectedColor === color ? "default" : "outline"}
                  size="sm"
                  disabled={!inStock}
                  onClick={() => setSelectedColor(color)}
                  className={!inStock ? "line-through text-muted-foreground" : ""}
                >
                  {color}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <AddToCartButton
          productId={_id}
          variantId={selectedVariantId}
          disabled={!selectedVariantId}
        />
        <WishlistButton productId={_id} />
      </div>
    </div>
  );
}
