import { useState } from "react";
import {
  useListCustomers,
  useDeleteCustomer,
  getListCustomersQueryKey,
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
import {
  Plus,
  Upload,
  Edit,
  Trash2,
  Users,
  ChevronRight,
  Mail,
  Phone,
  Archive,
} from "lucide-react";
import { CustomerImportDialog } from "@/components/customers/CustomerImportDialog";
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
import { BulkActionBar } from "@/components/ui/bulk-action-bar";

export function CustomersList() {
  const { data: customers, isLoading } = useListCustomers();
  const deleteCustomer = useDeleteCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const allIds = customers?.map((c) => c.id) ?? [];
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

  const handleBulkArchive = async () => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/customers/bulk/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      toast({
        title: `${selectedIds.size} customer${selectedIds.size > 1 ? "s" : ""} archived`,
      });
      clearSelection();
    } catch {
      toast({ title: "Failed to archive customers", variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
      setConfirmArchive(false);
    }
  };

  const handleDelete = (id: number) => {
    deleteCustomer.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListCustomersQueryKey(),
          });
          toast({ title: "Customer deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete customer", variant: "destructive" });
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
          data-testid={`button-delete-customer-${id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
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
          Customers
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
          <Link href="/customers/new">
            <Button className="h-11 px-5" data-testid="button-new-customer">
              <Plus className="w-4 h-4 mr-2" />
              New Customer
            </Button>
          </Link>
        </div>
      </div>

      <CustomerImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : customers?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No customers yet. Add your first one.</p>
          </div>
        ) : (
          customers?.map((customer) => {
            const isSelected = selectedIds.has(customer.id);
            return (
              <div
                key={customer.id}
                className={`rounded-xl border bg-card overflow-hidden transition-colors ${isSelected ? "border-primary ring-1 ring-primary" : ""}`}
                style={isSelected ? undefined : { borderColor: "hsl(var(--card-border))" }}
                data-testid={`row-customer-${customer.id}`}
              >
                <div className="px-4 pt-4 pb-3 flex gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(customer.id)}
                    className="mt-1 shrink-0"
                    aria-label={`Select ${customer.companyName}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base">
                      {customer.companyName}
                    </div>
                    {customer.contactName && (
                      <div
                        className="text-sm mt-0.5"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {customer.contactName}
                      </div>
                    )}
                    <div className="flex flex-col gap-1 mt-2">
                      {customer.email && (
                        <a
                          href={`mailto:${customer.email}`}
                          className="flex items-center gap-2 text-sm"
                          style={{ color: "#1D8FFF" }}
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          {customer.email}
                        </a>
                      )}
                      {customer.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          className="flex items-center gap-2 text-sm"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          {customer.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 self-center opacity-30 shrink-0" />
                </div>
                <div
                  className="flex items-center gap-1 px-3 pb-3 pt-1 border-t"
                  style={{ borderColor: "hsl(var(--card-border))" }}
                >
                  <Link href={`/customers/${customer.id}/edit`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 px-3 text-xs gap-1.5"
                      data-testid={`button-edit-customer-${customer.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </Link>
                  {deleteDialog(customer.id, customer.companyName)}
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
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
                </TableRow>
              ))
            ) : customers?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No customers found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              customers?.map((customer) => {
                const isSelected = selectedIds.has(customer.id);
                return (
                  <TableRow
                    key={customer.id}
                    data-testid={`row-customer-${customer.id}`}
                    className={isSelected ? "bg-primary/5" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(customer.id)}
                        aria-label={`Select ${customer.companyName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {customer.companyName}
                    </TableCell>
                    <TableCell>{customer.contactName}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/customers/${customer.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-edit-customer-${customer.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        {deleteDialog(customer.id, customer.companyName)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Bulk confirm: archive ── */}
      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive {selectedIds.size} customer{selectedIds.size > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are about to archive {selectedIds.size} record{selectedIds.size > 1 ? "s" : ""}. They will be hidden from the list but their quote history will be preserved.
                </p>
                <p className="text-muted-foreground text-xs">
                  Archiving is preferred over permanent deletion to protect quote history.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkArchive}
              disabled={isBulkLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkLoading ? "Archiving…" : "Archive"}
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
            label: "Archive Selected",
            icon: <Archive className="w-3.5 h-3.5" />,
            variant: "destructive",
            onClick: () => setConfirmArchive(true),
          },
        ]}
      />
    </div>
  );
}
