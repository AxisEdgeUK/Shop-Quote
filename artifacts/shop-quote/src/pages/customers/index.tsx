import { useListCustomers, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Users, ChevronRight, Mail, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function CustomersList() {
  const { data: customers, isLoading } = useListCustomers();
  const deleteCustomer = useDeleteCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteCustomer.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          toast({ title: "Customer deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete customer", variant: "destructive" });
        },
      }
    );
  };

  const deleteDialog = (id: number, name: string) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive h-10 w-10" data-testid={`button-delete-customer-${id}`}>
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
          <AlertDialogAction onClick={() => handleDelete(id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customers</h1>
        <Link href="/customers/new">
          <Button className="h-11 px-5" data-testid="button-new-customer">
            <Plus className="w-4 h-4 mr-2" />
            New Customer
          </Button>
        </Link>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : customers?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No customers yet. Add your first one.</p>
          </div>
        ) : (
          customers?.map((customer) => (
            <div
              key={customer.id}
              className="rounded-xl border bg-card overflow-hidden"
              style={{ borderColor: "hsl(var(--card-border))" }}
              data-testid={`row-customer-${customer.id}`}
            >
              <div className="px-4 pt-4 pb-3">
                <div className="font-bold text-base">{customer.companyName}</div>
                {customer.contactName && (
                  <div className="text-sm mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
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
              <div
                className="flex items-center gap-1 px-3 pb-3 pt-1 border-t"
                style={{ borderColor: "hsl(var(--card-border))" }}
              >
                <Link href={`/customers/${customer.id}/edit`}>
                  <Button variant="ghost" size="sm" className="h-10 px-3 text-xs gap-1.5" data-testid={`button-edit-customer-${customer.id}`}>
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Button>
                </Link>
                {deleteDialog(customer.id, customer.companyName)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
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
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
                </TableRow>
              ))
            ) : customers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No customers found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              customers?.map((customer) => (
                <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                  <TableCell className="font-medium">{customer.companyName}</TableCell>
                  <TableCell>{customer.contactName}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/customers/${customer.id}/edit`}>
                        <Button variant="ghost" size="icon" data-testid={`button-edit-customer-${customer.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      {deleteDialog(customer.id, customer.companyName)}
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
