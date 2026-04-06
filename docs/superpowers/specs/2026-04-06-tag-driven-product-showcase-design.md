# Tag-Driven Product Showcase Sections

**Date:** 2026-04-06
**Status:** Approved

## Context

The landing page has two configurable product showcase sections. Currently, an admin manually searches and adds individual products to each section. This creates maintenance burden — products must be added/removed by hand whenever the tag's membership changes.

The goal is to let each section be driven by a single tag: selecting a tag auto-populates the section with all products carrying that tag. Order remains customizable via drag-and-drop. The system keeps section contents in sync as tags and products change.

---

## Data Model

**Schema change** (`convex/schema.ts`):
Add `tagId: v.optional(v.id("tags"))` and `.index("by_tagId", ["tagId"])` to `landingPageProductSections`.

`landingPageProductSectionItems` is unchanged — it continues to store the per-product sort order, now seeded from the tag's product membership.

---

## Edge Case Sync Matrix

| Event | Handling |
|---|---|
| Admin sets a tag for a section | Clear all items → insert one item per product with that tagId (seeded in query order) |
| Admin changes the tag | Same as above — `setTagForSection` clears and repopulates |
| Admin clears a section | Set `tagId = undefined`, delete all items |
| Product gains a tag (`assignTags`) | If any section uses that tag and product not already in items, append at `maxSortOrder + 1` |
| Product loses a tag (`assignTags`) | If any section uses that tag, delete that product's item |
| Tag deleted (`tags.remove`) | Find all sections using that tagId → clear tagId + delete all items |
| Product deleted (`products.remove`) | Clean up `landingPageProductSectionItems` rows for that product |

---

## Convex Backend Changes

### `convex/schema.ts`
- Add `tagId: v.optional(v.id("tags"))` to `landingPageProductSections`
- Add `.index("by_tagId", ["tagId"])`

### `convex/landingPage.ts`
- **New** `setTagForSection(sectionId, tagId)` — clears items, patches tagId, inserts items for all productTags with that tagId
- **New** `clearSection(sectionId)` — patches tagId to undefined, deletes all items
- **Remove** `addProductToSection` — replaced by tag-driven approach
- **Remove** `removeProductFromSection` — replaced by tag-driven approach
- **Update** `adminGetProductSections` — include `tagId` and `tagName` in each returned section object

### `convex/tags.ts`
- **Update** `remove` — after cleaning productTags and campaigns, also find all `landingPageProductSections` with this tagId, clear their tagId, and delete their items

### `convex/products.ts`
- **Update** `assignTags` — record old tagIds before deleting, compute added/removed sets, sync section items accordingly
- **Update** `remove` — also delete `landingPageProductSectionItems` rows for the deleted product (existing gap)

---

## Admin UI Changes (`app/admin/landing-page/page.tsx`)

### `AdminSection` type
Add `tagId: Id<"tags"> | null` and `tagName: string | null`.

### `ProductSectionEditor` component
**Remove:**
- Product search input
- `handleAddProduct`, `handleRemoveProduct` handlers
- Per-product `×` remove buttons

**Add:**
- Tag select `<select>` / combobox using `api.tags.listAll`
- On change: call `setTagForSection` (show confirmation if section already has products with a different tag)
- Tag badge showing current tag name when set
- 3-dots (`⋮`) button in section header → dropdown with **"Clear Section"** option
- AlertDialog confirmation before calling `clearSection`

**Keep:**
- Heading input + Save
- Visibility toggle
- Drag-to-reorder product list

**Empty states:**
- No tag set: "Select a tag to populate this section"
- Tag set, 0 products: "This tag has no products assigned yet"

---

## Files Modified

| File | Change type |
|---|---|
| `convex/schema.ts` | Schema field + index added |
| `convex/landingPage.ts` | New mutations, updated query, removed 2 mutations |
| `convex/tags.ts` | Cascade update in `remove` |
| `convex/products.ts` | Sync in `assignTags`, cleanup in `remove` |
| `app/admin/landing-page/page.tsx` | ProductSectionEditor rewrite |

---

## Verification

1. Set a tag on a section → products from that tag appear in the reorder list
2. Reorder products → frontend reflects custom order
3. Change tag → list resets to new tag's products
4. Add a new product to the tag (via product admin) → product appears at the bottom of the section
5. Remove a tag from a product → product disappears from section
6. Delete a tag → section is cleared (tagId gone, products gone)
7. Clear section via ⋮ menu → section is empty, tag badge gone
8. `getContent` public query — only active products shown; inactive products skip gracefully
