# Product Media: Video, 3D Model & Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend product media to support 1 video (optional), 1 GLB 3D model (optional), and multiple images (optional), displayed in a unified Embla carousel with priority ordering video → 3D → images.

**Architecture:** Schema adds `"model3d"` to the media type union. The admin panel replaces its single upload zone with three dedicated zones. `MediaGallery` becomes a single Embla carousel on both desktop and mobile; the 3D slide shows explicit L/R arrow overlays since touch is consumed by OrbitControls. Three.js is lazy-loaded via `dynamic(() => import(...), { ssr: false })` so it only loads when a product actually has a 3D file. Backend thumbnail queries (`cart`, `wishlist`, `recommendations`) are updated to find the first `type === "image"` item instead of `media[0]`.

**Tech Stack:** `@react-three/fiber`, `@react-three/drei`, `three`, `@types/three`, `embla-carousel-react` (already installed)

---

## File Map

**Create:**
- `components/products/ModelViewer.tsx` — Three.js Canvas with GLTF loader, OrbitControls, Environment; lazy-loaded in MediaGallery

**Modify:**
- `convex/schema.ts:65-70` — add `v.literal("model3d")` to media type union
- `convex/products.ts:11-15` — update `mediaItemValidator` to include `"model3d"`
- `convex/recommendations.ts:44-47, 113-116` — use first image not `media[0]`
- `convex/cart.ts:48-51, 263-266` — use first image not `media[0]`
- `convex/wishlist.ts:39-42` — use first image not `media[0]`
- `components/products/MediaGallery.tsx` — rewrite as Embla carousel with 3D support
- `app/admin/products/new/page.tsx` — replace unified upload with 3-zone upload
- `app/admin/products/[productId]/page.tsx` — replace unified upload with 3-zone upload
- `app/products/page.tsx:20-24` — add `"model3d"` to `ProductMedia` type; find first image for thumbnail
- `app/products/[slug]/page.tsx:43-60` — update inline type annotations to include `"model3d"`

---

## Task 1: Install 3D Rendering Libraries

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
cd /Users/nafisashraf/Code/blackkin
npm install three @react-three/fiber @react-three/drei
npm install --save-dev @types/three
```

Expected: packages added to `node_modules`, `package.json` updated with `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install three.js and react-three-fiber for 3D model viewer"
```

---

## Task 2: Update Convex Schema and mediaItemValidator

**Files:**
- Modify: `convex/schema.ts:65-70`
- Modify: `convex/products.ts:11-15`

- [ ] **Step 1: Add `model3d` to schema media type union**

In `convex/schema.ts`, find the `media` array definition inside the `products` table (around line 65) and change:

```typescript
    // Before:
    media: v.array(
      v.object({
        storageId: v.id("_storage"),
        type: v.union(v.literal("image"), v.literal("video")),
        sortOrder: v.number(),
      })
    ),
```

To:

```typescript
    // After:
    media: v.array(
      v.object({
        storageId: v.id("_storage"),
        type: v.union(v.literal("image"), v.literal("video"), v.literal("model3d")),
        sortOrder: v.number(),
      })
    ),
```

- [ ] **Step 2: Update `mediaItemValidator` in `convex/products.ts`**

Find `mediaItemValidator` (around line 11) and change:

```typescript
// Before:
const mediaItemValidator = v.object({
  storageId: v.id("_storage"),
  type: v.union(v.literal("image"), v.literal("video")),
  sortOrder: v.number(),
});
```

To:

```typescript
// After:
const mediaItemValidator = v.object({
  storageId: v.id("_storage"),
  type: v.union(v.literal("image"), v.literal("video"), v.literal("model3d")),
  sortOrder: v.number(),
});
```

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts convex/products.ts
git commit -m "feat: add model3d media type to product schema and validator"
```

---

## Task 3: Fix Thumbnail Queries (cart, wishlist, recommendations)

These three files use `product.media[0]` for thumbnail URLs. After adding video/3D support, `media[0]` may not be an image. Update all three to find the first `type === "image"` item.

**Files:**
- Modify: `convex/recommendations.ts`
- Modify: `convex/cart.ts`
- Modify: `convex/wishlist.ts`

- [ ] **Step 1: Fix `convex/recommendations.ts`**

There are two occurrences of the thumbnail pattern. Replace both.

First occurrence (~line 44):
```typescript
// Before:
        const imageUrl =
          product.media.length > 0
            ? await ctx.storage.getUrl(product.media[0].storageId)
            : null;
```
```typescript
// After:
        const firstImage = product.media.find((m) => m.type === "image");
        const imageUrl = firstImage
          ? await ctx.storage.getUrl(firstImage.storageId)
          : null;
```

Second occurrence (~line 113):
```typescript
// Before:
          const imageUrl =
            product.media.length > 0
              ? await ctx.storage.getUrl(product.media[0].storageId)
              : null;
```
```typescript
// After:
          const firstImage = product.media.find((m) => m.type === "image");
          const imageUrl = firstImage
            ? await ctx.storage.getUrl(firstImage.storageId)
            : null;
```

- [ ] **Step 2: Fix `convex/cart.ts`**

There are two occurrences (~line 48 and ~line 263). Replace both with the same pattern:

```typescript
// Before (both occurrences):
        const imageUrl =
          product.media.length > 0
            ? await ctx.storage.getUrl(product.media[0].storageId)
            : null;
```
```typescript
// After (both occurrences):
        const firstImage = product.media.find((m) => m.type === "image");
        const imageUrl = firstImage
          ? await ctx.storage.getUrl(firstImage.storageId)
          : null;
```

- [ ] **Step 3: Fix `convex/wishlist.ts`**

One occurrence (~line 39):
```typescript
// Before:
        const imageUrl =
          product.media.length > 0
            ? await ctx.storage.getUrl(product.media[0].storageId)
            : null;
```
```typescript
// After:
        const firstImage = product.media.find((m) => m.type === "image");
        const imageUrl = firstImage
          ? await ctx.storage.getUrl(firstImage.storageId)
          : null;
```

- [ ] **Step 4: Commit**

```bash
git add convex/recommendations.ts convex/cart.ts convex/wishlist.ts
git commit -m "fix: use first image (not media[0]) for product thumbnails in cart/wishlist/recommendations"
```

---

## Task 4: Create ModelViewer Component

**Files:**
- Create: `components/products/ModelViewer.tsx`

- [ ] **Step 1: Create the file**

Create `components/products/ModelViewer.tsx` with the following content:

```typescript
"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Center } from "@react-three/drei";
import { Loader2 } from "lucide-react";

function Model({ url, onLoaded }: { url: string; onLoaded: () => void }) {
  const { scene } = useGLTF(url);

  // onLoaded fires after Suspense resolves (model is ready to render)
  useEffect(() => {
    onLoaded();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

interface ModelViewerProps {
  url: string;
}

export default function ModelViewer({ url }: ModelViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const handleLoaded = useCallback(() => setLoaded(true), []);

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <Canvas camera={{ position: [0, 0.5, 3], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <Suspense fallback={null}>
          <Model url={url} onLoaded={handleLoaded} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.8}
          enableZoom
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/products/ModelViewer.tsx
git commit -m "feat: add ModelViewer component with Three.js OrbitControls and GLTF loading"
```

---

## Task 5: Rewrite MediaGallery as Unified Embla Carousel

**Files:**
- Modify: `components/products/MediaGallery.tsx`

The new MediaGallery:
- Is a single Embla carousel on both mobile and desktop (replaces the previous split DesktopGallery/MobileGallery)
- Video slides use minimal controls (`controlsList="nodownload nofullscreen noremoteplayback"`, `disablePictureInPicture`)
- 3D slides have explicit L/R arrow buttons overlaid (since touch is consumed by OrbitControls)
- `ModelViewer` is lazy-loaded with `dynamic(..., { ssr: false })`
- Dot navigation at bottom center; counter top-right

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `components/products/MediaGallery.tsx`:

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ModelViewer = dynamic(() => import("./ModelViewer"), { ssr: false });

interface MediaItem {
  storageId: string;
  type: "image" | "video" | "model3d";
  sortOrder: number;
  url: string | null;
}

interface MediaGalleryProps {
  media: MediaItem[];
}

export default function MediaGallery({ media }: MediaGalleryProps) {
  const sorted = [...media].sort((a, b) => a.sortOrder - b.sortOrder);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentIndex, setCurrentIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (sorted.length === 0) {
    return (
      <div className="w-full aspect-[4/5] bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">No media</span>
      </div>
    );
  }

  const currentItem = sorted[currentIndex];
  const is3DSlide = currentItem?.type === "model3d";

  return (
    <div className="relative w-full select-none">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {sorted.map((item, index) => (
            <div
              key={item.storageId}
              className="flex-[0_0_100%] min-w-0 aspect-[4/5] relative bg-muted"
            >
              {!item.url ? (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">No media</span>
                </div>
              ) : item.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={`Product media ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : item.type === "video" ? (
                <video
                  src={item.url}
                  controls
                  controlsList="nodownload nofullscreen noremoteplayback"
                  disablePictureInPicture
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full">
                  <ModelViewer url={item.url} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* L/R arrows — shown only on the 3D slide (touch consumed by OrbitControls) */}
      {is3DSlide && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot navigation — clickable, bottom center */}
      {sorted.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {sorted.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentIndex ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter — top right */}
      {sorted.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded z-10">
          {currentIndex + 1}/{sorted.length}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/products/MediaGallery.tsx
git commit -m "feat: rewrite MediaGallery as Embla carousel with video, 3D, and image support"
```

---

## Task 6: Update Admin New Product Page

**Files:**
- Modify: `app/admin/products/new/page.tsx`

Replace the single-media-array approach with three separate upload zones: Video, 3D Model, Images.

- [ ] **Step 1: Update imports**

In `app/admin/products/new/page.tsx`, find the imports block at the top. Change:

```typescript
import { ArrowLeft, ArrowUp, ArrowDown, Loader2, Upload, X } from "lucide-react";
```

To:

```typescript
import { ArrowLeft, ArrowUp, ArrowDown, Loader2, Upload, X, Box } from "lucide-react";
```

- [ ] **Step 2: Replace the `MediaItem` interface and media state**

Find and remove the old `MediaItem` interface:
```typescript
interface MediaItem {
  storageId: Id<"_storage">;
  previewUrl: string;
  type: "image" | "video";
}
```

Replace with:
```typescript
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
```

- [ ] **Step 3: Replace media state and refs**

Find the `// ── Media ───` section (around line 112) and replace:

```typescript
  // ── Media ───────────────────────────────────────────────────
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
```

With:

```typescript
  // ── Media ───────────────────────────────────────────────────
  const [videoItem, setVideoItem] = useState<VideoMediaItem | null>(null);
  const [model3dItem, setModel3dItem] = useState<Model3DItem | null>(null);
  const [images, setImages] = useState<ImageMediaItem[]>([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingModel3d, setUploadingModel3d] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const model3dInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 4: Replace upload handlers**

Find and replace the entire `handleFileUpload`, `removeMedia`, and `moveMedia` functions with three new upload handlers:

```typescript
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
```

- [ ] **Step 5: Update `handleSubmit` to build media array from the 3 zones**

Find the line in `handleSubmit` that builds the media array:
```typescript
        media: media.map((m, i) => ({ storageId: m.storageId, type: m.type, sortOrder: i })),
```

Replace with:
```typescript
        media: [
          ...(videoItem ? [{ storageId: videoItem.storageId, type: "video" as const, sortOrder: 0 }] : []),
          ...(model3dItem ? [{ storageId: model3dItem.storageId, type: "model3d" as const, sortOrder: 1 }] : []),
          ...images.map((img, i) => ({ storageId: img.storageId, type: "image" as const, sortOrder: 2 + i })),
        ],
```

- [ ] **Step 6: Replace the Media card JSX**

Find the entire `{/* ── 3. Media ── */}` card in the JSX and replace it with three cards:

```tsx
        {/* ── 3a. Video ── */}
        <Card>
          <CardHeader>
            <CardTitle>
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
            <CardTitle>
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
            <CardTitle>
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
```

- [ ] **Step 7: Commit**

```bash
git add app/admin/products/new/page.tsx
git commit -m "feat: admin new product — 3-zone media upload (video, 3D model, images)"
```

---

## Task 7: Update Admin Edit Product Page

**Files:**
- Modify: `app/admin/products/[productId]/page.tsx`

Same structural changes as Task 6, plus initialization logic to split existing media by type.

- [ ] **Step 1: Update imports (add `Box`)**

```typescript
// Before:
import { Loader2, ArrowLeft, ArrowUp, ArrowDown, Upload, X, MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
```
```typescript
// After:
import { Loader2, ArrowLeft, ArrowUp, ArrowDown, Upload, X, MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight, Box } from "lucide-react";
```

- [ ] **Step 2: Replace `MediaItem` interface**

Remove:
```typescript
interface MediaItem {
  storageId: Id<"_storage">;
  previewUrl: string | null; // null for server-stored items without URL yet
  type: "image" | "video";
}
```

Add in its place:
```typescript
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
```

- [ ] **Step 3: Replace media state and refs**

Find:
```typescript
  const [media, setMedia] = useState<MediaItem[]>([]);
```
and the single `fileInputRef`:
```typescript
  const fileInputRef = useRef<HTMLInputElement>(null);
```

Remove these two lines and add:
```typescript
  const [videoItem, setVideoItem] = useState<VideoMediaItem | null>(null);
  const [model3dItem, setModel3dItem] = useState<Model3DItem | null>(null);
  const [images, setImages] = useState<ImageMediaItem[]>([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingModel3d, setUploadingModel3d] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const model3dInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
```

Also remove the existing `const [uploading, setUploading] = useState(false);` line (replaced by the three uploading states above).

- [ ] **Step 4: Update initialization `useEffect` to split media by type**

Find the initialization block inside `useEffect` that contains:
```typescript
    setMedia(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (product.media as any[]).map((m) => ({
        storageId: m.storageId,
        previewUrl: null, // existing media — no local URL
        type: m.type as "image" | "video",
      }))
    );
```

Replace with:
```typescript
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
```

- [ ] **Step 5: Replace upload handlers**

Find and replace the entire `handleFileUpload`, `removeMedia`, and `moveMedia` functions with the same three handlers as in Task 6 (video/model3D/image). Note: `setUploading` references are removed; use the three new uploading states.

```typescript
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
```

- [ ] **Step 6: Update `handleSave` media array**

Find:
```typescript
        media: media.map((m, i) => ({ storageId: m.storageId, type: m.type, sortOrder: i })),
```

Replace with:
```typescript
        media: [
          ...(videoItem ? [{ storageId: videoItem.storageId, type: "video" as const, sortOrder: 0 }] : []),
          ...(model3dItem ? [{ storageId: model3dItem.storageId, type: "model3d" as const, sortOrder: 1 }] : []),
          ...images.map((img, i) => ({ storageId: img.storageId, type: "image" as const, sortOrder: 2 + i })),
        ],
```

- [ ] **Step 7: Replace the Media card JSX**

Find the entire `{/* ── 3. Media ── */}` Card and replace with these three cards:

```tsx
        {/* ── 3a. Video ── */}
        <Card>
          <CardHeader>
            <CardTitle>
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
            <CardTitle>
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
            <CardTitle>
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
```

- [ ] **Step 8: Commit**

```bash
git add app/admin/products/[productId]/page.tsx
git commit -m "feat: admin edit product — 3-zone media upload (video, 3D model, images)"
```

---

## Task 8: Update Product Listing and Detail Pages

**Files:**
- Modify: `app/products/page.tsx`
- Modify: `app/products/[slug]/page.tsx`

- [ ] **Step 1: Update `ProductMedia` type in `app/products/page.tsx`**

Find:
```typescript
interface ProductMedia {
  storageId: Id<"_storage">;
  type: "image" | "video";
  sortOrder: number;
}
```

Replace with:
```typescript
interface ProductMedia {
  storageId: Id<"_storage">;
  type: "image" | "video" | "model3d";
  sortOrder: number;
}
```

- [ ] **Step 2: Update `ProductCardWithImage` to use first image for thumbnail**

Find:
```typescript
function ProductCardWithImage({ product }: { product: ListProduct }) {
  const storageId = product.media[0]?.storageId;
  const imageUrl = useQuery(
    api.files.getUrl,
    storageId ? { storageId } : "skip"
  );
  return <ProductCard product={product} imageUrl={imageUrl ?? null} />;
}
```

Replace with:
```typescript
function ProductCardWithImage({ product }: { product: ListProduct }) {
  const firstImage = product.media.find((m) => m.type === "image");
  const imageUrl = useQuery(
    api.files.getUrl,
    firstImage ? { storageId: firstImage.storageId } : "skip"
  );
  return <ProductCard product={product} imageUrl={imageUrl ?? null} />;
}
```

- [ ] **Step 3: Update type annotations in `app/products/[slug]/page.tsx`**

Find the first type annotation (~line 43):
```typescript
  const storageIds = product.media.map(
    (m: { storageId: Id<"_storage">; type: "image" | "video"; sortOrder: number }) =>
      m.storageId
  );
```

Replace with:
```typescript
  const storageIds = product.media.map(
    (m: { storageId: Id<"_storage">; type: "image" | "video" | "model3d"; sortOrder: number }) =>
      m.storageId
  );
```

Find the second type annotation (~line 53):
```typescript
  const resolvedMedia = product.media.map(
    (
      m: { storageId: Id<"_storage">; type: "image" | "video"; sortOrder: number },
      index: number
    ) => ({
      ...m,
      url: mediaUrls[index] ?? null,
    })
  );
```

Replace with:
```typescript
  const resolvedMedia = product.media.map(
    (
      m: { storageId: Id<"_storage">; type: "image" | "video" | "model3d"; sortOrder: number },
      index: number
    ) => ({
      ...m,
      url: mediaUrls[index] ?? null,
    })
  );
```

- [ ] **Step 4: Commit**

```bash
git add app/products/page.tsx app/products/[slug]/page.tsx
git commit -m "feat: update product listing and detail pages for model3d media type"
```

---

## Task 9: TypeScript and Convex Verification

- [ ] **Step 1: Run Convex dev until success**

```bash
cd /Users/nafisashraf/Code/blackkin
npx convex dev --until-success
```

Expected: Convex functions deploy successfully with no schema or function errors.

- [ ] **Step 2: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors. If there are errors, read the output carefully — common issues:
- Missing `"model3d"` in a type annotation somewhere — add it
- `@react-three/fiber` or `@react-three/drei` type errors — check import paths

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors from model3d media type addition"
```
