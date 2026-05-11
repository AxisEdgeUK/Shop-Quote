import { useListMachines, useDeleteMachine, useUpdateMachine, getListMachinesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

export function MachinesList() {
  const { data: machines, isLoading } = useListMachines();
  const deleteMachine = useDeleteMachine();
  const updateMachine = useUpdateMachine();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteMachine.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          toast({ title: "Machine deleted successfully" });
        },
        onError: () => {
          toast({ title: "Failed to delete machine", variant: "destructive" });
        }
      }
    );
  };

  const handleToggleActive = (id: number, active: boolean) => {
    updateMachine.mutate(
      { id, data: { active } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
          toast({ title: `Machine ${active ? 'activated' : 'deactivated'}` });
        },
        onError: () => {
          toast({ title: "Failed to update machine status", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Machines</h1>
        <Link href="/machines/new">
          <Button data-testid="button-new-machine">
            <Plus className="w-4 h-4 mr-2" />
            New Machine
          </Button>
        </Link>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No machines found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              machines?.map((machine) => (
                <TableRow key={machine.id} data-testid={`row-machine-${machine.id}`}>
                  <TableCell className="font-medium">{machine.name}</TableCell>
                  <TableCell>{machine.machineType}</TableCell>
                  <TableCell>{machine.axisCount}</TableCell>
                  <TableCell>£{machine.hourlyRate.toFixed(2)}</TableCell>
                  <TableCell>£{machine.setupRate.toFixed(2)}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={machine.active} 
                      onCheckedChange={(checked) => handleToggleActive(machine.id, checked)}
                      data-testid={`switch-active-machine-${machine.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/machines/${machine.id}/edit`}>
                        <Button variant="ghost" size="icon" data-testid={`button-edit-machine-${machine.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-delete-machine-${machine.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Machine</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {machine.name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(machine.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
