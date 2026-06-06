import { useEffect } from "react";
import {
  useGetMaterial,
  useUpdateMaterial,
  getListMaterialsQueryKey,
} from "@workspace/api-client-react";
import { useLocation, useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const schema = z.object({
  material: z.string().min(1, "Material is required"),
  grade: z.string().min(1, "Grade is required"),
  form: z.string().default(""),
  costPerKg: z.coerce.number().min(0).default(0),
  density: z.coerce.number().min(0).default(0),
  supplier: z.string().default(""),
  defaultStockAllowance: z.coerce.number().min(0).max(100).default(10),
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

export function EditMaterial() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { data: material, isLoading } = useGetMaterial(id);
  const updateMaterial = useUpdateMaterial();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      material: "",
      grade: "",
      form: "",
      costPerKg: 0,
      density: 0,
      supplier: "",
      defaultStockAllowance: 10,
      active: true,
    },
  });

  useEffect(() => {
    if (material) {
      form.reset({
        material: material.material,
        grade: material.grade,
        form: material.form,
        costPerKg: material.costPerKg,
        density: material.density,
        supplier: material.supplier,
        defaultStockAllowance: material.defaultStockAllowance,
        active: material.active,
      });
    }
  }, [material, form]);

  const onSubmit = (values: FormValues) => {
    updateMaterial.mutate(
      { id, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListMaterialsQueryKey(),
          });
          toast({ title: "Material updated" });
          setLocation("/materials");
        },
        onError: () => {
          toast({ title: "Failed to update material", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 rounded-md" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Material not found.</p>
        <Link href="/materials">
          <Button variant="outline">Back to Materials</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/materials">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Material</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {material.material} · {material.grade}
          </p>
        </div>
      </div>

      <div className="border p-6 rounded-md bg-card">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="material"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="form"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Plate, Round Bar" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="defaultStockAllowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Allowance %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="text-base">Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Show this material in the quote wizard
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={updateMaterial.isPending}>
                {updateMaterial.isPending ? "Saving…" : "Save Changes"}
              </Button>
              <Link href="/materials">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
