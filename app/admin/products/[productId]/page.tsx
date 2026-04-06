"use client";

import { useState, useEffect, useRef } from "react";
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
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowUp, ArrowDown, Upload, X, MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight, Box } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  VariantMatrix,
  matrixToVariants,
  variantsToMatrix,
  type StockMatrix,
} from "@/components/admin/VariantMatrix";

// ─── Types ────────────────────────────────────────────────────

interface VideoMediaItem {
  storageId: Id<"_storage">;
  previewUrl: string | null;
}
interface Model3DItem {
  storageId: Id<"_storage">;
  fileName: string;
}
interface ImageMediaItem {
  storageId: Id<"_storage">;
  previewUrl: string | null;
}

function slugify(str: string) {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Component ────────────────────────────────────────────────

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as Id<"products">;

  // ── Queries ──────────────────────────────────────────────────
  const product = useQuery(api.products.getById, { id: productId });
  const categories = useQuery(api.categories.listAll);
  const tags = useQuery(api.tags.list);
  const sizes = useQuery(api.platformConfig.listSizes);
  const colors = useQuery(api.platformConfig.listColors);

  // ── Mutations ─────────────────────────────────────────────────
  const updateProduct = useMutation(api.products.update);
  const updateVariants = useMutation(api.products.updateVariants);
  const assignTags = useMutation(api.products.assignTags);
  const toggleActive = useMutation(api.products.toggleActive);
  const removeProduct = useMutation(api.products.remove);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // ── Form state ────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [debouncedSlug, setDebouncedSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<Id<"tags">>>(new Set());
  const [videoItem, setVideoItem] = useState<VideoMediaItem | null>(null);
  const [model3dItem, setModel3dItem] = useState<Model3DItem | null>(null);
  const [images, setImages] = useState<ImageMediaItem[]>([]);
  const [existingVariantIds, setExistingVariantIds] = useState<Id<"productVariants">[]>([]);
  const [initialized, setInitialized] = useState(false);

  // ── Variant Matrix state ──────────────────────────────────────
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [stockMatrix, setStockMatrix] = useState<StockMatrix>({});

  // ── Other UI state ────────────────────────────────────────────
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingModel3d, setUploadingModel3d] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const model3dInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Slug debounce ─────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSlug(slug), 400);
    return () => clearTimeout(t);
  }, [slug]);

  const slugAvailable = useQuery(
    api.products.checkSlugAvailable,
    debouncedSlug.trim() ? { slug: debouncedSlug, excludeId: productId } : "skip"
  );
  const slugTaken = debouncedSlug.trim() && slugAvailable === false;

  // ── Populate form when product loads (once) ───────────────────
  useEffect(() => {
    if (!product || initialized) return;

    setName(product.name);
    setSlug(product.slug);
    setDescription(product.description);
    setCategoryId(product.categoryId);
    setBasePrice(product.basePrice.toString());
    setSelectedTags(new Set(product.tags.map((t) => t._id)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingVideo = (product.media as any[]).find((m) => m.type === "video");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingModel3d = (product.media as any[]).find((m) => m.type === "model3d");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingImages = (product.media as any[])
      .filter((m) => m.type === "image")
      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder);

    setVideoItem(existingVideo ? { storageId: existingVideo.storageId, previewUrl: null } : null);
    setModel3dItem(existingModel3d ? { storageId: existingModel3d.storageId, fileName: "Existing 3D model" } : null);
    setImages(existingImages.map((m: { storageId: Id<"_storage"> }) => ({ storageId: m.storageId, previewUrl: null })));

    // Pre-populate variant matrix from existing variants
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawVariants = (product.variants as any[]).map((v) => ({
      size: v.size as string,
      color: v.color as string | undefined,
      stock: (v.stock as number) ?? 0,
    }));
    const { selectedColors: cols, selectedSizes: szs, stockMatrix: mat } =
      variantsToMatrix(rawVariants);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setExistingVariantIds((product.variants as any[]).map((v) => v._id as Id<"productVariants">));
    setSelectedColors(cols);
    setSelectedSizes(szs);
    setStockMatrix(mat);
    setInitialized(true);
  }, [product, initialized]);

  // ── File upload ───────────────────────────────────────────────
  async function handleVideoUpload(file: File) {
    if (!file.type.startsWith("video/")) {
      toast.error("Only video files are allowed");
      return;
    }
    setUploadingVideo(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = await result.json();
      setVideoItem({ storageId, previewUrl: URL.createObjectURL(file) });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleModel3DUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".glb")) {
      toast.error("Only .glb files are supported");
      return;
    }
    setUploadingModel3d(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "model/gltf-binary" },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = await result.json();
      setModel3dItem({ storageId, fileName: file.name });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingModel3d(false);
    }
  }

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    setUploadingImage(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = await result.json();
      setImages((prev) => [...prev, { storageId, previewUrl: URL.createObjectURL(file) }]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function moveImage(index: number, direction: "up" | "down") {
    setImages((prev) => {
      const next = [...prev];
      const swap = direction === "up" ? index - 1 : index + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  }

  // ── Save ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!name || !categoryId || !basePrice) {
      toast.error("Name, category, and price are required");
      return;
    }
    if (slugTaken) {
      toast.error("This slug is already in use");
      return;
    }

    setSaving(true);
    try {
      await updateProduct({
        id: productId,
        name,
        slug: slug.trim() || slugify(name),
        description,
        categoryId: categoryId as Id<"categories">,
        basePrice: parseFloat(basePrice),
        media: [
          ...(videoItem ? [{ storageId: videoItem.storageId, type: "video" as const, sortOrder: 0 }] : []),
          ...(model3dItem ? [{ storageId: model3dItem.storageId, type: "model3d" as const, sortOrder: 1 }] : []),
          ...images.map((img, i) => ({ storageId: img.storageId, type: "image" as const, sortOrder: 2 + i })),
        ],
      });

      // Delete all existing variants and re-create from matrix
      const matrixVariants = matrixToVariants(stockMatrix, selectedColors, selectedSizes);
      await updateVariants({
        productId,
        variants: matrixVariants.map((v) => ({ size: v.size, color: v.color, stock: v.stock })),
        deleteIds: existingVariantIds,
      });
      // After save, new variant IDs are unknown — clear so we don't double-delete
      setExistingVariantIds([]);

      await assignTags({ productId, tagIds: Array.from(selectedTags) });
      toast.success("Product updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      await removeProduct({ id: productId });
      toast.success("Product deleted");
      router.push("/admin/products");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────
  if (!product) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasNoConfig =
    (colors !== undefined && colors.length === 0) ||
    (sizes !== undefined && sizes.length === 0);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4 mr-1" />Back
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Edit Product</h1>
            <p className="text-sm text-muted-foreground">{product.name}</p>
          </div>
        </div>

        {/* 3-dot menu for Deactivate / Delete */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                toggleActive({ id: productId, isActive: !product.isActive })
                  .then(() => toast.success(product.isActive ? "Deactivated" : "Activated"))
                  .catch((e) => toast.error(e.message))
              }
            >
              {product.isActive ? (
                <><ToggleLeft className="mr-2 h-4 w-4" />Deactivate</>
              ) : (
                <><ToggleRight className="mr-2 h-4 w-4" />Activate</>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product and all its variants. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant={product.isActive ? "default" : "secondary"}>
          {product.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* ── 1. Basic Info ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugManual) setSlug(slugify(e.target.value));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
                className={slugTaken ? "border-destructive" : ""}
              />
              {slugTaken && (
                <p className="text-xs text-destructive">This slug is already in use</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="basePrice">Base Price (৳)</Label>
              <Input
                id="basePrice"
                type="number"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Variants ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Variants &amp; Stock</CardTitle></CardHeader>
        <CardContent>
          {initialized ? (
            <VariantMatrix
              platformSizes={sizes}
              platformColors={colors}
              selectedColors={selectedColors}
              onSelectedColorsChange={setSelectedColors}
              selectedSizes={selectedSizes}
              onSelectedSizesChange={setSelectedSizes}
              stockMatrix={stockMatrix}
              onStockMatrixChange={setStockMatrix}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Loading variants…</p>
          )}
        </CardContent>
      </Card>

      {/* ── 3a. Video ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Video{" "}
            <span className="text-sm font-normal text-muted-foreground">(optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await handleVideoUpload(f);
              e.target.value = "";
            }}
          />
          {videoItem ? (
            <div className="relative group w-48 h-28 rounded-md overflow-hidden border bg-muted">
              {videoItem.previewUrl ? (
                <video src={videoItem.previewUrl} className="w-full h-full object-cover" muted />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  video
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setVideoItem(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingVideo}
              onClick={() => videoInputRef.current?.click()}
            >
              {uploadingVideo ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" />Upload Video</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── 3b. 3D Model ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            3D Model{" "}
            <span className="text-sm font-normal text-muted-foreground">(optional — GLB format)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <input
            ref={model3dInputRef}
            type="file"
            accept=".glb"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await handleModel3DUpload(f);
              e.target.value = "";
            }}
          />
          {model3dItem ? (
            <div className="flex items-center gap-3 p-3 rounded-md border bg-muted">
              <Box className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate flex-1">{model3dItem.fileName}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setModel3dItem(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingModel3d}
                onClick={() => model3dInputRef.current?.click()}
              >
                {uploadingModel3d ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Upload 3D Model</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">Only .glb files are supported</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 3c. Images ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Images{" "}
            <span className="text-sm font-normal text-muted-foreground">(optional, multiple allowed)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await handleImageUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadingImage}
            onClick={() => imageInputRef.current?.click()}
          >
            {uploadingImage ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />Upload Image</>
            )}
          </Button>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((item, i) => (
                <div key={item.storageId} className="relative group rounded-md overflow-hidden border bg-muted">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt={`image-${i}`} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 flex items-center justify-center text-xs text-muted-foreground">
                      image
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === 0}
                      onClick={() => moveImage(i, "up")}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === images.length - 1}
                      onClick={() => moveImage(i, "down")}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeImage(i)}
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

      {/* ── 4. Tags ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
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
                    checked={selectedTags.has(tag._id)}
                    onCheckedChange={(checked) => {
                      setSelectedTags((prev) => {
                        const next = new Set(prev);
                        checked ? next.add(tag._id) : next.delete(tag._id);
                        return next;
                      });
                    }}
                  />
                  <Label htmlFor={`tag-${tag._id}`} className="cursor-pointer font-normal text-sm">
                    {tag.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !!slugTaken || hasNoConfig}>
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/products">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
