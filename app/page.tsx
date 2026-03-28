import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import ProductGrid from "@/components/products/ProductGrid";
import { Button } from "@/components/ui/button";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const metadata = {
  title: "Blackkin | Premium Comfort",
  description: "Shop premium undergarments",
};

interface ProductMedia {
  storageId: Id<"_storage">;
  type: "image" | "video";
  sortOrder: number;
}

interface RawProduct {
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

async function withImageUrls(products: RawProduct[]) {
  const storageIds = products
    .map((p) => p.media[0]?.storageId)
    .filter((id): id is Id<"_storage"> => Boolean(id));

  const urls =
    storageIds.length > 0
      ? await fetchAuthQuery(api.files.getUrls, {
          storageIds,
        })
      : [];

  const urlMap = new Map<string, string | null>();
  storageIds.forEach((id, index) => {
    urlMap.set(id as string, urls[index] ?? null);
  });

  return products.map((p) => ({
    ...p,
    imageUrl: p.media[0]?.storageId
      ? (urlMap.get(p.media[0].storageId as string) ?? null)
      : null,
  }));
}

export default async function HomePage() {
  const [rawBestSellers, rawNewArrivals] = await Promise.all([
    fetchAuthQuery(api.products.getFeaturedBestSellers, {}),
    fetchAuthQuery(api.products.getFeaturedNewArrivals, {}),
  ]);

  const [bestSellers, newArrivals] = await Promise.all([
    withImageUrls(rawBestSellers as RawProduct[]),
    withImageUrls(rawNewArrivals as RawProduct[]),
  ]);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full bg-background py-24 px-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Premium Comfort, Every Day.
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mb-8">
          Discover our collection of premium undergarments crafted for lasting
          comfort and style.
        </p>
        <Button asChild size="lg">
          <Link href="/products">Shop Now</Link>
        </Button>
      </section>

      {/* Best Sellers */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold mb-6">Best Sellers</h2>
        <Suspense
          fallback={
            <div className="text-muted-foreground text-sm">Loading...</div>
          }
        >
          <ProductGrid products={bestSellers} />
        </Suspense>
      </section>

      {/* New Arrivals */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold mb-6">New Arrivals</h2>
        <Suspense
          fallback={
            <div className="text-muted-foreground text-sm">Loading...</div>
          }
        >
          <ProductGrid products={newArrivals} />
        </Suspense>
      </section>
    </div>
  );
}
