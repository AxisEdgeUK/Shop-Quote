import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  vatNumber: z.string().optional(),
  currency: z.string().default("GBP"),
  defaultHourlyRate: z.coerce.number().min(0),
  defaultSetupRate: z.coerce.number().min(0),
  defaultMarginPercentage: z.coerce.number().min(0),
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().min(0),
  quoteValidityDays: z.coerce.number().min(1),
  paymentTerms: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsPage() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: "",
      address: "",
      email: "",
      phone: "",
      website: "",
      vatNumber: "",
      currency: "GBP",
      defaultHourlyRate: 0,
      defaultSetupRate: 0,
      defaultMarginPercentage: 0,
      vatEnabled: true,
      vatRate: 20,
      quoteValidityDays: 30,
      paymentTerms: "",
      termsAndConditions: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const onSubmit = (data: SettingsFormValues) => {
    updateSettings.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast({ title: "Settings updated successfully" });
        },
        onError: () => {
          toast({ title: "Failed to update settings", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
      
      <div className="border p-6 rounded-md bg-card">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Company Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="vatNumber" render={({ field }) => (
                  <FormItem><FormLabel>VAT Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Quoting Defaults</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="defaultHourlyRate" render={({ field }) => (
                  <FormItem><FormLabel>Default Hourly Rate (£)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="defaultSetupRate" render={({ field }) => (
                  <FormItem><FormLabel>Default Setup Rate (£/hr)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="defaultMarginPercentage" render={({ field }) => (
                  <FormItem><FormLabel>Default Margin (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="quoteValidityDays" render={({ field }) => (
                  <FormItem><FormLabel>Quote Validity (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex items-center space-x-2 pt-8">
                  <FormField control={form.control} name="vatEnabled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel>Enable VAT</FormLabel>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="vatRate" render={({ field }) => (
                  <FormItem><FormLabel>VAT Rate (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} disabled={!form.watch("vatEnabled")} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Terms</h2>
              <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                <FormItem><FormLabel>Default Payment Terms</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="termsAndConditions" render={({ field }) => (
                <FormItem><FormLabel>Default Terms & Conditions</FormLabel><FormControl><Textarea className="h-32" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
