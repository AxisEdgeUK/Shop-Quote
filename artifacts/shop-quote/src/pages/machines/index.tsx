import { useState } from "react";
import {
  useListMachines,
  useDeleteMachine,
  useUpdateMachine,
  getListMachinesQueryKey,
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
import { Plus, Upload, Edit, Trash2, Wrench, PowerOff } from "lucide-react";
import { MachineImportDialog } from "@/components/machines/MachineImportDialog";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Switch } from "@/components/ui/switch";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";

export function MachinesList() {
  const { data: machines, isLoading } = useListMachines();
  const deleteMachine = useDeleteMachine();
  const updateMachine = useUpdateMachine();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const allIds = machines?.map((m) => m.id) ?? [];
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
      const res = await fetch("/api/machines/bulk/deactivate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
      toast({
        title: `${selectedIds.size} machine${selectedIds.size > 1 ? "s" : ""} deactivated`,
      });
      clearSelection();
    } catch {
      toast({ title: "Failed to deactivate machines", variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
      setConfirmDeactivate(false);
    }
  };

  const handleDelete = (id: number) => {
    deleteMachine.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListMachinesQueryKey(),
          });
          toast({ title: "Machine deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete machine", variant: "destructive" });
        },
      },
    );
  };

  const handleToggleActive = (id: number, active: boolean) => {
    updateMachine.mutate(
      { id, data: { active } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListMachinesQueryKey(),
          });
          toast({ title: `Machine ${active ? "activated" : "deactivated"}` });
        },
        onError: () => {
          toast({
            title: "Failed to update machine status",
            variant: "destructive",
          });
        },
      },
    );
  };

  const deleteDialog = (id: number, name: string) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive h-10 w-10"
          data-testid={`button-delete-machine-${id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Machine</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {name}? This cannot be undone.
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
          Machines
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
          <Link href="/machines/new">
            <Button className="h-11 px-5" data-testid="button-new-machine">
              <Plus className="w-4 h-4 mr-2" />
              New Machine
            </Button>
          </Link>
        </div>
      </div>

      <MachineImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : machines?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No machines yet. Add one to get started.</p>
          </div>
        ) : (
          machines?.map((machine) => {
            const isSelected = selectedIds.has(machine.id);
            return (
              <div
                key={machine.id}
                className={`rounded-xl border bg-card overflow-hidden transition-colors ${isSelected ? "border-primary ring-1 ring-primary" : ""}`}
                style={isSelected ? undefined : { borderColor: "hsl(var(--card-border))" }}
                data-testid={`row-machine-${machine.id}`}
              >
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(machine.id)}
                        className="mt-1 shrink-0"
                        aria-label={`Select ${machine.name}`}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-base truncate">
                          {machine.name}
                        </div>
                        <div
                          className="text-sm mt-0.5"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          {machine.machineType} · {machine.axisCount}-axis
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <span
                        className="text-xs"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {machine.active ? "Active" : "Inactive"}
                      </span>
                      <Switch
                        checked={machine.active}
                        onCheckedChange={(checked) =>
                          handleToggleActive(machine.id, checked)
                        }
                        data-testid={`switch-active-machine-${machine.id}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 pl-7">
                    <div>
                      <div
                        className="text-xs font-medium"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        Hourly Rate
                      </div>
                      <div className="font-mono font-semibold text-sm">
                        £{machine.hourlyRate.toFixed(2)}/hr
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-xs font-medium"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        Setup Rate
                      </div>
                      <div className="font-mono font-semibold text-sm">
                        £{machine.setupRate.toFixed(2)}/hr
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1 px-3 pb-3 pt-1 border-t"
                  style={{ borderColor: "hsl(var(--card-border))" }}
                >
                  <Link href={`/machines/${machine.id}/edit`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 px-3 text-xs gap-1.5"
                      data-testid={`button-edit-machine-${machine.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </Link>
                  {deleteDialog(machine.id, machine.name)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop table ── */}
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
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Axes</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead>Setup Rate</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
                </TableRow>
              ))
            ) : machines?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No machines found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              machines?.map((machine) => {
                const isSelected = selectedIds.has(machine.id);
                return (
                  <TableRow
                    key={machine.id}
                    data-testid={`row-machine-${machine.id}`}
                    className={isSelected ? "bg-primary/5" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(machine.id)}
                        aria-label={`Select ${machine.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{machine.name}</TableCell>
                    <TableCell>{machine.machineType}</TableCell>
                    <TableCell>{machine.axisCount}</TableCell>
                    <TableCell className="font-mono">
                      £{machine.hourlyRate.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono">
                      £{machine.setupRate.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={machine.active}
                        onCheckedChange={(checked) =>
                          handleToggleActive(machine.id, checked)
                        }
                        data-testid={`switch-active-machine-${machine.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/machines/${machine.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-edit-machine-${machine.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        {deleteDialog(machine.id, machine.name)}
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
              Deactivate {selectedIds.size} machine{selectedIds.size > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are about to deactivate {selectedIds.size} machine{selectedIds.size > 1 ? "s" : ""}. They will no longer appear in new quotes but can be reactivated at any time.
                </p>
                <p className="text-muted-foreground text-xs">
                  This machine has been used in previous quotes — deactivating preserves that history.
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
