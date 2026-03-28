"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recommendations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage global product recommendations. "Also Like" shows on all product pages. "Also Bought" shows at checkout.
        </p>
      </div>

      <Tabs defaultValue="also_like">
        <TabsList>
          <TabsTrigger value="also_like">You May Also Like</TabsTrigger>
          <TabsTrigger value="also_bought">People Also Bought</TabsTrigger>
        </TabsList>
        <TabsContent value="also_like" className="mt-4">
          <RecommendationSection type="also_like" />
        </TabsContent>
        <TabsContent value="also_bought" className="mt-4">
          <RecommendationSection type="also_bought" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecommendationSection({ type }: { type: "also_like" | "also_bought" }) {
  const recs = useQuery(api.recommendations.listByType, { type });
  const sizes = useQuery(api.platformConfig.listSizes);
  const addRec = useMutation(api.recommendations.add);
  const removeRec = useMutation(api.recommendations.remove);

  const [productId, setProductId] = useState("");
  const [forSize, setForSize] = useState("_all");
  const [sortOrder, setSortOrder] = useState("0");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!productId.trim()) {
      toast.error("Enter a product ID");
      return;
    }
    setAdding(true);
    try {
      await addRec({
        type,
        recommendedProductId: productId.trim() as Id<"products">,
        forSize: type === "also_bought" && forSize !== "_all" ? forSize : undefined,
        sortOrder: parseInt(sortOrder) || 0,
      });
      toast.success("Recommendation added");
      setProductId("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      {type === "also_bought" && (
        <p className="text-sm text-muted-foreground">
          For "Also Bought", you can optionally specify a size. When a customer has that size in their cart, these products will appear.
        </p>
      )}

      {/* Add form */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Add Recommendation</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Product ID</Label>
              <Input className="w-64 h-8 text-xs font-mono" placeholder="Paste Convex product ID" value={productId} onChange={(e) => setProductId(e.target.value)} />
            </div>
            {type === "also_bought" && (
              <div className="space-y-1">
                <Label className="text-xs">For Size</Label>
                <Select value={forSize} onValueChange={setForSize}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Sizes</SelectItem>
                    {(sizes ?? []).map((s) => <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Sort Order</Label>
              <Input className="w-20 h-8 text-xs" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <Button size="sm" onClick={handleAdd} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Add</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              {type === "also_bought" && <TableHead>For Size</TableHead>}
              <TableHead>Sort</TableHead>
              <TableHead className="w-16">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recs === undefined ? (
              <TableRow><TableCell colSpan={4} className="text-center py-6"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
            ) : recs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">No recommendations yet</TableCell></TableRow>
            ) : recs.map((rec) => (
              <TableRow key={rec._id}>
                <TableCell className="text-sm">
                  <p className="font-medium">{rec.productName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{rec.recommendedProductId.slice(-8)}</p>
                </TableCell>
                {type === "also_bought" && (
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{rec.forSize ?? "All Sizes"}</Badge>
                  </TableCell>
                )}
                <TableCell className="text-sm">{rec.sortOrder}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => removeRec({ id: rec._id }).then(() => toast.success("Removed")).catch((e) => toast.error(e.message))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
