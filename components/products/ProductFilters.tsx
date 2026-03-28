"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Size {
  _id: string;
  name: string;
}

interface Color {
  _id: string;
  name: string;
  hexCode?: string;
}

interface Tag {
  _id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  categories: Category[];
  sizes: Size[];
  colors: Color[];
  tags: Tag[];
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b pb-3">
      <button
        type="button"
        className="flex w-full items-center justify-between py-2 text-sm font-medium"
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-2 space-y-1">{children}</div>}
    </div>
  );
}

export default function ProductFilters({ categories, sizes, colors, tags }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("categoryId") ?? "";
  const currentSize = searchParams.get("size") ?? "";
  const currentColor = searchParams.get("color") ?? "";
  const currentTag = searchParams.get("tag") ?? "";
  const currentMinPrice = searchParams.get("minPrice") ?? "";
  const currentMaxPrice = searchParams.get("maxPrice") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Filters</p>
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Clear All
        </Button>
      </div>

      {categories.length > 0 && (
        <FilterSection title="Category">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="category"
              value=""
              checked={currentCategory === ""}
              onChange={() => updateParam("categoryId", "")}
            />
            All
          </label>
          {categories.map((c) => (
            <label key={c._id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="category"
                value={c._id}
                checked={currentCategory === c._id}
                onChange={() => updateParam("categoryId", c._id)}
              />
              {c.name}
            </label>
          ))}
        </FilterSection>
      )}

      {sizes.length > 0 && (
        <FilterSection title="Size">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="size"
              value=""
              checked={currentSize === ""}
              onChange={() => updateParam("size", "")}
            />
            All
          </label>
          {sizes.map((s) => (
            <label key={s._id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="size"
                value={s.name}
                checked={currentSize === s.name}
                onChange={() => updateParam("size", s.name)}
              />
              {s.name}
            </label>
          ))}
        </FilterSection>
      )}

      {colors.length > 0 && (
        <FilterSection title="Color">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="color"
              value=""
              checked={currentColor === ""}
              onChange={() => updateParam("color", "")}
            />
            All
          </label>
          {colors.map((c) => (
            <label key={c._id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c.name}
                checked={currentColor === c.name}
                onChange={() => updateParam("color", c.name)}
              />
              {c.hexCode && (
                <span
                  className="inline-block w-3 h-3 rounded-full border"
                  style={{ backgroundColor: c.hexCode }}
                />
              )}
              {c.name}
            </label>
          ))}
        </FilterSection>
      )}

      {tags.length > 0 && (
        <FilterSection title="Tags">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="tag"
              value=""
              checked={currentTag === ""}
              onChange={() => updateParam("tag", "")}
            />
            All
          </label>
          {tags.map((t) => (
            <label key={t._id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="tag"
                value={t.slug}
                checked={currentTag === t.slug}
                onChange={() => updateParam("tag", t.slug)}
              />
              {t.name}
            </label>
          ))}
        </FilterSection>
      )}

      <FilterSection title="Price Range">
        <div className="flex gap-2 items-center">
          <Label htmlFor="minPrice" className="sr-only">Min Price</Label>
          <Input
            id="minPrice"
            type="number"
            placeholder="Min"
            value={currentMinPrice}
            onChange={(e) => updateParam("minPrice", e.target.value)}
            className="w-full"
          />
          <span className="text-muted-foreground text-sm">-</span>
          <Label htmlFor="maxPrice" className="sr-only">Max Price</Label>
          <Input
            id="maxPrice"
            type="number"
            placeholder="Max"
            value={currentMaxPrice}
            onChange={(e) => updateParam("maxPrice", e.target.value)}
            className="w-full"
          />
        </div>
      </FilterSection>
    </div>
  );
}
