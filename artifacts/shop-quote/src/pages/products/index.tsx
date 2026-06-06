import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  EyeOff,
  FileSpreadsheet,
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
import { ProductImportDialog } from "@/components/products/ProductImportDialog";
import { apiFetch, type StandardProduct } from "@/lib/api";

const CUR = "£";

const QUERY_KEY = ["products"];

export function ProductsLibrary() {
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

  const { data: products = [], isLoading } = useQuery<StandardProduct[]>({
    queryKey: [...QUERY_KEY, showAll, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (showAll) params.set("all", "true");
      if (search) params.set("search", search);
      return apiFetch<StandardProduct[]>(`/products?${params}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Product deleted" });
      setDeleteId(null);
    },
  });

  const bulkDeactivate = useMutation({
    mutationFn: (ids: number[]) =>
      apiFetch("/products/bulk/deactivate", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: `${selected.size} products deactivated` });
      setSelected(new Set());
      setBulkAction(null);
    },
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: number[]) =>
      apiFetch("/products/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: `${selected.size} products deleted` });
      setSelected(new Set());
      setBulkAction(null);
    },
  });

  const visibleProducts = useMemo(() => products, [products]);
  const allSelected =
    visibleProducts.length > 0 &&
    visibleProducts.every((p) => selected.has(p.id));
  const someSelected =
    visibleProducts.some((p) => selected.has(p.id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(visibleProducts.map((p) => p.id)));
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedItems = visibleProducts.filter((p) => selected.has(p.id));

  const cardStyle = {
    background: "hsl(var(--card))",
    borderColor: "hsl(var(--card-border))",
  };

  const deleteTarget = deleteId
    ? products.find((p) => p.id === deleteId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            Standard Products
          </h1>
          <Badge variant="secondary" className="ml-1">
            {products.filter((p) => p.active).length} active
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
          <Link href="/products/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search products..."
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
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium mb-1">No standard products yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add repeat products with preset pricing to speed up quoting.
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
              <Link href="/products/new">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Product
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
                  <th className="px-4 py-3 text-left">Material</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-right">Sell Price</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const isSel = selected.has(product.id);
                  return (
                    <tr
                      key={product.id}
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
                          onChange={() => toggleOne(product.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {product.productCode || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {product.productName}
                        {product.standardSize && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {product.standardSize}
                          </div>
                        )}
                        {product.notes && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {product.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {product.category || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {product.material || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {product.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {CUR}
                        {product.defaultSellPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={product.active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {product.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/products/${product.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(product.id)}
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
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.productName}" will be permanently removed. This
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
                ? `Delete ${selected.size} products?`
                : `Deactivate ${selected.size} products?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "delete"
                ? `You are about to permanently delete ${selected.size} products. This cannot be undone.`
                : `You are about to deactivate ${selected.size} products. They can be reactivated at any time.`}
              <div className="mt-2 text-xs space-y-0.5">
                {selectedItems.slice(0, 5).map((p) => (
                  <div key={p.id}>· {p.productName}</div>
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

      <ProductImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() =>
          queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        }
      />
    </div>
  );
}
