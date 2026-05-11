import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const machineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  machineType: z.string().min(1, "Machine type is required"),
  axisCount: z.coerce.number().min(1).optional(),
  hourlyRate: z.coerce.number().min(0),
  setupRate: z.coerce.number().min(0),
  notes: z.string().optional(),
  active: z.boolean().default(true),
});

type MachineFormValues = z.infer<typeof machineSchema>;

interface MachineFormProps {
  initialValues?: Partial<MachineFormValues>;
  onSubmit: (values: MachineFormValues) => void;
  isSubmitting?: boolean;
}

export function MachineForm({ initialValues, onSubmit, isSubmitting }: MachineFormProps) {
  const form = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      name: initialValues?.name || "",
      machineType: initialValues?.machineType || "Milling",
      axisCount: initialValues?.axisCount || 3,
      hourlyRate: initialValues?.hourlyRate || 0,
      setupRate: initialValues?.setupRate || 0,
      notes: initialValues?.notes || "",
      active: initialValues?.active ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Machine Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-machine-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="machineType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-machine-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Milling">Milling</SelectItem>
                    <SelectItem value="Turning">Turning</SelectItem>
                    <SelectItem value="Mill-Turn">Mill-Turn</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="axisCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Axis Count</FormLabel>
                <FormControl>
                  <Input type="number" min="1" step="1" {...field} data-testid="input-axis-count" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center space-x-2 pt-8">
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-machine-active"
                    />
                  </FormControl>
                  <FormLabel>Active</FormLabel>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="hourlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hourly Rate (£)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} data-testid="input-hourly-rate" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="setupRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setup Rate (£/hr)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} data-testid="input-setup-rate" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} data-testid="input-machine-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} data-testid="button-submit-machine">
            {isSubmitting ? "Saving..." : "Save Machine"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
