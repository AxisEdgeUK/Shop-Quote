import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  EyeOff,
  FileSpreadsheet,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { ExtraImportDialog } from "@/components/extras/ExtraImportDialog";
import { apiFetch, type ChargeableExtra } from "@/lib/api";

const CUR = "£";

const QUERY_KEY = ["extras"];

export function ExtrasLibrary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<
    "deactivate" | "delete" | null
  >(null);

  const { data: extras = [], isLoading } = useQuery<ChargeableExtra[]>({
    queryKey: [...QUERY_KEY, showAll, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (showAll) params.set("all", "true");
      if (search) params.set("search", search);
      return apiFetch<ChargeableExtra[]>(`/extras?${params}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/extras/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Extra deleted" });
      setDeleteId(null);
    },
  });

  const bulkDeactivate = useMutation({
    mutationFn: (ids: number[]) =>
      apiFetch("/extras/bulk/deactivate", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: `${selected.size} extras deactivated` });
      setSelected(new Set());
      setBulkAction(null);
    },
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: number[]) =>
      apiFetch("/extras/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: `${selected.size} extras deleted` });
      setSelected(new Set());
      setBulkAction(null);
    },
  });

  const visibleExtras = useMemo(() => extras, [extras]);
  const allSelected =
    visibleExtras.length > 0 &&
    visibleExtras.every((e) => selected.has(e.id));
  const someSelected =
    visibleExtras.some((e) => selected.has(e.id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(visibleExtras.map((e) => e.id)));
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedItems = visibleExtras.filter((e) => selected.has(e.id));

  const cardStyle = {
    background: "hsl(var(--card))",
    borderColor: "hsl(var(--card-border))",
  };

  const deleteTarget = deleteId
    ? extras.find((e) => e.id === deleteId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            Chargeable Extras
          </h1>
          <Badge variant="secondary" className="ml-1">
            {extras.filter((e) => e.active).length} active
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Import
          </Button>
          <Link href="/extras/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Extra
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search extras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={showAll ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Showing All" : "Active Only"}
        </Button>
      </div>

      <div className="rounded border overflow-hidden" style={cardStyle}>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : extras.length === 0 ? (
          <div className="p-12 text-center">
            <PlusCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium mb-1">No chargeable extras yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add common add-on costs so you can quickly apply them to quotes.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                Import from Excel
              </Button>
              <Link href="/extras/new">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Extra
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-xs font-semibold uppercase tracking-widest"
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    borderColor: "hsl(var(--border))",
                  }}
                >
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-right">Sell Price</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleExtras.map((extra) => {
                  const isSel = selected.has(extra.id);
                  return (
                    <tr
                      key={extra.id}
                      className="border-b last:border-0 transition-colors"
                      style={{
                        borderColor: "hsl(var(--border))",
                        background: isSel
                          ? "rgba(29,143,255,0.06)"
                          : undefined,
                      }}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleOne(extra.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {extra.extraCode || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {extra.extraName}
                        {extra.notes && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {extra.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {extra.category || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {extra.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {CUR}
                        {extra.defaultSellPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={extra.active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {extra.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/extras/${extra.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(extra.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BulkActionBar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          {
            label: "Deactivate",
            icon: <EyeOff className="w-4 h-4" />,
            onClick: () => setBulkAction("deactivate"),
            variant: "outline",
          },
          {
            label: "Delete",
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => setBulkAction("delete"),
            variant: "destructive",
          },
        ]}
      />

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete extra?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.extraName}" will be permanently removed. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkAction !== null}
        onOpenChange={(o) => !o && setBulkAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "delete"
                ? `Delete ${selected.size} extras?`
                : `Deactivate ${selected.size} extras?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "delete"
                ? `You are about to permanently delete ${selected.size} extras. This cannot be undone.`
                : `You are about to deactivate ${selected.size} extras. They can be reactivated at any time.`}
              <div className="mt-2 text-xs space-y-0.5">
                {selectedItems.slice(0, 5).map((e) => (
                  <div key={e.id}>· {e.extraName}</div>
                ))}
                {selectedItems.length > 5 && (
                  <div>· …and {selectedItems.length - 5} more</div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                bulkAction === "delete"
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
              onClick={() => {
                const ids = Array.from(selected);
                if (bulkAction === "delete") bulkDelete.mutate(ids);
                else bulkDeactivate.mutate(ids);
              }}
            >
              {bulkAction === "delete"
                ? `Delete ${selected.size}`
                : `Deactivate ${selected.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExtraImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() =>
          queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        }
      />
    </div>
  );
}
