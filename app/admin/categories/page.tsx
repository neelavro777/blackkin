"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Category = {
  _id: Id<"categories">;
  _creationTime: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
};

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; category: Category };

function CategoryDialog({
  state,
  onClose,
}: {
  state: DialogState;
  onClose: () => void;
}) {
  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.category : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [loading, setLoading] = useState(false);

  const createMutation = useMutation(api.categories.create);
  const updateMutation = useMutation(api.categories.update);

  function handleNameChange(val: string) {
    setName(val);
    if (!isEdit) {
      setSlug(toSlug(val));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({
          id: state.category._id,
          name,
          slug,
          description: description || undefined,
          sortOrder: Number(sortOrder),
        });
        toast.success("Category updated");
      } else {
        await createMutation({
          name,
          slug,
          description: description || undefined,
          sortOrder: Number(sortOrder),
        });
        toast.success("Category created");
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
        <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="cat-name">Name</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cat-slug">Slug</Label>
          <Input
            id="cat-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cat-desc">Description</Label>
          <Textarea
            id="cat-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cat-sort">Sort Order</Label>
          <Input
            id="cat-sort"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default function CategoriesPage() {
  const categories = useQuery(api.categories.listAll);
  const toggleActiveMutation = useMutation(api.categories.toggleActive);
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });
  const [togglingId, setTogglingId] = useState<Id<"categories"> | null>(null);

  async function handleToggleActive(cat: Category) {
    setTogglingId(cat._id);
    try {
      await toggleActiveMutation({ id: cat._id, isActive: !cat.isActive });
      toast.success(`Category ${cat.isActive ? "deactivated" : "activated"}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setTogglingId(null);
    }
  }

  const isOpen = dialogState.mode !== "closed";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage product categories</p>
        </div>
        <Button onClick={() => setDialogState({ mode: "create" })}>New Category</Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && setDialogState({ mode: "closed" })}>
        {isOpen && (
          <CategoryDialog
            state={dialogState}
            onClose={() => setDialogState({ mode: "closed" })}
          />
        )}
      </Dialog>

      {categories === undefined ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : categories.length === 0 ? (
        <p className="text-muted-foreground text-sm">No categories yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat._id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{cat.slug}</TableCell>
                <TableCell>{cat.isActive ? "Yes" : "No"}</TableCell>
                <TableCell>{cat.sortOrder}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialogState({ mode: "edit", category: cat })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={togglingId === cat._id}
                    onClick={() => handleToggleActive(cat)}
                  >
                    {togglingId === cat._id
                      ? "..."
                      : cat.isActive
                      ? "Deactivate"
                      : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
