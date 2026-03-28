"use client";

import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { useState } from "react";

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

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<"pending" | "approved">("pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">Moderate customer reviews before they appear on product pages</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "approved")}>
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "pending" ? <PendingReviews /> : <ApprovedReviews />}
    </div>
  );
}

function PendingReviews() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.reviews.listPending,
    {},
    { initialNumItems: 20 }
  );
  const approve = useMutation(api.reviews.approve);
  const reject = useMutation(api.reviews.reject);

  async function handleApprove(id: Id<"reviews">) {
    try {
      await approve({ reviewId: id });
      toast.success("Review approved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleReject(id: Id<"reviews">) {
    try {
      await reject({ reviewId: id });
      toast.success("Review rejected");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reviewer</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage" ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No pending reviews
                </TableCell>
              </TableRow>
            ) : results.map((review) => (
              <TableRow key={review._id}>
                <TableCell className="text-sm">{review.reviewerName ?? "—"}</TableCell>
                <TableCell><StarRating rating={review.rating} /></TableCell>
                <TableCell className="text-sm max-w-xs">
                  <p className="truncate">{review.comment ?? <span className="text-muted-foreground italic">No comment</span>}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(review._creationTime).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                      onClick={() => handleApprove(review._id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => handleReject(review._id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {status === "CanLoadMore" && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => loadMore(20)}>Load More</Button>
        </div>
      )}
    </div>
  );
}

function ApprovedReviews() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.reviews.listApproved,
    {},
    { initialNumItems: 20 }
  );
  const reject = useMutation(api.reviews.reject);

  async function handleReject(id: Id<"reviews">) {
    try {
      await reject({ reviewId: id });
      toast.success("Review removed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reviewer</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-16">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage" ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No approved reviews yet
                </TableCell>
              </TableRow>
            ) : results.map((review) => (
              <TableRow key={review._id}>
                <TableCell className="text-sm">{review.reviewerName ?? "—"}</TableCell>
                <TableCell><StarRating rating={review.rating} /></TableCell>
                <TableCell className="text-sm max-w-xs">
                  <p className="truncate">{review.comment ?? <span className="text-muted-foreground italic">No comment</span>}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(review._creationTime).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => handleReject(review._id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {status === "CanLoadMore" && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => loadMore(20)}>Load More</Button>
        </div>
      )}
    </div>
  );
}
