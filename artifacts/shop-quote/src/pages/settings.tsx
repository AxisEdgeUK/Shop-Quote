import { useState, useEffect, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CreditCard, Settings2, FileText, Upload, X, Loader2 } from "lucide-react";

const PAYMENT_TERM_PRESETS = [
  { label: "Pro Forma", value: "Pro forma" },
  { label: "Cash on Delivery", value: "Cash on delivery (COD)" },
  { label: "7 Days", value: "7 days from invoice date" },
  { label: "14 Days", value: "14 days from invoice date" },
  { label: "30 Days", value: "30 days from invoice date" },
  { label: "30 Days EOM", value: "30 days end of month" },
  { label: "Custom", value: "__custom__" },
];

const DELIVERY_TERM_PRESETS = [
  { label: "Ex Works", value: "Ex Works" },
  { label: "Delivered", value: "Delivered" },
  { label: "Collection", value: "Collection" },
  { label: "Custom", value: "__custom__" },
];

const VALIDITY_PRESETS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "Custom", value: 0 },
];

const LEAD_TIME_PRESETS = [
  "2 weeks",
  "3 weeks",
  "4 weeks",
  "6 weeks",
  "10 working days",
  "15 working days",
  "Ex-stock",
  "To be confirmed",
];

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  vatNumber: z.string().optional(),
  currency: z.string().default("GBP"),
  logoUrl: z.string().optional(),
  // Bank details
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  sortCode: z.string().optional(),
  iban: z.string().optional(),
  swiftBic: z.string().optional(),
  showBankDetails: z.boolean().default(false),
  // Quoting defaults
  defaultHourlyRate: z.coerce.number().min(0),
  defaultSetupRate: z.coerce.number().min(0),
  defaultMarginPercentage: z.coerce.number().min(0),
  vatEnabled: z.boolean().default(false),
  vatRate: z.coerce.number().min(0),
  quoteValidityDays: z.coerce.number().min(1),
  defaultLeadTime: z.string().optional(),
  defaultDeliveryTerms: z.string().optional(),
  paymentTerms: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const TABS = ["Company", "Bank Details", "Quoting Defaults", "Terms"] as const;
type Tab = typeof TABS[number];

export function SettingsPage() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("Company");
  const [isUploading, setIsUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [paymentTermsMode, setPaymentTermsMode] = useState<"preset" | "custom">("preset");
  const [deliveryTermsMode, setDeliveryTermsMode] = useState<"preset" | "custom">("preset");
  const [validityMode, setValidityMode] = useState<"preset" | "custom">("preset");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      logoUrl: "",
      bankName: "",
      accountName: "",
      accountNumber: "",
      sortCode: "",
      iban: "",
      swiftBic: "",
      showBankDetails: false,
      defaultHourlyRate: 65,
      defaultSetupRate: 65,
      defaultMarginPercentage: 30,
      vatEnabled: false,
      vatRate: 20,
      quoteValidityDays: 30,
      defaultLeadTime: "",
      defaultDeliveryTerms: "Ex Works",
      paymentTerms: "30 days from invoice date",
      termsAndConditions: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        companyName: settings.companyName,
        address: settings.address,
        email: settings.email,
        phone: settings.phone,
        website: settings.website,
        vatNumber: settings.vatNumber,
        currency: settings.currency,
        logoUrl: settings.logoUrl,
        bankName: settings.bankName,
        accountName: settings.accountName,
        accountNumber: settings.accountNumber,
        sortCode: settings.sortCode,
        iban: settings.iban,
        swiftBic: settings.swiftBic,
        showBankDetails: settings.showBankDetails,
        defaultHourlyRate: settings.defaultHourlyRate,
        defaultSetupRate: settings.defaultSetupRate,
        defaultMarginPercentage: settings.defaultMarginPercentage,
        vatEnabled: settings.vatEnabled,
        vatRate: settings.vatRate,
        quoteValidityDays: settings.quoteValidityDays,
        defaultLeadTime: settings.defaultLeadTime,
        defaultDeliveryTerms: settings.defaultDeliveryTerms,
        paymentTerms: settings.paymentTerms,
        termsAndConditions: settings.termsAndConditions,
      });
      if (settings.logoUrl) setLogoPreview(settings.logoUrl);
      // Detect modes
      const isCustomPayment = !PAYMENT_TERM_PRESETS.some(p => p.value === settings.paymentTerms && p.value !== "__custom__");
      if (isCustomPayment) setPaymentTermsMode("custom");
      const isCustomDelivery = !DELIVERY_TERM_PRESETS.some(p => p.value === settings.defaultDeliveryTerms && p.value !== "__custom__");
      if (isCustomDelivery) setDeliveryTermsMode("custom");
      const isCustomValidity = !VALIDITY_PRESETS.some(p => p.value === settings.quoteValidityDays && p.value !== 0);
      if (isCustomValidity) setValidityMode("custom");
    }
  }, [settings, form]);

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await res.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const serveUrl = `/api/storage${objectPath}`;
      form.setValue("logoUrl", serveUrl);
      setLogoPreview(serveUrl);
      toast({ title: "Logo uploaded successfully" });
    } catch (err) {
      toast({ title: "Failed to upload logo", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: SettingsFormValues) => {
    updateSettings.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast({ title: "Settings saved successfully" });
        },
        onError: () => {
          toast({ title: "Failed to save settings", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;

  const tabIcon: Record<Tab, React.ReactNode> = {
    "Company": <Building2 className="w-4 h-4" />,
    "Bank Details": <CreditCard className="w-4 h-4" />,
    "Quoting Defaults": <Settings2 className="w-4 h-4" />,
    "Terms": <FileText className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>

      <div className="flex gap-2 border-b">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabIcon[tab]}
            {tab}
          </button>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* COMPANY TAB */}
          {activeTab === "Company" && (
            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="border rounded-lg p-6 bg-card space-y-4">
                <h2 className="text-lg font-semibold">Company Logo</h2>
                <div className="flex items-start gap-6">
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden relative">
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="Company logo" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => { form.setValue("logoUrl", ""); setLogoPreview(""); }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground text-xs">
                        <Upload className="w-6 h-6 mx-auto mb-1" />
                        No logo
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4 mr-2" />Upload Logo</>}
                    </Button>
                    <p className="text-xs text-muted-foreground">PNG, JPG or SVG recommended. Will appear on PDF quotes.</p>
                  </div>
                </div>
              </div>

              {/* Company Details */}
              <div className="border rounded-lg p-6 bg-card space-y-4">
                <h2 className="text-lg font-semibold">Company Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem><FormLabel>Company Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="website" render={({ field }) => (
                    <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="vatNumber" render={({ field }) => (
                    <FormItem><FormLabel>VAT Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem><FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
          )}

          {/* BANK DETAILS TAB */}
          {activeTab === "Bank Details" && (
            <div className="border rounded-lg p-6 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Bank Details</h2>
                  <p className="text-sm text-muted-foreground">Bank details can optionally appear on PDF quotes</p>
                </div>
                <FormField control={form.control} name="showBankDetails" render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormLabel className="text-sm">Show on quotes</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <FormField control={form.control} name="bankName" render={({ field }) => (
                  <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g. Barclays" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="accountName" render={({ field }) => (
                  <FormItem><FormLabel>Account Name</FormLabel><FormControl><Input placeholder="e.g. ACME Engineering Ltd" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="accountNumber" render={({ field }) => (
                  <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="12345678" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="sortCode" render={({ field }) => (
                  <FormItem><FormLabel>Sort Code</FormLabel><FormControl><Input placeholder="00-00-00" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="iban" render={({ field }) => (
                  <FormItem><FormLabel>IBAN <span className="text-muted-foreground text-xs">(optional)</span></FormLabel><FormControl><Input placeholder="GB00 XXXX 0000 0000 0000 00" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="swiftBic" render={({ field }) => (
                  <FormItem><FormLabel>SWIFT / BIC <span className="text-muted-foreground text-xs">(optional)</span></FormLabel><FormControl><Input placeholder="BARCGB22" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
          )}

          {/* QUOTING DEFAULTS TAB */}
          {activeTab === "Quoting Defaults" && (
            <div className="space-y-6">
              <div className="border rounded-lg p-6 bg-card space-y-4">
                <h2 className="text-lg font-semibold">Rates & Margin</h2>
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="vatEnabled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3 space-y-0 pt-6">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel>Enable VAT</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vatRate" render={({ field }) => (
                    <FormItem><FormLabel>VAT Rate (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} disabled={!form.watch("vatEnabled")} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              <div className="border rounded-lg p-6 bg-card space-y-4">
                <h2 className="text-lg font-semibold">Quote Validity</h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  {VALIDITY_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        if (p.value === 0) {
                          setValidityMode("custom");
                        } else {
                          setValidityMode("preset");
                          form.setValue("quoteValidityDays", p.value);
                        }
                      }}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        (p.value === 0 ? validityMode === "custom" : validityMode === "preset" && form.watch("quoteValidityDays") === p.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {validityMode === "custom" && (
                  <FormField control={form.control} name="quoteValidityDays" render={({ field }) => (
                    <FormItem><FormLabel>Custom Validity (days)</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
              </div>

              <div className="border rounded-lg p-6 bg-card space-y-4">
                <h2 className="text-lg font-semibold">Default Lead Time</h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  {LEAD_TIME_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => form.setValue("defaultLeadTime", preset)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        form.watch("defaultLeadTime") === preset
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <FormField control={form.control} name="defaultLeadTime" render={({ field }) => (
                  <FormItem><FormLabel>Lead Time</FormLabel><FormControl><Input placeholder="e.g. 4 weeks, 10 working days" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="border rounded-lg p-6 bg-card space-y-4">
                <h2 className="text-lg font-semibold">Default Delivery Terms</h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  {DELIVERY_TERM_PRESETS.filter(p => p.value !== "__custom__").map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => { setDeliveryTermsMode("preset"); form.setValue("defaultDeliveryTerms", p.value); }}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        deliveryTermsMode === "preset" && form.watch("defaultDeliveryTerms") === p.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDeliveryTermsMode("custom")}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      deliveryTermsMode === "custom"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {deliveryTermsMode === "custom" && (
                  <FormField control={form.control} name="defaultDeliveryTerms" render={({ field }) => (
                    <FormItem><FormLabel>Custom Delivery Terms</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
              </div>
            </div>
          )}

          {/* TERMS TAB */}
          {activeTab === "Terms" && (
            <div className="space-y-6">
              <div className="border rounded-lg p-6 bg-card space-y-4">
                <h2 className="text-lg font-semibold">Default Payment Terms</h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PAYMENT_TERM_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        if (p.value === "__custom__") {
                          setPaymentTermsMode("custom");
                        } else {
                          setPaymentTermsMode("preset");
                          form.setValue("paymentTerms", p.value);
                        }
                      }}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        p.value === "__custom__"
                          ? paymentTermsMode === "custom"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted"
                          : paymentTermsMode === "preset" && form.watch("paymentTerms") === p.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {paymentTermsMode === "custom" && (
                  <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                    <FormItem><FormLabel>Custom Payment Terms</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
                {paymentTermsMode === "preset" && (
                  <p className="text-sm text-muted-foreground">{form.watch("paymentTerms")}</p>
                )}
              </div>

              <div className="border rounded-lg p-6 bg-card space-y-4">
                <h2 className="text-lg font-semibold">Default Terms & Conditions</h2>
                <FormField control={form.control} name="termsAndConditions" render={({ field }) => (
                  <FormItem>
                    <FormControl><Textarea rows={8} placeholder="Enter your standard terms and conditions..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={updateSettings.isPending} size="lg">
              {updateSettings.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
