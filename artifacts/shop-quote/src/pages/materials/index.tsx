import { useState } from "react";
import {
  useListMaterials,
  useDeleteMaterial,
  useUpdateMaterial,
  getListMaterialsQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Upload, Edit, Trash2, Layers, PowerOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MaterialImportDialog } from "@/components/materials/MaterialImportDialog";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";

export function MaterialsList() {
  const { data: materials, isLoading } = useListMaterials();
  const deleteMaterial = useDeleteMaterial();
  const updateMaterial = useUpdateMaterial();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const allIds = materials?.map((m) => m.id) ?? [];
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDeactivate = async () => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/materials/bulk/deactivate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
      toast({
        title: `${selectedIds.size} material${selectedIds.size > 1 ? "s" : ""} deactivated`,
      });
      clearSelection();
    } catch {
      toast({ title: "Failed to deactivate materials", variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
      setConfirmDeactivate(false);
    }
  };

  const handleDelete = (id: number) => {
    deleteMaterial.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListMaterialsQueryKey(),
          });
          toast({ title: "Material deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete material", variant: "destructive" });
        },
      },
    );
  };

  const handleToggleActive = (id: number, active: boolean) => {
    updateMaterial.mutate(
      { id, data: { active } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListMaterialsQueryKey(),
          });
        },
        onError: () => {
          toast({ title: "Failed to update material", variant: "destructive" });
        },
      },
    );
  };

  const deleteDialog = (id: number, label: string) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive h-10 w-10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Material</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {label}? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleDelete(id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className={`space-y-5 ${someSelected ? "pb-24 md:pb-6" : ""}`}>
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Materials
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-11 px-4"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Link href="/materials/new">
            <Button className="h-11 px-5">
              <Plus className="w-4 h-4 mr-2" />
              New Material
            </Button>
          </Link>
        </div>
      </div>

      <MaterialImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : materials?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1">No materials yet</p>
            <p className="text-xs">
              Import your material database or add one manually.
            </p>
          </div>
        ) : (
          materials?.map((m) => {
            const isSelected = selectedIds.has(m.id);
            return (
              <div
                key={m.id}
                className={`rounded-xl border bg-card overflow-hidden transition-colors ${isSelected ? "border-primary ring-1 ring-primary" : ""}`}
                style={isSelected ? undefined : { borderColor: "hsl(var(--card-border))" }}
              >
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(m.id)}
                        className="mt-1 shrink-0"
                        aria-label={`Select ${m.material} ${m.grade}`}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-base truncate">
                          {m.material}
                        </div>
                        <div
                          className="text-sm mt-0.5"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          {m.grade}
                          {m.form ? ` · ${m.form}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <span
                        className="text-xs"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {m.active ? "Active" : "Inactive"}
                      </span>
                      <Switch
                        checked={m.active}
                        onCheckedChange={(checked) =>
                          handleToggleActive(m.id, checked)
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 pl-7">
                    {m.supplier && (
                      <div>
                        <div
                          className="text-xs font-medium"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          Supplier
                        </div>
                        <div className="text-sm">{m.supplier}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1 px-3 pb-3 pt-1 border-t"
                  style={{ borderColor: "hsl(var(--card-border))" }}
                >
                  <Link href={`/materials/${m.id}/edit`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 px-3 text-xs gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </Link>
                  {deleteDialog(m.id, `${m.material} ${m.grade}`)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                  className={
                    someSelected && !allSelected ? "opacity-50" : undefined
                  }
                />
              </TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : materials?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Layers className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="font-medium mb-1">No materials yet</p>
                  <p className="text-sm">
                    Import your material database or click New Material to add
                    one.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              materials?.map((m) => {
                const isSelected = selectedIds.has(m.id);
                return (
                  <TableRow
                    key={m.id}
                    className={isSelected ? "bg-primary/5" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(m.id)}
                        aria-label={`Select ${m.material} ${m.grade}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{m.material}</TableCell>
                    <TableCell>{m.grade}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.form || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.supplier || "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={m.active}
                        onCheckedChange={(checked) =>
                          handleToggleActive(m.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/materials/${m.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        {deleteDialog(m.id, `${m.material} ${m.grade}`)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Bulk confirm: deactivate ── */}
      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate {selectedIds.size} material{selectedIds.size > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are about to deactivate {selectedIds.size} material{selectedIds.size > 1 ? "s" : ""}. They will no longer appear in new quotes but can be reactivated at any time.
                </p>
                <p className="text-muted-foreground text-xs">
                  Deactivating is preferred over permanent deletion to protect quote history.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeactivate}
              disabled={isBulkLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkLoading ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk action bar ── */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={clearSelection}
        actions={[
          {
            label: "Deactivate Selected",
            icon: <PowerOff className="w-3.5 h-3.5" />,
            variant: "destructive",
            onClick: () => setConfirmDeactivate(true),
          },
        ]}
      />
    </div>
  );
}
