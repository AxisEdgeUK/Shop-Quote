import {
  useGetCustomer,
  useUpdateCustomer,
  getGetCustomerQueryKey,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CustomerForm } from "@/components/customers/customer-form";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EditCustomer() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { data: customer, isLoading } = useGetCustomer(id, {
    query: { enabled: !!id, queryKey: getGetCustomerQueryKey(id) },
  });
  const updateCustomer = useUpdateCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (data: any) => {
    updateCustomer.mutate(
      { id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetCustomerQueryKey(id),
          });
          queryClient.invalidateQueries({
            queryKey: getListCustomersQueryKey(),
          });
          toast({ title: "Customer updated successfully" });
          setLocation("/customers");
        },
        onError: () => {
          toast({ title: "Failed to update customer", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) return <Skeleton className="h-[400px] w-full max-w-2xl" />;
  if (!customer) return <div>Customer not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Customer</h1>
      </div>

      <div className="border p-6 rounded-md bg-card">
        <CustomerForm
          initialValues={customer}
          onSubmit={handleSubmit}
          isSubmitting={updateCustomer.isPending}
        />
      </div>
    </div>
  );
}
