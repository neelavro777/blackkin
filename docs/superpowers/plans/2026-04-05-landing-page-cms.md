# Landing Page CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CMS in the admin panel that lets admins upload replacement images for each landing page section and fully manage the testimonial quotes carousel; the landing page fetches this content server-side (SSR) using Convex.

**Architecture:** Two new Convex tables (`landingPageImages` and `landingPageQuotes`) store per-slot image references and testimonial quotes. A single `convex/landingPage.ts` file exposes a public `getContent` query (for SSR) and admin-only mutations (for the CMS). The landing page `app/page.tsx` becomes an async server component that calls `fetchAuthQuery(api.landingPage.getContent, {})` and falls back to static public-folder images if a slot has not been configured. The `QuoteCarousel` component is updated to accept quotes as props instead of a hardcoded array.

**Tech Stack:** Next.js App Router (async server components, SSR), Convex (schema, queries, mutations, file storage), Convex `fetchAuthQuery` for SSR, `useMutation`/`useQuery` from `convex/react` in admin UI, shadcn/ui components, Sonner toasts, Lucide icons.

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| **Modify** | `convex/schema.ts` | Add `landingPageImages` and `landingPageQuotes` tables |
| **Create** | `convex/landingPage.ts` | All queries and mutations for the landing-page CMS |
| **Modify** | `components/admin/AdminSidebar.tsx` | Add "Landing Page" nav item to Content group |
| **Create** | `app/admin/landing-page/page.tsx` | Admin CMS page (images + quotes management) |
| **Modify** | `components/QuoteCarousel.tsx` | Accept `quotes` prop instead of hardcoded array |
| **Modify** | `app/page.tsx` | Make async, fetch content via SSR, use dynamic URLs |

---

## Task 1 — Extend Convex Schema

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the two new tables to `convex/schema.ts`**

Append these two table definitions inside `defineSchema({...})`, after the `reviews` table and before the closing `});`:

```typescript
  // ─── LANDING PAGE CMS ─────────────────────────────────────
  // One row per image slot. Upserted by admin. Falls back to
  // static public-folder images on the frontend if absent.
  landingPageImages: defineTable({
    slot: v.union(
      v.literal("hero"),
      v.literal("lifestyleBanner"),
      v.literal("splitImage"),
      v.literal("tech1"),
      v.literal("tech2"),
      v.literal("tech3")
    ),
    storageId: v.id("_storage"),
  }).index("by_slot", ["slot"]),

  // Testimonial quotes for the homepage carousel.
  landingPageQuotes: defineTable({
    text: v.string(),
    author: v.string(),
    isActive: v.boolean(),
  }),
```

- [ ] **Step 2: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add landingPageImages and landingPageQuotes tables to schema"
```

---

## Task 2 — Convex Backend (`convex/landingPage.ts`)

**Files:**
- Create: `convex/landingPage.ts`

- [ ] **Step 1: Create the file with all queries and mutations**

```typescript
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth.helpers";

// ─── Slot union (reused in args validators) ────────────────────────────────
const slotValidator = v.union(
  v.literal("hero"),
  v.literal("lifestyleBanner"),
  v.literal("splitImage"),
  v.literal("tech1"),
  v.literal("tech2"),
  v.literal("tech3")
);

// ─── PUBLIC QUERY (used by SSR on the landing page) ────────────────────────
/**
 * Returns resolved image URLs (null = slot not configured → use static fallback)
 * and all active quotes in insertion order.
 */
export const getContent = query({
  args: {},
  handler: async (ctx) => {
    const slots = [
      "hero",
      "lifestyleBanner",
      "splitImage",
      "tech1",
      "tech2",
      "tech3",
    ] as const;

    const imageEntries = await Promise.all(
      slots.map(async (slot) => {
        const row = await ctx.db
          .query("landingPageImages")
          .withIndex("by_slot", (q) => q.eq("slot", slot))
          .first();
        const url = row ? await ctx.storage.getUrl(row.storageId) : null;
        return [slot, url] as const;
      })
    );

    const images = Object.fromEntries(imageEntries) as Record<
      (typeof slots)[number],
      string | null
    >;

    const quotes = await ctx.db
      .query("landingPageQuotes")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return { images, quotes };
  },
});

// ─── ADMIN QUERY — all image slots ─────────────────────────────────────────
/**
 * Returns every configured slot with its current URL so the admin CMS
 * can show a preview. Returns only rows that have been saved.
 */
export const adminGetImages = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("landingPageImages").collect();
    return await Promise.all(
      rows.map(async (row) => ({
        slot: row.slot,
        storageId: row.storageId,
        url: await ctx.storage.getUrl(row.storageId),
      }))
    );
  },
});

// ─── ADMIN QUERY — all quotes ───────────────────────────────────────────────
/**
 * Returns all quotes (active + inactive) ordered by creation time asc.
 * Used by the admin CMS quote management table.
 */
export const adminGetAllQuotes = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("landingPageQuotes").order("asc").collect();
  },
});

// ─── ADMIN MUTATION — upsert image slot ────────────────────────────────────
/**
 * Saves (or replaces) a storageId for the given landing-page image slot.
 * Idempotent: subsequent calls replace the previous storageId.
 */
export const updateImage = mutation({
  args: {
    slot: slotValidator,
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { slot, storageId }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("landingPageImages")
      .withIndex("by_slot", (q) => q.eq("slot", slot))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { storageId });
    } else {
      await ctx.db.insert("landingPageImages", { slot, storageId });
    }
  },
});

// ─── ADMIN MUTATION — add quote ────────────────────────────────────────────
export const addQuote = mutation({
  args: {
    text: v.string(),
    author: v.string(),
  },
  handler: async (ctx, { text, author }) => {
    await requireAdmin(ctx);
    await ctx.db.insert("landingPageQuotes", { text, author, isActive: true });
  },
});

// ─── ADMIN MUTATION — update quote text/author ─────────────────────────────
export const updateQuote = mutation({
  args: {
    id: v.id("landingPageQuotes"),
    text: v.string(),
    author: v.string(),
  },
  handler: async (ctx, { id, text, author }) => {
    await requireAdmin(ctx);
    const quote = await ctx.db.get(id);
    if (!quote) throw new ConvexError("Quote not found");
    await ctx.db.patch(id, { text, author });
  },
});

// ─── ADMIN MUTATION — toggle quote active/inactive ─────────────────────────
export const toggleQuoteActive = mutation({
  args: { id: v.id("landingPageQuotes") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const quote = await ctx.db.get(id);
    if (!quote) throw new ConvexError("Quote not found");
    await ctx.db.patch(id, { isActive: !quote.isActive });
  },
});

// ─── ADMIN MUTATION — delete quote ─────────────────────────────────────────
export const deleteQuote = mutation({
  args: { id: v.id("landingPageQuotes") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const quote = await ctx.db.get(id);
    if (!quote) throw new ConvexError("Quote not found");
    await ctx.db.delete(id);
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add convex/landingPage.ts
git commit -m "feat: add landing page CMS queries and mutations"
```

---

## Task 3 — Admin Sidebar Nav Item

**Files:**
- Modify: `components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Add the `Layout` icon import and the nav item**

In `components/admin/AdminSidebar.tsx`:

1. Add `Layout` to the lucide-react import (it's already importing from lucide-react):
```typescript
import {
  LayoutDashboard,
  Package,
  Tag,
  FolderOpen,
  ShoppingCart,
  Users,
  Megaphone,
  Star,
  Ruler,
  Sparkles,
  Layout,           // ← add this
} from "lucide-react";
```

2. In the `"Content"` navGroup's `items` array, add the Landing Page entry as the **first** item:
```typescript
  {
    label: "Content",
    items: [
      { href: "/admin/landing-page", label: "Landing Page", icon: Layout }, // ← add
      { href: "/admin/recommendations", label: "Recommendations", icon: Sparkles },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
    ],
  },
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/AdminSidebar.tsx
git commit -m "feat: add Landing Page nav item to admin sidebar"
```

---

## Task 4 — Admin CMS Page

**Files:**
- Create: `app/admin/landing-page/page.tsx`

This is a single client component split into three logical sections:
1. Image slot cards with file-upload buttons
2. Quote list
3. Add/Edit quote dialog

- [ ] **Step 1: Create the admin landing page CMS**

```typescript
"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Trash2, Upload, ToggleLeft, ToggleRight } from "lucide-react";

// ─── Image slot metadata ────────────────────────────────────────────────────
type ImageSlot =
  | "hero"
  | "lifestyleBanner"
  | "splitImage"
  | "tech1"
  | "tech2"
  | "tech3";

const IMAGE_SLOTS: { slot: ImageSlot; label: string; description: string }[] = [
  {
    slot: "hero",
    label: "Hero Banner",
    description: "Full-screen background image behind \"BE BOLD\"",
  },
  {
    slot: "lifestyleBanner",
    label: "Lifestyle Banner",
    description: "\"Upgrade The Way You Feel\" full-screen section background",
  },
  {
    slot: "splitImage",
    label: "Split Section Image",
    description: "Right side of the dark/image split section",
  },
  {
    slot: "tech1",
    label: "Technology Image 1",
    description: "Graphene Antibacterial Inner Crotch",
  },
  {
    slot: "tech2",
    label: "Technology Image 2",
    description: "Dynamic Stretch",
  },
  {
    slot: "tech3",
    label: "Technology Image 3",
    description: "Wormwood Essential Oil Care",
  },
];

// ─── Types ──────────────────────────────────────────────────────────────────
type Quote = {
  _id: Id<"landingPageQuotes">;
  _creationTime: number;
  text: string;
  author: string;
  isActive: boolean;
};

type QuoteDialogState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; quote: Quote };

// ─── Quote Dialog ───────────────────────────────────────────────────────────
function QuoteDialog({
  state,
  onClose,
}: {
  state: QuoteDialogState;
  onClose: () => void;
}) {
  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.quote : null;

  const [text, setText] = useState(initial?.text ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [loading, setLoading] = useState(false);

  const addMutation = useMutation(api.landingPage.addQuote);
  const updateMutation = useMutation(api.landingPage.updateQuote);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !author.trim()) return;
    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({ id: state.quote._id, text: text.trim(), author: author.trim() });
        toast.success("Quote updated");
      } else {
        await addMutation({ text: text.trim(), author: author.trim() });
        toast.success("Quote added");
      }
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Quote" : "Add Quote"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="quote-text">Quote Text</Label>
          <Textarea
            id="quote-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter the customer quote…"
            rows={4}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quote-author">Author Name</Label>
          <Input
            id="quote-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g. Farhan Ahmed"
            required
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : isEdit ? "Update" : "Add Quote"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function LandingPageCmsPage() {
  // Image data
  const imageRows = useQuery(api.landingPage.adminGetImages);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const updateImage = useMutation(api.landingPage.updateImage);

  // Quote data
  const quotes = useQuery(api.landingPage.adminGetAllQuotes);
  const toggleQuote = useMutation(api.landingPage.toggleQuoteActive);
  const deleteQuote = useMutation(api.landingPage.deleteQuote);

  // Upload tracking: slot → true while uploading
  const [uploading, setUploading] = useState<Partial<Record<ImageSlot, boolean>>>({});
  const fileInputRefs = useRef<Partial<Record<ImageSlot, HTMLInputElement | null>>>({});

  // Quote dialog
  const [quoteDialog, setQuoteDialog] = useState<QuoteDialogState>({ mode: "closed" });
  const [togglingId, setTogglingId] = useState<Id<"landingPageQuotes"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"landingPageQuotes"> | null>(null);

  // Build a map of slot → current URL for easy lookup
  const imageMap = Object.fromEntries(
    (imageRows ?? []).map((r) => [r.slot, r.url])
  ) as Partial<Record<ImageSlot, string | null>>;

  // ── Image upload handler ──────────────────────────────────────────────────
  async function handleFileChange(slot: ImageSlot, file: File) {
    setUploading((prev) => ({ ...prev, [slot]: true }));
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = await response.json();
      await updateImage({ slot, storageId });
      toast.success(`${IMAGE_SLOTS.find((s) => s.slot === slot)?.label} updated`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading((prev) => ({ ...prev, [slot]: false }));
      // Reset file input so the same file can be re-selected
      const input = fileInputRefs.current[slot];
      if (input) input.value = "";
    }
  }

  // ── Quote action handlers ─────────────────────────────────────────────────
  async function handleToggleQuote(quote: Quote) {
    setTogglingId(quote._id);
    try {
      await toggleQuote({ id: quote._id });
      toast.success(quote.isActive ? "Quote hidden" : "Quote shown");
    } catch {
      toast.error("Failed to update quote");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDeleteQuote(quote: Quote) {
    if (!confirm(`Delete quote by "${quote.author}"? This cannot be undone.`)) return;
    setDeletingId(quote._id);
    try {
      await deleteQuote({ id: quote._id });
      toast.success("Quote deleted");
    } catch {
      toast.error("Failed to delete quote");
    } finally {
      setDeletingId(null);
    }
  }

  const isQuoteDialogOpen = quoteDialog.mode !== "closed";

  return (
    <div className="space-y-10">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-semibold">Landing Page</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage homepage section images and testimonial quotes.
        </p>
      </div>

      {/* ── Images section ── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">Section Images</h2>
        <p className="text-sm text-muted-foreground">
          Upload replacement images for each homepage section. Visitors will see the new image after refreshing the page.
        </p>

        {imageRows === undefined ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading images…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {IMAGE_SLOTS.map(({ slot, label, description }) => {
              const currentUrl = imageMap[slot];
              const isUploading = uploading[slot] ?? false;

              return (
                <div
                  key={slot}
                  className="rounded-md border border-border overflow-hidden flex flex-col"
                >
                  {/* Image preview */}
                  <div className="bg-muted aspect-video relative flex items-center justify-center overflow-hidden">
                    {currentUrl ? (
                      <img
                        src={currentUrl}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground text-center px-4">
                        <Upload className="h-6 w-6 mx-auto mb-1 opacity-40" />
                        Using default image
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Slot info + upload button */}
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-auto"
                      disabled={isUploading}
                      onClick={() => fileInputRefs.current[slot]?.click()}
                    >
                      {isUploading ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading…</>
                      ) : (
                        <><Upload className="h-3.5 w-3.5 mr-1.5" /> {currentUrl ? "Replace Image" : "Upload Image"}</>
                      )}
                    </Button>
                    {/* Hidden file input */}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[slot] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileChange(slot, file);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Quotes section ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-base font-semibold">Testimonial Quotes</h2>
          <Button size="sm" onClick={() => setQuoteDialog({ mode: "add" })}>
            Add Quote
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          These quotes appear in the homepage carousel. Toggle visibility to show or hide individual quotes.
        </p>

        <Dialog
          open={isQuoteDialogOpen}
          onOpenChange={(open) => !open && setQuoteDialog({ mode: "closed" })}
        >
          {isQuoteDialogOpen && (
            <QuoteDialog
              state={quoteDialog}
              onClose={() => setQuoteDialog({ mode: "closed" })}
            />
          )}
        </Dialog>

        {quotes === undefined ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading quotes…
          </div>
        ) : quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No quotes yet. Add your first testimonial above.
          </p>
        ) : (
          <div className="rounded-md border divide-y">
            {quotes.map((quote) => (
              <div
                key={quote._id}
                className="flex items-start gap-3 px-4 py-3 bg-background"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm line-clamp-2 text-foreground">{quote.text}</p>
                  <p className="text-xs text-muted-foreground">— {quote.author}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                  <Badge variant={quote.isActive ? "default" : "secondary"} className="text-xs">
                    {quote.isActive ? "Visible" : "Hidden"}
                  </Badge>
                  {/* Toggle active */}
                  <button
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    title={quote.isActive ? "Hide quote" : "Show quote"}
                    disabled={togglingId === quote._id}
                    onClick={() => handleToggleQuote(quote)}
                  >
                    {togglingId === quote._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : quote.isActive ? (
                      <ToggleRight className="h-3.5 w-3.5" />
                    ) : (
                      <ToggleLeft className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {/* Edit */}
                  <button
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Edit quote"
                    onClick={() => setQuoteDialog({ mode: "edit", quote })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {/* Delete */}
                  <button
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-600 disabled:opacity-50"
                    title="Delete quote"
                    disabled={deletingId === quote._id}
                    onClick={() => handleDeleteQuote(quote)}
                  >
                    {deletingId === quote._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/landing-page/page.tsx
git commit -m "feat: add admin landing page CMS with image upload and quote management"
```

---

## Task 5 — Update QuoteCarousel to Accept Props

**Files:**
- Modify: `components/QuoteCarousel.tsx`

The carousel currently has a hardcoded `quotes` array. Replace it with a `quotes` prop so the landing page can pass server-fetched quotes. Keep the fallback behaviour: if the prop is empty the component renders `null` (section hidden).

- [ ] **Step 1: Rewrite `components/QuoteCarousel.tsx`**

Replace the entire file content:

```typescript
"use client";

import { useState } from "react";

export interface CarouselQuote {
  _id: string;
  text: string;
  author: string;
}

interface QuoteCarouselProps {
  quotes: CarouselQuote[];
}

export function QuoteCarousel({ quotes }: QuoteCarouselProps) {
  const [active, setActive] = useState(0);

  if (quotes.length === 0) return null;

  const safeActive = active % quotes.length;
  const quote = quotes[safeActive];

  const prev = () =>
    setActive((i) => (i - 1 + quotes.length) % quotes.length);
  const next = () => setActive((i) => (i + 1) % quotes.length);

  return (
    <section className="relative w-full bg-[#f5f5f5] py-24 md:py-32 flex items-center justify-center overflow-hidden">
      {/* Prev Arrow */}
      <button
        onClick={prev}
        aria-label="Previous quote"
        className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-gray-400 flex items-center justify-center text-gray-500 hover:border-gray-700 hover:text-gray-700 transition-colors text-sm"
      >
        &#8249;
      </button>

      {/* Quote Content */}
      <div className="max-w-2xl mx-auto px-16 md:px-20 text-center">
        {/* Large quotation mark */}
        <div className="text-6xl md:text-7xl text-gray-200 leading-none select-none mb-6 font-serif">
          &rdquo;
        </div>

        {/* Quote text */}
        <p className="text-base md:text-lg text-foreground leading-relaxed tracking-wide">
          {quote.text}
        </p>

        {/* Author */}
        <p className="mt-6 text-sm text-muted-foreground tracking-[0.1em]">
          {quote.author}
        </p>
      </div>

      {/* Next Arrow */}
      <button
        onClick={next}
        aria-label="Next quote"
        className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-gray-400 flex items-center justify-center text-gray-500 hover:border-gray-700 hover:text-gray-700 transition-colors text-sm"
      >
        &#8250;
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/QuoteCarousel.tsx
git commit -m "refactor: QuoteCarousel accepts quotes as props instead of hardcoded array"
```

---

## Task 6 — Landing Page SSR

**Files:**
- Modify: `app/page.tsx`

Make `HomePage` an async server component. Fetch `api.landingPage.getContent` via `fetchAuthQuery`. Use the resolved image URLs with static-file fallbacks. Pass quotes to `<QuoteCarousel>`.

- [ ] **Step 1: Rewrite `app/page.tsx`**

Replace the entire file:

```typescript
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { QuoteCarousel } from "@/components/QuoteCarousel";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";

export const metadata = {
  title: "Blackkin | Premium Comfort",
  description: "Shop premium undergarments. Crafted for lasting comfort and style.",
};

export default async function HomePage() {
  // Fetch CMS content server-side. Falls back gracefully if DB has no entries yet.
  const content = await fetchAuthQuery(api.landingPage.getContent, {});

  // Resolve each image URL, falling back to static public-folder images.
  const heroSrc          = content.images.hero           ?? "/hero-banner.png";
  const lifestyleSrc     = content.images.lifestyleBanner ?? "/lifestyle-banner.png";
  const splitImageSrc    = content.images.splitImage      ?? "/lifestyle-banner.png";
  const tech1Src         = content.images.tech1           ?? "/3imagesection1.png";
  const tech2Src         = content.images.tech2           ?? "/3imagesection2.png";
  const tech3Src         = content.images.tech3           ?? "/3imagesection3.png";

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-gray-100" style={{ minHeight: "90vh" }}>
        <div className="absolute inset-0">
          <img
            src={heroSrc}
            alt="Blackkin Hero"
            className="w-full h-full object-cover object-center"
            style={{ objectPosition: "center top" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-8 lg:px-16" style={{ minHeight: "90vh" }}>
          <div className="max-w-xl">
            <p className="text-white/70 text-xs tracking-[0.3em] uppercase mb-4">Premium Comfort</p>
            <h1 className="text-white text-5xl md:text-7xl font-bold tracking-tight leading-none mb-6">
              BE<br />BOLD
            </h1>
            <Link
              href="/products"
              className="inline-block bg-white text-black text-xs font-semibold tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-white/90 transition-colors"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Crafted for the Modern Man */}
      <section className="w-full py-24 md:py-32 px-6 text-center border-b border-border">
        <h2 className="text-4xl md:text-6xl font-thin tracking-[0.22em] uppercase leading-snug">
          <span className="block text-foreground">Crafted for the</span>
          <span className="block text-gray-300">Modern Man.</span>
        </h2>
        <p className="mt-10 text-sm italic text-muted-foreground max-w-xl mx-auto leading-relaxed">
          &ldquo;We Believe That What You Wear Closest To Your Skin Should Be Your Most Considered Choice.&rdquo;
        </p>
      </section>

      {/* Lifestyle Banner */}
      <section className="w-full h-screen relative overflow-hidden bg-black">
        <img
          src={lifestyleSrc}
          alt="Blackkin Lifestyle"
          className="w-full h-full object-cover absolute inset-0 opacity-60"
        />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-6">
          <p className="text-xs tracking-[0.4em] uppercase text-white/70 mb-4">Upgrade The Way You Feel</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-2xl">
            Designed for<br />
            <em className="not-italic text-white/80">Everyday</em> Heroes
          </h2>
          <Link
            href="/products"
            className="mt-8 inline-block border border-white text-white text-xs font-semibold tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-white hover:text-black transition-colors"
          >
            Shop Collection
          </Link>
        </div>
      </section>

      {/* Split: Text Left / Image Right */}
      <section className="w-full h-screen grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-[#111111] flex flex-col justify-center px-12 lg:px-20 py-16 h-full">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-[0.06em] leading-tight text-white">
            Upgrade the way<br />
            you feel, starting<br />
            with what&apos;s<br />
            <span className="text-white/40">Underneath</span>
            <span className="text-white">.</span>
          </h2>
          <Link
            href="/products"
            className="mt-8 inline-block text-xs tracking-[0.25em] uppercase text-white underline underline-offset-4 hover:text-white/60 transition-colors w-fit"
          >
            Discover More
          </Link>
        </div>
        <div className="relative h-full min-h-[50vh] lg:min-h-0">
          <img
            src={splitImageSrc}
            alt="Upgrade the way you feel"
            className="w-full h-full object-cover object-center"
          />
        </div>
      </section>

      {/* Premium Comfort Technology */}
      <section className="w-full bg-white border-t border-border">
        {/* Section Header */}
        <div className="text-center py-16 px-6">
          <h2 className="text-4xl md:text-5xl font-thin tracking-[0.22em] uppercase leading-snug">
            <span className="block text-foreground">Premium Comfort</span>
            <span className="block text-gray-300">Technology</span>
          </h2>
        </div>

        {/* 3-Image Grid */}
        <div className="grid grid-cols-3 w-full">
          {/* Image 1 */}
          <div className="flex flex-col">
            <div className="w-full aspect-[3/4] overflow-hidden">
              <img
                src={tech1Src}
                alt="Graphene Antibacterial Inner Crotch"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="py-5 px-4 text-center bg-white">
              <p className="text-sm text-foreground tracking-wide">Graphene Antibacterial Inner Crotch</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Wicks away moisture, dries quickly and keep you dry all day long.
              </p>
              <Link
                href="/products"
                className="mt-2 inline-block text-xs tracking-[0.2em] uppercase underline underline-offset-2 text-foreground hover:text-muted-foreground transition-colors"
              >
                Discover More
              </Link>
            </div>
          </div>

          {/* Image 2 */}
          <div className="flex flex-col">
            <div className="w-full aspect-[3/4] overflow-hidden">
              <img
                src={tech2Src}
                alt="Dynamic Stretch"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="py-5 px-4 text-center bg-white">
              <p className="text-sm text-foreground tracking-wide">Dynamic Stretch</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                4-way stretch fabric that moves with you, never against you.
              </p>
              <Link
                href="/products"
                className="mt-2 inline-block text-xs tracking-[0.2em] uppercase underline underline-offset-2 text-foreground hover:text-muted-foreground transition-colors"
              >
                Discover More
              </Link>
            </div>
          </div>

          {/* Image 3 */}
          <div className="flex flex-col">
            <div className="w-full aspect-[3/4] overflow-hidden">
              <img
                src={tech3Src}
                alt="Wormwood Essential Oil Care"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="py-5 px-4 text-center bg-white">
              <p className="text-sm text-foreground tracking-wide">Wormwood Essential Oil Care</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                7A Grade antibacterial and deodorizing.
              </p>
              <Link
                href="/products"
                className="mt-2 inline-block text-xs tracking-[0.2em] uppercase underline underline-offset-2 text-foreground hover:text-muted-foreground transition-colors"
              >
                Discover More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quotes Carousel — hidden if no quotes have been added yet */}
      <QuoteCarousel quotes={content.quotes} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: landing page fetches CMS images and quotes via SSR"
```

---

## Verification

After all tasks are committed:

1. **Run the dev server:** `npm run dev`

2. **Check the landing page** at `http://localhost:3000`:
   - All images still display (static fallbacks working)
   - The QuoteCarousel section is hidden (no quotes in DB yet)

3. **Check the admin panel** at `http://localhost:3000/admin/landing-page`:
   - "Landing Page" nav item appears in the sidebar under Content
   - 6 image slot cards render with "Using default image" placeholder
   - "No quotes yet" message appears in the quotes section

4. **Upload an image** (e.g. hero slot):
   - Click "Upload Image" → pick a file
   - Preview updates immediately in the admin card
   - Refresh `http://localhost:3000` → new image appears in the hero section

5. **Add a quote:**
   - Click "Add Quote" → fill in text + author → save
   - Quote appears in the admin list with "Visible" badge
   - Refresh `http://localhost:3000` → QuoteCarousel now shows the quote

6. **Build check:** `npm run build` — no TypeScript errors

---

## Notes

- The `getContent` query is fully public (no `requireAdmin`). The SSR call from `page.tsx` works regardless of the visitor's auth status.
- Image uploads use the **existing** `api.files.generateUploadUrl` mutation — no new upload infrastructure needed.
- The `splitImage` slot defaults to `lifestyle-banner.png`. Admin can set it independently from `lifestyleBanner` later.
- The `QuoteCarousel` renders `null` (entire section hidden) until at least one active quote exists in the database — no empty-carousel flash.
