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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Upload, Edit, Trash2, Layers } from "lucide-react";
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

export function MaterialsList() {
  const { data: materials, isLoading } = useListMaterials();
  const deleteMaterial = useDeleteMaterial();
  const updateMaterial = useUpdateMaterial();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);

  const handleDelete = (id: number) => {
    deleteMaterial.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
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
          queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
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
        <Button variant="ghost" size="icon" className="text-destructive h-10 w-10">
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
    <div className="space-y-5">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Materials</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11 px-4" onClick={() => setImportOpen(true)}>
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
            <p className="text-xs">Import your material database or add one manually.</p>
          </div>
        ) : (
          materials?.map((m) => (
            <div key={m.id} className="rounded-xl border bg-card overflow-hidden" style={{ borderColor: "hsl(var(--card-border))" }}>
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-base truncate">{m.material}</div>
                    <div className="text-sm mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {m.grade}{m.form ? ` · ${m.form}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {m.active ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={m.active}
                      onCheckedChange={(checked) => handleToggleActive(m.id, checked)}
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-2">
                  {m.costPerKg > 0 && (
                    <div>
                      <div className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Cost/kg</div>
                      <div className="font-mono font-semibold text-sm">£{m.costPerKg.toFixed(2)}</div>
                    </div>
                  )}
                  {m.density > 0 && (
                    <div>
                      <div className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Density</div>
                      <div className="font-mono text-sm">{m.density} g/cm³</div>
                    </div>
                  )}
                  {m.supplier && (
                    <div>
                      <div className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Supplier</div>
                      <div className="text-sm">{m.supplier}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 px-3 pb-3 pt-1 border-t" style={{ borderColor: "hsl(var(--card-border))" }}>
                <Link href={`/materials/${m.id}/edit`}>
                  <Button variant="ghost" size="sm" className="h-10 px-3 text-xs gap-1.5">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Button>
                </Link>
                {deleteDialog(m.id, `${m.material} ${m.grade}`)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Cost / kg</TableHead>
              <TableHead>Density</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : materials?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Layers className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="font-medium mb-1">No materials yet</p>
                  <p className="text-sm">Import your material database or click New Material to add one.</p>
                </TableCell>
              </TableRow>
            ) : (
              materials?.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.material}</TableCell>
                  <TableCell>{m.grade}</TableCell>
                  <TableCell className="text-muted-foreground">{m.form || "—"}</TableCell>
                  <TableCell className="font-mono">{m.costPerKg > 0 ? `£${m.costPerKg.toFixed(2)}` : "—"}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{m.density > 0 ? `${m.density} g/cm³` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.supplier || "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={m.active}
                      onCheckedChange={(checked) => handleToggleActive(m.id, checked)}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
