"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Navbar } from "@/components/Navbar";
import ProductFilters from "@/components/products/ProductFilters";
import SearchBar from "@/components/products/SearchBar";
import ProductCard from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ProductMedia {
  storageId: Id<"_storage">;
  type: "image" | "video";
  sortOrder: number;
}

interface ListProduct {
  _id: Id<"products">;
  name: string;
  slug: string;
  basePrice: number;
  discountedPrice: number;
  discountAmount: number;
  campaignName: string | null;
  averageRating: number;
  totalRatings: number;
  media: ProductMedia[];
}

// Resolves image URL for a single product card via individual subscription
function ProductCardWithImage({ product }: { product: ListProduct }) {
  const storageId = product.media[0]?.storageId;
  const imageUrl = useQuery(
    api.files.getUrl,
    storageId ? { storageId } : "skip"
  );

  return <ProductCard product={product} imageUrl={imageUrl ?? null} />;
}

function ProductsContent() {
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const tagId = searchParams.get("tagId") ?? "";
  const size = searchParams.get("size") ?? "";
  const color = searchParams.get("color") ?? "";
  const fabric = searchParams.get("fabric") ?? "";
  const minPriceStr = searchParams.get("minPrice") ?? "";
  const maxPriceStr = searchParams.get("maxPrice") ?? "";
  const minPrice = minPriceStr ? Number(minPriceStr) : undefined;
  const maxPrice = maxPriceStr ? Number(maxPriceStr) : undefined;

  // Filter options
  const categories = useQuery(api.categories.list) ?? [];
  const sizes = useQuery(api.platformConfig.listSizes) ?? [];
  const colors = useQuery(api.platformConfig.listColors) ?? [];
  const fabrics = useQuery(api.platformConfig.listFabrics) ?? [];
  const tags = useQuery(api.tags.list) ?? [];

  // Search results — only active when q is non-empty
  const searchResults = usePaginatedQuery(
    api.products.search,
    q
      ? { query: q, ...(categoryId ? { categoryId: categoryId as Id<"categories"> } : {}) }
      : "skip",
    { initialNumItems: 24 }
  );

  // Filtered results — only active when q is empty
  const filteredResults = usePaginatedQuery(
    api.products.listFiltered,
    !q
      ? {
          ...(categoryId ? { categoryId: categoryId as Id<"categories"> } : {}),
          ...(tagId ? { tagId: tagId as Id<"tags"> } : {}),
          ...(size ? { size } : {}),
          ...(color ? { color } : {}),
          ...(fabric ? { fabric } : {}),
          ...(minPrice !== undefined ? { minPrice } : {}),
          ...(maxPrice !== undefined ? { maxPrice } : {}),
        }
      : "skip",
    { initialNumItems: 24 }
  );

  const { results, status, loadMore } = q ? searchResults : filteredResults;
  const products = (results ?? []) as ListProduct[];
  const isLoading = status === "LoadingFirstPage";

  const filtersPanel = (
    <ProductFilters
      categories={categories}
      sizes={sizes}
      colors={colors}
      fabrics={fabrics}
      tags={tags}
    />
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Products</h1>
            {!isLoading && (
              <p className="text-sm text-muted-foreground mt-1">
                {products.length} {products.length === 1 ? "item" : "items"}
                {status === "CanLoadMore" ? "+" : ""}
              </p>
            )}
          </div>

          {/* Mobile filter toggle */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto w-72">
                <div className="pt-6">{filtersPanel}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            {filtersPanel}
          </aside>

          {/* Product grid column */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <SearchBar defaultValue={q} />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No products found.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product) => (
                    <ProductCardWithImage key={product._id} product={product} />
                  ))}
                </div>

                {status === "CanLoadMore" && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="outline"
                      onClick={() => loadMore(24)}
                    >
                      Load More
                    </Button>
                  </div>
                )}

                {status === "LoadingMore" && (
                  <div className="flex justify-center mt-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
