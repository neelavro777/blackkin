"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

type Tag = {
  _id: Id<"tags">;
  _creationTime: number;
  name: string;
  slug: string;
  isActive: boolean;
};

type TagDialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; tag: Tag };

function TagDialog({
  state,
  onClose,
}: {
  state: TagDialogState;
  onClose: () => void;
}) {
  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.tag : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [loading, setLoading] = useState(false);

  const createMutation = useMutation(api.tags.create);
  const updateMutation = useMutation(api.tags.update);

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
        await updateMutation({ id: state.tag._id, name, slug });
        toast.success("Tag updated");
      } else {
        await createMutation({ name, slug });
        toast.success("Tag created");
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
        <DialogTitle>{isEdit ? "Edit Tag" : "New Tag"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="tag-name">Name</Label>
          <Input
            id="tag-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tag-slug">Slug</Label>
          <Input
            id="tag-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
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

export default function TagsPage() {
  const tags = useQuery(api.tags.listAll);
  const removeMutation = useMutation(api.tags.remove);
  const toggleActiveMutation = useMutation(api.tags.toggleActive);

  const [dialogState, setDialogState] = useState<TagDialogState>({ mode: "closed" });
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [togglingId, setTogglingId] = useState<Id<"tags"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"tags"> | null>(null);

  async function handleToggleActive(tag: Tag) {
    setTogglingId(tag._id);
    try {
      await toggleActiveMutation({ id: tag._id, isActive: !tag.isActive });
      toast.success(`Tag ${tag.isActive ? "deactivated" : "activated"}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(tag: Tag) {
    setDeletingId(tag._id);
    setDeleteTarget(null);
    try {
      await removeMutation({ id: tag._id });
      toast.success("Tag deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  const isOpen = dialogState.mode !== "closed";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tags</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage product tags</p>
        </div>
        <Button onClick={() => setDialogState({ mode: "create" })}>New Tag</Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && setDialogState({ mode: "closed" })}>
        {isOpen && (
          <TagDialog
            state={dialogState}
            onClose={() => setDialogState({ mode: "closed" })}
          />
        )}
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tag and remove it from all products. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {tags === undefined ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : tags.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tags yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag._id}>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{tag.slug}</TableCell>
                <TableCell>{tag.isActive ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialogState({ mode: "edit", tag })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={togglingId === tag._id}
                    onClick={() => handleToggleActive(tag)}
                  >
                    {togglingId === tag._id
                      ? "..."
                      : tag.isActive
                      ? "Deactivate"
                      : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deletingId === tag._id}
                    onClick={() => setDeleteTarget(tag)}
                  >
                    {deletingId === tag._id ? "Deleting..." : "Delete"}
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
