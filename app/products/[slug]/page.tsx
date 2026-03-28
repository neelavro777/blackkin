import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import MediaGallery from "@/components/products/MediaGallery";
import ProductInfo from "@/components/products/ProductInfo";
import ProductAccordion from "@/components/products/ProductAccordion";
import ProductCard from "@/components/products/ProductCard";
import ReviewList from "@/components/reviews/ReviewList";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchAuthQuery(api.products.getBySlug, { slug });
  return {
    title: product ? `${product.name} | Blackkin` : "Product | Blackkin",
    description: product?.description?.slice(0, 160) ?? "Shop premium undergarments at Blackkin.",
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const [product, recommendations, platformSizes] = await Promise.all([
    fetchAuthQuery(api.products.getBySlug, { slug }),
    fetchAuthQuery(api.recommendations.getAlsoLike, {}),
    fetchAuthQuery(api.platformConfig.listSizes, {}),
  ]);

  if (!product) {
    notFound();
  }

  // Resolve media URLs
  const storageIds = product.media.map(
    (m: { storageId: Id<"_storage">; type: "image" | "video"; sortOrder: number }) =>
      m.storageId
  );

  const mediaUrls =
    storageIds.length > 0
      ? await fetchAuthQuery(api.files.getUrls, { storageIds })
      : [];

  const resolvedMedia = product.media.map(
    (
      m: { storageId: Id<"_storage">; type: "image" | "video"; sortOrder: number },
      index: number
    ) => ({
      ...m,
      url: mediaUrls[index] ?? null,
    })
  );

  // Find the category name for breadcrumb
  const categoryName =
    (product as { categoryName?: string }).categoryName ?? "Products";

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/products"
            className="hover:text-foreground transition-colors"
          >
            Products
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        {/* Main product section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <MediaGallery media={resolvedMedia} />
          <ProductInfo product={product} platformSizes={platformSizes ?? []} />
        </div>

        {/* Description accordion */}
        <div className="mb-12 max-w-2xl">
          <ProductAccordion
            description={product.description ?? ""}
          />
        </div>

        {/* Customer Reviews */}
        <section className="mb-12 max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">Customer Reviews</h2>
          <ReviewList productId={product._id} />
        </section>

        {/* You May Also Like */}
        {recommendations && recommendations.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">You May Also Like</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {(
                recommendations as Array<{
                  _id: Id<"products">;
                  name: string;
                  slug: string;
                  basePrice: number;
                  discountedPrice: number;
                  averageRating: number;
                  totalRatings: number;
                  imageUrl: string | null;
                }>
              ).map((rec) => (
                <div key={rec._id} className="w-48 flex-shrink-0">
                  <ProductCard
                    product={{
                      _id: rec._id,
                      name: rec.name,
                      slug: rec.slug,
                      basePrice: rec.basePrice,
                      discountedPrice: rec.discountedPrice,
                      discountAmount: rec.basePrice - rec.discountedPrice,
                      campaignName: null,
                      averageRating: rec.averageRating,
                      totalRatings: rec.totalRatings,
                      media: [],
                    }}
                    imageUrl={rec.imageUrl}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
