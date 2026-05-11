import { useCreateMachine, getListMachinesQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MachineForm } from "@/components/machines/machine-form";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function NewMachine() {
  const [, setLocation] = useLocation();
  const createMachine = useCreateMachine();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (data: any) => {
    createMachine.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          toast({ title: "Machine added successfully" });
          setLocation("/machines");
        },
        onError: () => {
          toast({ title: "Failed to add machine", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/machines">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">New Machine</h1>
      </div>
      
      <div className="border p-6 rounded-md bg-card">
        <MachineForm onSubmit={handleSubmit} isSubmitting={createMachine.isPending} />
      </div>
    </div>
  );
}
