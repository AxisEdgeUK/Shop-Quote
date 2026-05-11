import { useGetMachine, useUpdateMachine, getGetMachineQueryKey, getListMachinesQueryKey } from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MachineForm } from "@/components/machines/machine-form";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EditMachine() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { data: machine, isLoading } = useGetMachine(id, { query: { enabled: !!id, queryKey: getGetMachineQueryKey(id) } });
  const updateMachine = useUpdateMachine();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (data: any) => {
    updateMachine.mutate(
      { id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMachineQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          toast({ title: "Machine updated successfully" });
          setLocation("/machines");
        },
        onError: () => {
          toast({ title: "Failed to update machine", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) return <Skeleton className="h-[400px] w-full max-w-2xl" />;
  if (!machine) return <div>Machine not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/machines">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Machine</h1>
      </div>
      
      <div className="border p-6 rounded-md bg-card">
        <MachineForm 
          initialValues={machine}
          onSubmit={handleSubmit} 
          isSubmitting={updateMachine.isPending} 
        />
      </div>
    </div>
  );
}
