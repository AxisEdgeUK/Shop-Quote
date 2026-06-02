import {
  useCreateMaterial,
  getListMaterialsQueryKey,
} from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

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

const COMMON_MATERIALS = [
  "Aluminium",
  "Steel",
  "Stainless Steel",
  "Titanium",
  "Copper",
  "Brass",
  "Nylon",
  "Delrin / Acetal",
  "PEEK",
  "Other",
];

const COMMON_FORMS = ["Plate", "Round Bar", "Square Bar", "Flat Bar", "Sheet", "Tube", "Extrusion", "Casting", "Forging", "Other"];

export function NewMaterial() {
  const [, setLocation] = useLocation();
  const createMaterial = useCreateMaterial();
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

  const onSubmit = (values: FormValues) => {
    createMaterial.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
          toast({ title: "Material added" });
          setLocation("/materials");
        },
        onError: () => {
          toast({ title: "Failed to add material", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/materials">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">New Material</h1>
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
                    <Select onValueChange={(v) => { if (v !== "__custom__") field.onChange(v); }} value={COMMON_MATERIALS.includes(field.value) ? field.value : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select or type below" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_MATERIALS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormControl>
                      <Input placeholder="or type e.g. Aluminium, Steel" {...field} />
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
                      <Input placeholder="e.g. 6082-T6, EN24T, 316" {...field} />
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
                    <Select onValueChange={(v) => { if (v !== "__custom__") field.onChange(v); }} value={COMMON_FORMS.includes(field.value) ? field.value : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select or type below" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_FORMS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormControl>
                      <Input placeholder="or type e.g. Plate, Round Bar" {...field} />
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
                      <Input placeholder="e.g. Metals4U, IDS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="costPerKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Per Kg (£)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="density"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Density (g/cm³)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="e.g. 2.70" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultStockAllowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Allowance %</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="0" max="100" {...field} />
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
                    <p className="text-sm text-muted-foreground">Show this material in the quote wizard</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createMaterial.isPending}>
                {createMaterial.isPending ? "Saving…" : "Add Material"}
              </Button>
              <Link href="/materials">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
