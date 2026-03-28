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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ────────────────────────────────────────────────────

type PlatformSize = {
  _id: Id<"platformSizes">;
  _creationTime: number;
  name: string;
  measurements: string;
  sortOrder: number;
};

type PlatformColor = {
  _id: Id<"platformColors">;
  _creationTime: number;
  name: string;
  hexCode?: string;
  sortOrder: number;
};

// ─── Sizes Section ────────────────────────────────────────────

type SizeDialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; size: PlatformSize };

function SizeDialog({
  state,
  onClose,
}: {
  state: SizeDialogState;
  onClose: () => void;
}) {
  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.size : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [measurements, setMeasurements] = useState(initial?.measurements ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [loading, setLoading] = useState(false);

  const createMutation = useMutation(api.platformConfig.createSize);
  const updateMutation = useMutation(api.platformConfig.updateSize);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({
          id: state.size._id,
          name,
          measurements,
          sortOrder: Number(sortOrder),
        });
        toast.success("Size updated");
      } else {
        await createMutation({ name, measurements, sortOrder: Number(sortOrder) });
        toast.success("Size created");
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
        <DialogTitle>{isEdit ? "Edit Size" : "New Size"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="size-name">Name</Label>
          <Input
            id="size-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Small, Medium, XL"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="size-measurements">Measurements</Label>
          <Textarea
            id="size-measurements"
            value={measurements}
            onChange={(e) => setMeasurements(e.target.value)}
            placeholder="e.g. Chest: 34-36in, Waist: 28-30in"
            rows={3}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="size-sort">Sort Order</Label>
          <Input
            id="size-sort"
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

function SizesTab() {
  const sizes = useQuery(api.platformConfig.listSizes);
  const deleteMutation = useMutation(api.platformConfig.deleteSize);

  const [dialogState, setDialogState] = useState<SizeDialogState>({ mode: "closed" });
  const [deleteTarget, setDeleteTarget] = useState<PlatformSize | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"platformSizes"> | null>(null);

  async function handleDelete(size: PlatformSize) {
    setDeletingId(size._id);
    setDeleteTarget(null);
    try {
      await deleteMutation({ id: size._id });
      toast.success("Size deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  const isOpen = dialogState.mode !== "closed";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogState({ mode: "create" })}>New Size</Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && setDialogState({ mode: "closed" })}>
        {isOpen && (
          <SizeDialog state={dialogState} onClose={() => setDialogState({ mode: "closed" })} />
        )}
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete size &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {sizes === undefined ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : sizes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No sizes yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Measurements</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sizes.map((size) => (
              <TableRow key={size._id}>
                <TableCell className="font-medium">{size.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                  {size.measurements}
                </TableCell>
                <TableCell>{size.sortOrder}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialogState({ mode: "edit", size })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deletingId === size._id}
                    onClick={() => setDeleteTarget(size)}
                  >
                    {deletingId === size._id ? "Deleting..." : "Delete"}
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

// ─── Colors Section ───────────────────────────────────────────

type ColorDialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; color: PlatformColor };

function ColorDialog({
  state,
  onClose,
}: {
  state: ColorDialogState;
  onClose: () => void;
}) {
  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.color : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [hexCode, setHexCode] = useState(initial?.hexCode ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [loading, setLoading] = useState(false);

  const createMutation = useMutation(api.platformConfig.createColor);
  const updateMutation = useMutation(api.platformConfig.updateColor);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({
          id: state.color._id,
          name,
          hexCode: hexCode || undefined,
          sortOrder: Number(sortOrder),
        });
        toast.success("Color updated");
      } else {
        await createMutation({
          name,
          hexCode: hexCode || undefined,
          sortOrder: Number(sortOrder),
        });
        toast.success("Color created");
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
        <DialogTitle>{isEdit ? "Edit Color" : "New Color"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="color-name">Name</Label>
          <Input
            id="color-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Midnight Black"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="color-hex">Hex Code (optional)</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="color-hex"
              value={hexCode}
              onChange={(e) => setHexCode(e.target.value)}
              placeholder="#000000"
            />
            {hexCode && (
              <div
                className="w-8 h-8 rounded border shrink-0"
                style={{ backgroundColor: hexCode }}
              />
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="color-sort">Sort Order</Label>
          <Input
            id="color-sort"
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

function ColorsTab() {
  const colors = useQuery(api.platformConfig.listColors);
  const deleteMutation = useMutation(api.platformConfig.deleteColor);

  const [dialogState, setDialogState] = useState<ColorDialogState>({ mode: "closed" });
  const [deleteTarget, setDeleteTarget] = useState<PlatformColor | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"platformColors"> | null>(null);

  async function handleDelete(color: PlatformColor) {
    setDeletingId(color._id);
    setDeleteTarget(null);
    try {
      await deleteMutation({ id: color._id });
      toast.success("Color deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  const isOpen = dialogState.mode !== "closed";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogState({ mode: "create" })}>New Color</Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && setDialogState({ mode: "closed" })}>
        {isOpen && (
          <ColorDialog state={dialogState} onClose={() => setDialogState({ mode: "closed" })} />
        )}
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete color &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {colors === undefined ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : colors.length === 0 ? (
        <p className="text-muted-foreground text-sm">No colors yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Hex Code</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colors.map((color) => (
              <TableRow key={color._id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {color.hexCode && (
                      <div
                        className="w-4 h-4 rounded-full border shrink-0"
                        style={{ backgroundColor: color.hexCode }}
                      />
                    )}
                    {color.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {color.hexCode ?? "—"}
                </TableCell>
                <TableCell>{color.sortOrder}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialogState({ mode: "edit", color })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deletingId === color._id}
                    onClick={() => setDeleteTarget(color)}
                  >
                    {deletingId === color._id ? "Deleting..." : "Delete"}
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

// ─── Page ─────────────────────────────────────────────────────

export default function SizesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform Configuration</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage sizes and colors available across your store
        </p>
      </div>

      <Tabs defaultValue="sizes">
        <TabsList>
          <TabsTrigger value="sizes">Sizes</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
        </TabsList>
        <TabsContent value="sizes" className="mt-4">
          <SizesTab />
        </TabsContent>
        <TabsContent value="colors" className="mt-4">
          <ColorsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
