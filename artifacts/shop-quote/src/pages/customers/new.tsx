import {
  useCreateCustomer,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CustomerForm } from "@/components/customers/customer-form";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function NewCustomer() {
  const [, setLocation] = useLocation();
  const createCustomer = useCreateCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (data: any) => {
    createCustomer.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListCustomersQueryKey(),
          });
          toast({ title: "Customer created successfully" });
          setLocation("/customers");
        },
        onError: () => {
          toast({ title: "Failed to create customer", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">New Customer</h1>
      </div>

      <div className="border p-6 rounded-md bg-card">
        <CustomerForm
          onSubmit={handleSubmit}
          isSubmitting={createCustomer.isPending}
        />
      </div>
    </div>
  );
}
