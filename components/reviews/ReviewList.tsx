"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

function StarRating({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "text-yellow-400" : "text-muted-foreground"}>
          &#9733;
        </span>
      ))}
    </span>
  );
}

export default function ReviewList({ productId }: { productId: Id<"products"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.reviews.listByProduct,
    { productId },
    { initialNumItems: 5 }
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No reviews yet. Be the first to review this product after your purchase.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((review, idx) => (
        <div key={review._id}>
          {idx > 0 && <Separator className="mb-4" />}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{review.reviewerName ?? "Customer"}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(review._creationTime).toLocaleDateString()}
              </span>
            </div>
            <StarRating rating={review.rating} />
            {review.comment && (
              <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
            )}
          </div>
        </div>
      ))}

      {status === "CanLoadMore" && (
        <Button variant="outline" size="sm" onClick={() => loadMore(5)}>
          Load More Reviews
        </Button>
      )}
    </div>
  );
}
