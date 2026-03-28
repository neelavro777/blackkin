"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantRow {
  _rowId: string;
  size: string;
  color: string;
  fabric: string;
  stock: number;
  priceOverride: string;
}

interface MediaItem {
  storageId: Id<"_storage">;
  previewUrl: string;
  type: "image" | "video";
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let rowCounter = 0;
function newRowId() {
  return `row-${++rowCounter}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewProductPage() {
  const router = useRouter();

  // Queries
  const categories = useQuery(api.categories.listAll);
  const sizes = useQuery(api.platformConfig.listSizes);
  const colors = useQuery(api.platformConfig.listColors);
  const fabrics = useQuery(api.platformConfig.listFabrics);
  const tags = useQuery(api.tags.list);

  // Mutations
  const createProduct = useMutation(api.products.create);
  const assignTags = useMutation(api.products.assignTags);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // ── Basic Info ──────────────────────────────────────────────
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [basePrice, setBasePrice] = useState("");

  // ── Content ─────────────────────────────────────────────────
  const [fabricAndCare, setFabricAndCare] = useState("");
  const [shippingInfo, setShippingInfo] = useState("");

  // ── Variants ────────────────────────────────────────────────
  const [variants, setVariants] = useState<VariantRow[]>([
    { _rowId: newRowId(), size: "", color: "", fabric: "", stock: 0, priceOverride: "" },
  ]);

  // ── Media ───────────────────────────────────────────────────
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Tags ─────────────────────────────────────────────────────
  const [selectedTagIds, setSelectedTagIds] = useState<Set<Id<"tags">>>(new Set());

  // ── Featured ─────────────────────────────────────────────────
  const [isFeaturedBestSeller, setIsFeaturedBestSeller] = useState(false);
  const [isFeaturedNewArrival, setIsFeaturedNewArrival] = useState(false);

  // ── Submitting ───────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(slugify(val));
  }

  function handleSlugChange(val: string) {
    setSlug(val);
    setSlugManual(true);
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { _rowId: newRowId(), size: "", color: "", fabric: "", stock: 0, priceOverride: "" },
    ]);
  }

  function removeVariant(rowId: string) {
    setVariants((prev) => prev.filter((v) => v._rowId !== rowId));
  }

  function updateVariant<K extends keyof VariantRow>(
    rowId: string,
    key: K,
    value: VariantRow[K]
  ) {
    setVariants((prev) =>
      prev.map((v) => (v._rowId === rowId ? { ...v, [key]: value } : v))
    );
  }

  async function handleFileUpload(file: File) {
    setUploadingMedia(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = await result.json();
      const previewUrl = URL.createObjectURL(file);
      const type: "image" | "video" = file.type.startsWith("video/")
        ? "video"
        : "image";
      setMedia((prev) => [...prev, { storageId, previewUrl, type }]);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Media upload failed"
      );
    } finally {
      setUploadingMedia(false);
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function moveMedia(index: number, direction: "up" | "down") {
    setMedia((prev) => {
      const next = [...prev];
      const swap = direction === "up" ? index - 1 : index + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  }

  function toggleTag(tagId: Id<"tags">) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!basePrice || isNaN(Number(basePrice)) || Number(basePrice) <= 0) {
      toast.error("Enter a valid base price");
      return;
    }
    if (variants.length === 0) {
      toast.error("Add at least one variant");
      return;
    }
    for (const v of variants) {
      if (!v.size) {
        toast.error("All variants must have a size selected");
        return;
      }
    }

    setSubmitting(true);
    try {
      const productId = await createProduct({
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        description: description.trim(),
        fabricAndCare: fabricAndCare.trim() || undefined,
        shippingInfo: shippingInfo.trim() || undefined,
        categoryId: categoryId as Id<"categories">,
        basePrice: Number(basePrice),
        media: media.map((m, i) => ({
          storageId: m.storageId,
          type: m.type,
          sortOrder: i,
        })),
        variants: variants.map((v) => ({
          size: v.size,
          color: v.color || undefined,
          fabric: v.fabric || undefined,
          stock: Number(v.stock),
          priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
        })),
      });

      if (selectedTagIds.size > 0) {
        await assignTags({
          productId,
          tagIds: Array.from(selectedTagIds),
        });
      }

      if (isFeaturedBestSeller || isFeaturedNewArrival) {
        await useMutationSetFeatured({ productId, isFeaturedBestSeller, isFeaturedNewArrival });
      }

      toast.success("Product created successfully");
      router.push("/admin/products");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create product"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // We need setFeatured separately — pull the mutation at component level
  // (defined after hooks, called in submit)
  const setFeatured = useMutation(api.products.setFeatured);

  async function useMutationSetFeatured({
    productId,
    isFeaturedBestSeller,
    isFeaturedNewArrival,
  }: {
    productId: Id<"products">;
    isFeaturedBestSeller: boolean;
    isFeaturedNewArrival: boolean;
  }) {
    await setFeatured({
      id: productId,
      isFeaturedBestSeller: isFeaturedBestSeller || undefined,
      isFeaturedNewArrival: isFeaturedNewArrival || undefined,
    });
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── 1. Basic Info ── */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  required
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="product-slug"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (৳) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 2. Content ── */}
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fabricAndCare">Fabric & Care</Label>
              <Textarea
                id="fabricAndCare"
                value={fabricAndCare}
                onChange={(e) => setFabricAndCare(e.target.value)}
                placeholder="e.g. 100% cotton. Machine wash cold."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingInfo">Shipping Info</Label>
              <Textarea
                id="shippingInfo"
                value={shippingInfo}
                onChange={(e) => setShippingInfo(e.target.value)}
                placeholder="e.g. Ships within 3-5 business days."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── 3. Variants ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Variants</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="h-4 w-4 mr-1" />
              Add Variant
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {variants.map((variant, idx) => (
              <div
                key={variant._rowId}
                className="grid grid-cols-2 md:grid-cols-6 gap-3 p-3 border rounded-md items-end"
              >
                <div className="space-y-1 col-span-1">
                  <Label className="text-xs">Size *</Label>
                  <Select
                    value={variant.size}
                    onValueChange={(v) => updateVariant(variant._rowId, "size", v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                      {(sizes ?? []).map((s) => (
                        <SelectItem key={s._id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 col-span-1">
                  <Label className="text-xs">Color</Label>
                  <Select
                    value={variant.color}
                    onValueChange={(v) => updateVariant(variant._rowId, "color", v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— None —</SelectItem>
                      {(colors ?? []).map((c) => (
                        <SelectItem key={c._id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 col-span-1">
                  <Label className="text-xs">Fabric</Label>
                  <Select
                    value={variant.fabric}
                    onValueChange={(v) => updateVariant(variant._rowId, "fabric", v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Fabric" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— None —</SelectItem>
                      {(fabrics ?? []).map((f) => (
                        <SelectItem key={f._id} value={f.name}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 col-span-1">
                  <Label className="text-xs">Stock *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    className="h-9"
                    value={variant.stock}
                    onChange={(e) =>
                      updateVariant(variant._rowId, "stock", Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <Label className="text-xs">Price Override (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    className="h-9"
                    value={variant.priceOverride}
                    placeholder="Optional"
                    onChange={(e) =>
                      updateVariant(variant._rowId, "priceOverride", e.target.value)
                    }
                  />
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    disabled={variants.length === 1}
                    onClick={() => removeVariant(variant._rowId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── 4. Media ── */}
        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await handleFileUpload(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploadingMedia}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingMedia ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image / Video
                </>
              )}
            </Button>

            {media.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {media.map((item, i) => (
                  <div key={item.storageId} className="relative group rounded-md overflow-hidden border">
                    {item.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt={`media-${i}`}
                        className="w-full h-28 object-cover"
                      />
                    ) : (
                      <video
                        src={item.previewUrl}
                        className="w-full h-28 object-cover"
                        muted
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                        disabled={i === 0}
                        onClick={() => moveMedia(i, "up")}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                        disabled={i === media.length - 1}
                        onClick={() => moveMedia(i, "down")}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeMedia(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {i === 0 && (
                      <span className="absolute top-1 left-1 text-[10px] bg-black/70 text-white px-1 rounded">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 5. Tags ── */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            {!tags ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags available.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tags.map((tag) => (
                  <div key={tag._id} className="flex items-center gap-2">
                    <Checkbox
                      id={`tag-${tag._id}`}
                      checked={selectedTagIds.has(tag._id)}
                      onCheckedChange={() => toggleTag(tag._id)}
                    />
                    <Label
                      htmlFor={`tag-${tag._id}`}
                      className="cursor-pointer font-normal"
                    >
                      {tag.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 6. Featured ── */}
        <Card>
          <CardHeader>
            <CardTitle>Featured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Maximum 3 products per featured section. The server will reject if the limit is already reached.
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="bestSeller"
                checked={isFeaturedBestSeller}
                onCheckedChange={(checked) =>
                  setIsFeaturedBestSeller(checked === true)
                }
              />
              <Label htmlFor="bestSeller" className="cursor-pointer font-normal">
                Best Seller
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="newArrival"
                checked={isFeaturedNewArrival}
                onCheckedChange={(checked) =>
                  setIsFeaturedNewArrival(checked === true)
                }
              />
              <Label htmlFor="newArrival" className="cursor-pointer font-normal">
                New Arrival
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* ── Submit ── */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Product"
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
