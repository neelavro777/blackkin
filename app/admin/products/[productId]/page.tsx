"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface VariantRow {
  id?: Id<"productVariants">;
  size: string;
  color: string;
  fabric: string;
  sku: string;
  stock: number;
  priceOverride: string;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as Id<"products">;

  const product = useQuery(api.products.getById, { id: productId });
  const categories = useQuery(api.categories.listAll);
  const tags = useQuery(api.tags.list);
  const sizes = useQuery(api.platformConfig.listSizes);
  const colors = useQuery(api.platformConfig.listColors);
  const fabrics = useQuery(api.platformConfig.listFabrics);

  const updateProduct = useMutation(api.products.update);
  const updateVariants = useMutation(api.products.updateVariants);
  const assignTags = useMutation(api.products.assignTags);
  const toggleActive = useMutation(api.products.toggleActive);
  const setFeatured = useMutation(api.products.setFeatured);
  const removeProduct = useMutation(api.products.remove);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [fabricAndCare, setFabricAndCare] = useState("");
  const [shippingInfo, setShippingInfo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<Id<"productVariants">[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<Id<"tags">>>(new Set());
  const [media, setMedia] = useState<{ storageId: Id<"_storage">; type: "image" | "video"; sortOrder: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Populate form when product loads
  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setSlug(product.slug);
    setDescription(product.description);
    setFabricAndCare(product.fabricAndCare ?? "");
    setShippingInfo(product.shippingInfo ?? "");
    setCategoryId(product.categoryId);
    setBasePrice(product.basePrice.toString());
    setMedia(product.media);
    setVariants(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (product.variants as any[]).map((variant) => ({
        id: variant._id,
        size: variant.size,
        color: variant.color ?? "",
        fabric: variant.fabric ?? "",
        sku: variant.sku ?? "",
        stock: variant.stock,
        priceOverride: variant.priceOverride?.toString() ?? "",
      }))
    );
    setSelectedTags(new Set(product.tags.map((t) => t._id)));
  }, [product]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      const type = file.type.startsWith("video/") ? "video" : "image";
      setMedia((prev) => [...prev, { storageId, type, sortOrder: prev.length }]);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !categoryId || !basePrice) {
      toast.error("Name, category, and price are required");
      return;
    }
    setSaving(true);
    try {
      await updateProduct({
        id: productId,
        name,
        slug: slug || toSlug(name),
        description,
        fabricAndCare: fabricAndCare || undefined,
        shippingInfo: shippingInfo || undefined,
        categoryId: categoryId as Id<"categories">,
        basePrice: parseFloat(basePrice),
        media,
      });
      await updateVariants({
        productId,
        variants: variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color || undefined,
          fabric: v.fabric || undefined,
          sku: v.sku || undefined,
          stock: v.stock,
          priceOverride: v.priceOverride ? parseFloat(v.priceOverride) : undefined,
        })),
        deleteIds: deletedVariantIds,
      });
      await assignTags({ productId, tagIds: Array.from(selectedTags) });
      toast.success("Product updated");
      setDeletedVariantIds([]);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeProduct({ id: productId });
      toast.success("Product deleted");
      router.push("/admin/products");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
      setDeleting(false);
    }
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/products"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Edit Product</h1>
            <p className="text-sm text-muted-foreground">{product.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleActive({ id: productId, isActive: !product.isActive }).then(() => toast.success(product.isActive ? "Deactivated" : "Activated")).catch((e) => toast.error(e.message))}
          >
            {product.isActive ? "Deactivate" : "Activate"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the product and all its variants. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant={product.isActive ? "default" : "secondary"}>
          {product.isActive ? "Active" : "Inactive"}
        </Badge>
        <Badge variant={product.isFeaturedBestSeller ? "default" : "outline"}>
          Best Seller
        </Badge>
        <Badge variant={product.isFeaturedNewArrival ? "default" : "outline"}>
          New Arrival
        </Badge>
      </div>

      {/* Featured section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Featured Sections</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Maximum 3 products per section on the landing page.</p>
          <div className="flex gap-6">
            <Button
              variant={product.isFeaturedBestSeller ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setFeatured({ id: productId, isFeaturedBestSeller: !product.isFeaturedBestSeller })
                  .then(() => toast.success("Updated"))
                  .catch((e) => toast.error(e.message))
              }
            >
              {product.isFeaturedBestSeller ? "Remove from Best Sellers" : "Add to Best Sellers"}
            </Button>
            <Button
              variant={product.isFeaturedNewArrival ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setFeatured({ id: productId, isFeaturedNewArrival: !product.isFeaturedNewArrival })
                  .then(() => toast.success("Updated"))
                  .catch((e) => toast.error(e.message))
              }
            >
              {product.isFeaturedNewArrival ? "Remove from New Arrivals" : "Add to New Arrivals"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Base Price (৳)</Label>
              <Input type="number" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fabric & Care</Label>
            <Textarea rows={2} value={fabricAndCare} onChange={(e) => setFabricAndCare(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Shipping Info</Label>
            <Textarea rows={2} value={shippingInfo} onChange={(e) => setShippingInfo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Variants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Variants</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setVariants((prev) => [...prev, { size: "", color: "", fabric: "", sku: "", stock: 0, priceOverride: "" }])}>
              <Plus className="h-4 w-4 mr-1" /> Add Variant
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-6 gap-2 items-end border rounded p-2">
              <div className="space-y-1">
                <Label className="text-xs">Size</Label>
                <Select value={v.size} onValueChange={(val) => setVariants((prev) => prev.map((r, idx) => idx === i ? { ...r, size: val } : r))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Size" /></SelectTrigger>
                  <SelectContent>{(sizes ?? []).map((s) => <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <Select value={v.color || "_none"} onValueChange={(val) => setVariants((prev) => prev.map((r, idx) => idx === i ? { ...r, color: val === "_none" ? "" : val } : r))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Any</SelectItem>
                    {(colors ?? []).map((c) => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fabric</Label>
                <Select value={v.fabric || "_none"} onValueChange={(val) => setVariants((prev) => prev.map((r, idx) => idx === i ? { ...r, fabric: val === "_none" ? "" : val } : r))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Any</SelectItem>
                    {(fabrics ?? []).map((f) => <SelectItem key={f._id} value={f.name}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stock</Label>
                <Input className="h-8 text-xs" type="number" min="0" value={v.stock} onChange={(e) => setVariants((prev) => prev.map((r, idx) => idx === i ? { ...r, stock: parseInt(e.target.value) || 0 } : r))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Override ৳</Label>
                <Input className="h-8 text-xs" type="number" min="0" placeholder="—" value={v.priceOverride} onChange={(e) => setVariants((prev) => prev.map((r, idx) => idx === i ? { ...r, priceOverride: e.target.value } : r))} />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                if (v.id) setDeletedVariantIds((prev) => [...prev, v.id!]);
                setVariants((prev) => prev.filter((_, idx) => idx !== i));
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {variants.length === 0 && <p className="text-sm text-muted-foreground">No variants. Add at least one.</p>}
        </CardContent>
      </Card>

      {/* Media */}
      <Card>
        <CardHeader><CardTitle className="text-base">Media</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {media.map((m, i) => (
              <div key={i} className="relative h-20 w-20 border rounded overflow-hidden bg-muted">
                <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">{m.type}</span>
                <Button variant="destructive" size="icon" className="absolute top-0 right-0 h-5 w-5 rounded-none" onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor="media-upload" className="cursor-pointer">
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <span>{uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading...</> : "Upload Image / Video"}</span>
              </Button>
            </Label>
            <input id="media-upload" type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {(tags ?? []).map((tag) => (
              <div key={tag._id} className="flex items-center gap-2">
                <Checkbox
                  id={tag._id}
                  checked={selectedTags.has(tag._id)}
                  onCheckedChange={(checked) => {
                    setSelectedTags((prev) => {
                      const next = new Set(prev);
                      checked ? next.add(tag._id) : next.delete(tag._id);
                      return next;
                    });
                  }}
                />
                <Label htmlFor={tag._id} className="text-sm cursor-pointer">{tag.name}</Label>
              </div>
            ))}
            {(tags ?? []).length === 0 && <p className="text-sm text-muted-foreground">No tags yet. Create tags first.</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
        </Button>
        <Button variant="outline" asChild><Link href="/admin/products">Cancel</Link></Button>
      </div>
    </div>
  );
}
