import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const customerSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  materialCertRequired: z.boolean().optional(),
  inspectionReportRequired: z.boolean().optional(),
  fairRequired: z.boolean().optional(),
  cocRequired: z.boolean().optional(),
  specialPackagingRequired: z.boolean().optional(),
  defaultPaymentTerms: z.string().optional(),
  typicalMarginPct: z.number().nullable().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialValues?: Partial<CustomerFormValues & { typicalMarginPct?: number | string | null }>;
  onSubmit: (values: CustomerFormValues) => void;
  isSubmitting?: boolean;
}

const QUALITY_CHECKS: { name: keyof CustomerFormValues; label: string }[] = [
  { name: "materialCertRequired", label: "Material Certificate Required" },
  { name: "inspectionReportRequired", label: "Inspection Report Required" },
  { name: "fairRequired", label: "FAIR Required" },
  { name: "cocRequired", label: "Certificate of Conformance (CoC) Required" },
  { name: "specialPackagingRequired", label: "Special Packaging Required" },
];

export function CustomerForm({
  initialValues,
  onSubmit,
  isSubmitting,
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      companyName: initialValues?.companyName || "",
      contactName: initialValues?.contactName || "",
      email: initialValues?.email || "",
      phone: initialValues?.phone || "",
      address: initialValues?.address || "",
      notes: initialValues?.notes || "",
      materialCertRequired: initialValues?.materialCertRequired ?? false,
      inspectionReportRequired:
        initialValues?.inspectionReportRequired ?? false,
      fairRequired: initialValues?.fairRequired ?? false,
      cocRequired: initialValues?.cocRequired ?? false,
      specialPackagingRequired:
        initialValues?.specialPackagingRequired ?? false,
      defaultPaymentTerms: initialValues?.defaultPaymentTerms || "",
      typicalMarginPct:
        initialValues?.typicalMarginPct != null
          ? Number(initialValues.typicalMarginPct)
          : null,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-w-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-company-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-contact-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} data-testid="input-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} data-testid="input-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea {...field} data-testid="input-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} data-testid="input-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border rounded-lg p-4 space-y-4">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Quality Defaults
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            These are pre-filled when creating a new quote for this customer.
          </p>

          <div className="space-y-3">
            {QUALITY_CHECKS.map(({ name, label }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      {label}
                    </FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <FormField
              control={form.control}
              name="defaultPaymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Payment Terms</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. 30 days from invoice"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="typicalMarginPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typical Margin %</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="e.g. 35"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : parseFloat(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="button-submit-customer"
          >
            {isSubmitting ? "Saving..." : "Save Customer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
