# Tag-Driven Product Showcase Sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual product-picking in landing page showcase sections with tag-based automatic population, keeping drag-to-reorder for custom sort and adding cascade sync on tag/product changes.

**Architecture:** Add `tagId` to `landingPageProductSections`; `landingPageProductSectionItems` continues to store per-product sort order, seeded when a tag is chosen. Backend keeps items in sync when tags change on products or tags are deleted. Admin UI replaces the product search picker with a tag dropdown plus a 3-dots "Clear Section" button.

**Tech Stack:** Convex (queries/mutations), Next.js App Router, shadcn/ui Select component, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-04-06-tag-driven-product-showcase-design.md`

---

## File Map

| File | Change |
|---|---|
| `convex/schema.ts` | Add `tagId` + `by_tagId` index to `landingPageProductSections`; add `by_productId` index to `landingPageProductSectionItems` |
| `convex/landingPage.ts` | New: `setTagForSection`, `clearSection`; update `adminGetProductSections`; remove `addProductToSection`, `removeProductFromSection` |
| `convex/tags.ts` | Update `remove` to cascade-clear sections using the deleted tag |
| `convex/products.ts` | Update `assignTags` to sync section items; update `remove` to clean up section items |
| `app/admin/landing-page/page.tsx` | Update `AdminSection` type; rewrite `ProductSectionEditor` component |

---

## Task 1: Schema — add tagId and indexes

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add `tagId` optional field + `by_tagId` index to `landingPageProductSections`**

In `convex/schema.ts`, replace the `landingPageProductSections` table definition:

```typescript
// BEFORE
landingPageProductSections: defineTable({
  position: v.union(v.literal(1), v.literal(2)),
  heading: v.string(),
  isActive: v.boolean(),
})
  .index("by_position", ["position"])
  .index("by_isActive", ["isActive"]),

// AFTER
landingPageProductSections: defineTable({
  position: v.union(v.literal(1), v.literal(2)),
  heading: v.string(),
  isActive: v.boolean(),
  tagId: v.optional(v.id("tags")),
})
  .index("by_position", ["position"])
  .index("by_isActive", ["isActive"])
  .index("by_tagId", ["tagId"]),
```

- [ ] **Step 2: Add `by_productId` index to `landingPageProductSectionItems`**

In `convex/schema.ts`, replace the `landingPageProductSectionItems` table definition:

```typescript
// BEFORE
landingPageProductSectionItems: defineTable({
  sectionId: v.id("landingPageProductSections"),
  productId: v.id("products"),
  sortOrder: v.number(),
})
  .index("by_sectionId", ["sectionId"])
  .index("by_sectionId_and_sortOrder", ["sectionId", "sortOrder"])
  .index("by_sectionId_and_productId", ["sectionId", "productId"]),

// AFTER
landingPageProductSectionItems: defineTable({
  sectionId: v.id("landingPageProductSections"),
  productId: v.id("products"),
  sortOrder: v.number(),
})
  .index("by_sectionId", ["sectionId"])
  .index("by_sectionId_and_sortOrder", ["sectionId", "sortOrder"])
  .index("by_sectionId_and_productId", ["sectionId", "productId"])
  .index("by_productId", ["productId"]),
```

- [ ] **Step 3: Verify Convex dev server accepts the schema**

Run `npx convex dev` (or check the already-running dev server logs). Expected: no type errors or schema validation failures. The new optional field and indexes should be accepted without a migration.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add tagId field and indexes to landing page product section tables"
```

---

## Task 2: Backend — new `setTagForSection` and `clearSection` mutations

**Files:**
- Modify: `convex/landingPage.ts`

- [ ] **Step 1: Add `setTagForSection` mutation at the end of `convex/landingPage.ts`**

```typescript
// ─── ADMIN MUTATION — set tag for section (populates items from tag) ─────────
export const setTagForSection = mutation({
  args: {
    sectionId: v.id("landingPageProductSections"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, { sectionId, tagId }) => {
    await requireAdmin(ctx);

    const section = await ctx.db.get(sectionId);
    if (!section) throw new ConvexError("Section not found");

    const tag = await ctx.db.get(tagId);
    if (!tag) throw new ConvexError("Tag not found");

    // Clear all existing items
    const existingItems = await ctx.db
      .query("landingPageProductSectionItems")
      .withIndex("by_sectionId", (q) => q.eq("sectionId", sectionId))
      .collect();
    await Promise.all(existingItems.map((item) => ctx.db.delete(item._id)));

    // Set the new tag
    await ctx.db.patch(sectionId, { tagId });

    // Populate items from all products with this tag
    const productTagRows = await ctx.db
      .query("productTags")
      .withIndex("by_tagId", (q) => q.eq("tagId", tagId))
      .collect();

    await Promise.all(
      productTagRows.map((pt, index) =>
        ctx.db.insert("landingPageProductSectionItems", {
          sectionId,
          productId: pt.productId,
          sortOrder: index,
        })
      )
    );
  },
});
```

- [ ] **Step 2: Add `clearSection` mutation immediately after**

```typescript
// ─── ADMIN MUTATION — clear tag and all items from section ───────────────────
export const clearSection = mutation({
  args: {
    sectionId: v.id("landingPageProductSections"),
  },
  handler: async (ctx, { sectionId }) => {
    await requireAdmin(ctx);

    const section = await ctx.db.get(sectionId);
    if (!section) throw new ConvexError("Section not found");

    // Remove tag
    await ctx.db.patch(sectionId, { tagId: undefined });

    // Delete all items
    const items = await ctx.db
      .query("landingPageProductSectionItems")
      .withIndex("by_sectionId", (q) => q.eq("sectionId", sectionId))
      .collect();
    await Promise.all(items.map((item) => ctx.db.delete(item._id)));
  },
});
```

- [ ] **Step 3: Verify dev server regenerates API types**

After saving, `npx convex dev` should regenerate `convex/_generated/api.d.ts` with `api.landingPage.setTagForSection` and `api.landingPage.clearSection` exported.

- [ ] **Step 4: Commit**

```bash
git add convex/landingPage.ts
git commit -m "feat: add setTagForSection and clearSection mutations"
```

---

## Task 3: Backend — update `adminGetProductSections` to return tag info

**Files:**
- Modify: `convex/landingPage.ts` (the `adminGetProductSections` query, lines ~246–318)

- [ ] **Step 1: Update the section push when section exists**

In `adminGetProductSections`, replace the block that pushes a found section:

```typescript
// BEFORE
sections.push({
  _id: section._id,
  position: section.position,
  heading: section.heading,
  isActive: section.isActive,
  products,
});

// AFTER
const tagName = section.tagId
  ? (await ctx.db.get(section.tagId))?.name ?? null
  : null;

sections.push({
  _id: section._id,
  position: section.position,
  heading: section.heading,
  isActive: section.isActive,
  tagId: section.tagId ?? null,
  tagName,
  products,
});
```

- [ ] **Step 2: Update the placeholder push when section does not exist**

```typescript
// BEFORE
sections.push({
  _id: null,
  position: pos,
  heading: "",
  isActive: false,
  products: [],
});

// AFTER
sections.push({
  _id: null,
  position: pos,
  heading: "",
  isActive: false,
  tagId: null,
  tagName: null,
  products: [],
});
```

- [ ] **Step 3: Commit**

```bash
git add convex/landingPage.ts
git commit -m "feat: expose tagId and tagName in adminGetProductSections"
```

---

## Task 4: Backend — remove obsolete individual-product mutations

**Files:**
- Modify: `convex/landingPage.ts`

- [ ] **Step 1: Delete `addProductToSection` mutation**

Remove the entire block (approx lines 358–395):

```typescript
// DELETE this entire block:
// ─── ADMIN MUTATION — add product to section ──────────────────────────────
export const addProductToSection = mutation({
  args: { ... },
  handler: async (ctx, { sectionId, productId }) => { ... },
});
```

- [ ] **Step 2: Delete `removeProductFromSection` mutation**

Remove the entire block (approx lines 397–406):

```typescript
// DELETE this entire block:
// ─── ADMIN MUTATION — remove product from section ─────────────────────────
export const removeProductFromSection = mutation({
  args: { id: v.id("landingPageProductSectionItems") },
  handler: async (ctx, { id }) => { ... },
});
```

- [ ] **Step 3: Verify dev server has no errors and API types are updated**

`npx convex dev` should succeed and `api.landingPage.addProductToSection` / `api.landingPage.removeProductFromSection` should no longer appear in `convex/_generated/api.d.ts`.

- [ ] **Step 4: Commit**

```bash
git add convex/landingPage.ts
git commit -m "refactor: remove addProductToSection and removeProductFromSection mutations"
```

---

## Task 5: Backend — cascade-clear sections when a tag is deleted

**Files:**
- Modify: `convex/tags.ts`

- [ ] **Step 1: Add cascade-clear logic inside the `remove` mutation handler**

In `convex/tags.ts`, in the `remove` mutation, add the following block **after** the sales-campaign deactivation block and **before** `await ctx.db.delete(args.id)`:

```typescript
// Clear landing page sections that used this tag
const sectionsWithTag = await ctx.db
  .query("landingPageProductSections")
  .withIndex("by_tagId", (q) => q.eq("tagId", args.id))
  .collect();

for (const section of sectionsWithTag) {
  // Delete all items in batches
  let sectionDone = false;
  while (!sectionDone) {
    const items = await ctx.db
      .query("landingPageProductSectionItems")
      .withIndex("by_sectionId", (q) => q.eq("sectionId", section._id))
      .take(64);
    if (items.length === 0) {
      sectionDone = true;
    } else {
      await Promise.all(items.map((item) => ctx.db.delete(item._id)));
    }
  }
  // Clear the tagId from the section
  await ctx.db.patch(section._id, { tagId: undefined });
}
```

The full `remove` handler after the edit should look like:

```typescript
export const remove = mutation({
  args: { id: v.id("tags") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Remove all product-tag associations in batches
    let done = false;
    while (!done) {
      const rows = await ctx.db
        .query("productTags")
        .withIndex("by_tagId", (q) => q.eq("tagId", args.id))
        .take(64);
      if (rows.length === 0) {
        done = true;
      } else {
        await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
      }
    }

    // Deactivate sales campaigns scoped to this tag
    const campaigns = await ctx.db
      .query("salesCampaigns")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(100);
    for (const c of campaigns) {
      if (c.scope.type === "tag" && c.scope.tagId === args.id) {
        await ctx.db.patch(c._id, { isActive: false });
      }
    }

    // Clear landing page sections that used this tag
    const sectionsWithTag = await ctx.db
      .query("landingPageProductSections")
      .withIndex("by_tagId", (q) => q.eq("tagId", args.id))
      .collect();

    for (const section of sectionsWithTag) {
      let sectionDone = false;
      while (!sectionDone) {
        const items = await ctx.db
          .query("landingPageProductSectionItems")
          .withIndex("by_sectionId", (q) => q.eq("sectionId", section._id))
          .take(64);
        if (items.length === 0) {
          sectionDone = true;
        } else {
          await Promise.all(items.map((item) => ctx.db.delete(item._id)));
        }
      }
      await ctx.db.patch(section._id, { tagId: undefined });
    }

    await ctx.db.delete(args.id);
    return null;
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add convex/tags.ts
git commit -m "feat: cascade-clear landing page sections when tag is deleted"
```

---

## Task 6: Backend — sync section items in `products.assignTags`

**Files:**
- Modify: `convex/products.ts`

- [ ] **Step 1: Replace the `assignTags` handler with the syncing version**

Find the `assignTags` mutation (around line 393) and replace its handler:

```typescript
/** Replace all tags for a product */
export const assignTags = mutation({
  args: {
    productId: v.id("products"),
    tagIds: v.array(v.id("tags")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Record old tag IDs before replacing
    const oldRows = await ctx.db
      .query("productTags")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(100);
    const oldTagIds = new Set(oldRows.map((r) => r.tagId));
    const newTagSet = new Set(args.tagIds);

    // Replace all tag associations
    await Promise.all(oldRows.map((r) => ctx.db.delete(r._id)));
    await Promise.all(
      args.tagIds.map((tagId) =>
        ctx.db.insert("productTags", { productId: args.productId, tagId })
      )
    );

    // Compute diff
    const addedTagIds = args.tagIds.filter((tagId) => !oldTagIds.has(tagId));
    const removedTagIds = [...oldTagIds].filter((tagId) => !newTagSet.has(tagId));

    // For removed tags: remove this product from sections using those tags
    for (const tagId of removedTagIds) {
      const sections = await ctx.db
        .query("landingPageProductSections")
        .withIndex("by_tagId", (q) => q.eq("tagId", tagId))
        .collect();
      for (const section of sections) {
        const item = await ctx.db
          .query("landingPageProductSectionItems")
          .withIndex("by_sectionId_and_productId", (q) =>
            q.eq("sectionId", section._id).eq("productId", args.productId)
          )
          .first();
        if (item) await ctx.db.delete(item._id);
      }
    }

    // For added tags: append this product to sections using those tags
    for (const tagId of addedTagIds) {
      const sections = await ctx.db
        .query("landingPageProductSections")
        .withIndex("by_tagId", (q) => q.eq("tagId", tagId))
        .collect();
      for (const section of sections) {
        const existingItem = await ctx.db
          .query("landingPageProductSectionItems")
          .withIndex("by_sectionId_and_productId", (q) =>
            q.eq("sectionId", section._id).eq("productId", args.productId)
          )
          .first();
        if (!existingItem) {
          const allItems = await ctx.db
            .query("landingPageProductSectionItems")
            .withIndex("by_sectionId", (q) => q.eq("sectionId", section._id))
            .collect();
          const maxSort = allItems.reduce((max, i) => Math.max(max, i.sortOrder), -1);
          await ctx.db.insert("landingPageProductSectionItems", {
            sectionId: section._id,
            productId: args.productId,
            sortOrder: maxSort + 1,
          });
        }
      }
    }

    return null;
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add convex/products.ts
git commit -m "feat: sync landing page section items when product tags change"
```

---

## Task 7: Backend — clean up section items when a product is deleted

**Files:**
- Modify: `convex/products.ts`

- [ ] **Step 1: Add section-items cleanup inside the `remove` mutation**

In the `remove` mutation (around line 418), add the following batch-delete block **after** the `productTags` cleanup block and **before** the recommendations cleanup:

```typescript
// Delete landing page section items for this product
done = false;
while (!done) {
  const sectionItems = await ctx.db
    .query("landingPageProductSectionItems")
    .withIndex("by_productId", (q) => q.eq("productId", args.id))
    .take(64);
  if (sectionItems.length === 0) { done = true; } else {
    await Promise.all(sectionItems.map((si) => ctx.db.delete(si._id)));
  }
}
```

The relevant portion of the `remove` handler after edits:

```typescript
// Delete product tags
done = false;
while (!done) {
  const tags = await ctx.db
    .query("productTags")
    .withIndex("by_productId", (q) => q.eq("productId", args.id))
    .take(64);
  if (tags.length === 0) { done = true; } else {
    await Promise.all(tags.map((t) => ctx.db.delete(t._id)));
  }
}

// Delete landing page section items for this product
done = false;
while (!done) {
  const sectionItems = await ctx.db
    .query("landingPageProductSectionItems")
    .withIndex("by_productId", (q) => q.eq("productId", args.id))
    .take(64);
  if (sectionItems.length === 0) { done = true; } else {
    await Promise.all(sectionItems.map((si) => ctx.db.delete(si._id)));
  }
}

// Remove from any recommendation sections
done = false;
while (!done) {
  // ... existing recommendations code unchanged
```

- [ ] **Step 2: Commit**

```bash
git add convex/products.ts
git commit -m "fix: clean up landing page section items when product is deleted"
```

---

## Task 8: Frontend — rewrite ProductSectionEditor with tag-based UI

**Files:**
- Modify: `app/admin/landing-page/page.tsx`

- [ ] **Step 1: Update the imports at the top of the file**

Replace the lucide-react import line (remove `Search`, `X`; add `MoreHorizontal`):

```typescript
// BEFORE
import { Loader2, Pencil, Trash2, Upload, ToggleLeft, ToggleRight, Search, X } from "lucide-react";

// AFTER
import { Loader2, Pencil, Trash2, Upload, ToggleLeft, ToggleRight, MoreHorizontal } from "lucide-react";
```

Add the Select component import after the existing shadcn/ui imports:

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

- [ ] **Step 2: Update the `AdminSection` type to include `tagId` and `tagName`**

```typescript
// BEFORE
type AdminSection = {
  _id: Id<"landingPageProductSections"> | null;
  position: 1 | 2;
  heading: string;
  isActive: boolean;
  products: AdminSectionProduct[];
};

// AFTER
type AdminSection = {
  _id: Id<"landingPageProductSections"> | null;
  position: 1 | 2;
  heading: string;
  isActive: boolean;
  tagId: Id<"tags"> | null;
  tagName: string | null;
  products: AdminSectionProduct[];
};
```

- [ ] **Step 3: Replace the `ProductSectionEditor` component entirely**

Replace everything from `function ProductSectionEditor(` to its closing `}` (approx lines 196–474) with:

```typescript
function ProductSectionEditor({ section }: { section: AdminSection }) {
  const meta = SECTION_LABELS[section.position] ?? {
    title: `Section ${section.position}`,
    description: "",
  };

  const [heading, setHeading] = useState(section.heading);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSettingTag, setIsSettingTag] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const upsertSection = useMutation(api.landingPage.upsertProductSection);
  const toggleSection = useMutation(api.landingPage.toggleProductSection);
  const setTagForSection = useMutation(api.landingPage.setTagForSection);
  const clearSectionMutation = useMutation(api.landingPage.clearSection);
  const reorderProducts = useMutation(api.landingPage.reorderSectionProducts);

  const allTags = useQuery(api.tags.listAll);

  async function handleSaveHeading() {
    if (!heading.trim()) return;
    setIsSaving(true);
    try {
      await upsertSection({ position: section.position, heading: heading.trim() });
      toast.success("Section heading updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle() {
    if (!section._id) {
      toast.error("Save a heading first to enable the section");
      return;
    }
    setIsToggling(true);
    try {
      await toggleSection({ id: section._id });
      toast.success(section.isActive ? "Section hidden" : "Section visible");
    } catch {
      toast.error("Failed to toggle section");
    } finally {
      setIsToggling(false);
    }
  }

  async function handleSetTag(tagId: string) {
    if (!section._id) {
      toast.error("Save a heading first before setting a tag");
      return;
    }
    if (tagId === section.tagId) return;
    setIsSettingTag(true);
    try {
      await setTagForSection({
        sectionId: section._id,
        tagId: tagId as Id<"tags">,
      });
      toast.success("Tag set — products updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to set tag");
    } finally {
      setIsSettingTag(false);
    }
  }

  async function handleClearSection() {
    if (!section._id) return;
    setIsClearing(true);
    try {
      await clearSectionMutation({ sectionId: section._id });
      toast.success("Section cleared");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to clear section");
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  }

  const handleReorder = useCallback(
    async (reordered: { id: string; sortOrder: number }[]) => {
      try {
        await reorderProducts({
          items: reordered.map((r) => ({
            id: r.id as Id<"landingPageProductSectionItems">,
            sortOrder: r.sortOrder,
          })),
        });
      } catch {
        toast.error("Failed to reorder");
      }
    },
    [reorderProducts]
  );

  const canClear = !!(section._id && (section.tagId || section.products.length > 0));

  return (
    <div className="border border-border overflow-hidden">
      {/* Section header */}
      <div className="px-4 pt-5 pb-3 flex items-start justify-between border-b border-border">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-0.5">
            {section.position === 1 ? "Section 02" : "Section 03"}
          </p>
          <p className="text-sm font-thin tracking-[0.2em] uppercase text-foreground">
            {meta.title}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 italic">
            {meta.description}
          </p>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {section._id && (
            <Badge
              variant={section.isActive ? "default" : "secondary"}
              className="text-[9px] tracking-[0.1em] uppercase"
            >
              {section.isActive ? "Visible" : "Hidden"}
            </Badge>
          )}
          {/* 3-dots menu */}
          <div className="relative">
            <button
              className="h-7 w-7 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Section options"
              disabled={!canClear}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 bg-background border border-border shadow-md w-36">
                <button
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-muted transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowClearConfirm(true);
                  }}
                >
                  Clear Section
                </button>
              </div>
            )}
          </div>
          {/* Visibility toggle */}
          <button
            className="h-7 w-7 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            title={section.isActive ? "Hide section" : "Show section"}
            disabled={isToggling || !section._id}
            onClick={handleToggle}
          >
            {isToggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : section.isActive ? (
              <ToggleRight className="h-3.5 w-3.5" />
            ) : (
              <ToggleLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Heading Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Section heading, e.g. BEST SELLERS"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={handleSaveHeading}
            disabled={isSaving || !heading.trim() || heading.trim() === section.heading}
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>

        {/* Tag Selector */}
        {section._id && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Products Tag</Label>
            <div className="flex items-center gap-2">
              <Select
                value={section.tagId ?? ""}
                onValueChange={handleSetTag}
                disabled={isSettingTag}
              >
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Select a tag to populate this section" />
                </SelectTrigger>
                <SelectContent>
                  {(allTags ?? []).map((tag) => (
                    <SelectItem key={tag._id} value={tag._id} className="text-xs">
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSettingTag && (
                <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0 text-muted-foreground" />
              )}
            </div>
            {section.tagId && (
              <p className="text-[10px] text-muted-foreground">
                {section.products.length} product{section.products.length !== 1 ? "s" : ""} from{" "}
                <span className="font-medium text-foreground">{section.tagName}</span>
              </p>
            )}
          </div>
        )}

        {/* Sortable product list */}
        {section.products.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Drag to Reorder</Label>
            <div className="border border-border divide-y">
              <SortableList
                items={section.products}
                onReorder={handleReorder}
                renderItem={(item, dragHandle) => (
                  <div className="flex items-center gap-2 px-3 py-2 bg-background">
                    {dragHandle}
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-8 h-8 object-cover flex-shrink-0"
                      />
                    )}
                    <span className="text-sm flex-1 truncate">{item.name}</span>
                  </div>
                )}
              />
            </div>
          </div>
        )}

        {/* Empty states */}
        {!section._id && (
          <p className="text-xs text-muted-foreground py-2">
            Save a heading to start configuring this section.
          </p>
        )}
        {section._id && !section.tagId && (
          <p className="text-xs text-muted-foreground py-2">
            Select a tag above to populate this section with products.
          </p>
        )}
        {section._id && section.tagId && section.products.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            This tag has no products assigned yet.
          </p>
        )}
      </div>

      {/* Clear Section Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tag and all products from this section. The section will remain hidden until a new tag is selected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearSection}
              disabled={isClearing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isClearing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Clear Section"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors. If `api.landingPage.addProductToSection` or `api.landingPage.removeProductFromSection` are still referenced anywhere, remove those references now.

- [ ] **Step 5: Commit**

```bash
git add app/admin/landing-page/page.tsx
git commit -m "feat: replace product picker with tag-based section editor in admin landing page"
```

---

## Task 9: End-to-end verification

- [ ] **Step 1: Set a tag on a section**
  - Open admin landing page → Product Section 1
  - Save a heading if not set
  - Pick any tag from the dropdown
  - Expected: tag badge appears, products from that tag populate the reorder list

- [ ] **Step 2: Reorder products**
  - Drag to reorder — expected: order persists after page reload

- [ ] **Step 3: Change the tag**
  - Pick a different tag — expected: product list resets to the new tag's products

- [ ] **Step 4: Add a product to the tag from the product admin**
  - Go to `/admin/products` → edit a product → assign the same tag used in Step 1
  - Return to landing page admin — expected: new product appears at the bottom of the list

- [ ] **Step 5: Remove a tag from a product**
  - Go back to that product → uncheck the tag → save
  - Return to landing page admin — expected: product is gone from the section list

- [ ] **Step 6: Clear section via ⋮ menu**
  - Click ⋮ on a section that has a tag → "Clear Section" → confirm
  - Expected: tag badge gone, product list empty, section shows empty-state message

- [ ] **Step 7: Delete a tag**
  - Go to `/admin/tags` → delete a tag that was used in a section
  - Return to landing page admin — expected: that section is empty, tagId cleared

- [ ] **Step 8: Frontend smoke test**
  - Open the public landing page
  - Expected: sections with products still render correctly with the custom order
  - Expected: inactive products do not appear (handled by existing `getContent` filter)
