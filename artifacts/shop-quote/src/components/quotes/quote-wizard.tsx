import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useListCustomers, useListMachines, useGetSettings, QuoteLineItemInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, ArrowRight, ArrowLeft, Check, Save } from "lucide-react";
import { Link } from "wouter";

const PAYMENT_TERM_PRESETS = [
  "Pro forma",
  "Cash on delivery (COD)",
  "7 days from invoice date",
  "14 days from invoice date",
  "30 days from invoice date",
  "30 days end of month",
];

const LEAD_TIME_PRESETS = [
  "2 weeks", "3 weeks", "4 weeks", "6 weeks",
  "10 working days", "15 working days", "Ex-stock", "To be confirmed",
];

const DELIVERY_TERM_PRESETS = ["Ex Works", "Delivered", "Collection"];

const lineItemSchema = z.object({
  partName: z.string().min(1, "Part name is required"),
  drawingNumber: z.string().optional(),
  revision: z.string().optional(),
  quantity: z.coerce.number().min(1),
  material: z.string().min(1, "Material is required"),
  processType: z.string().min(1, "Process type is required"),
  machineId: z.coerce.number().optional().nullable(),
  toleranceClass: z.string().optional(),
  surfaceFinish: z.string().optional(),
  complexity: z.string().optional(),
  setupHours: z.coerce.number().min(0),
  programmingHours: z.coerce.number().min(0),
  machiningMinutesPerPart: z.coerce.number().min(0),
  inspectionHours: z.coerce.number().min(0),
  deburringMinutesPerPart: z.coerce.number().min(0),
  materialCostPerUnit: z.coerce.number().min(0),
  materialWastagePercentage: z.coerce.number().min(0),
  toolingAllowance: z.coerce.number().min(0),
  outsideProcessing: z.coerce.number().min(0),
  packaging: z.coerce.number().min(0),
  delivery: z.coerce.number().min(0),
  riskPercentage: z.coerce.number().min(0),
  profitMarginPercentage: z.coerce.number().min(0),
  discountPercentage: z.coerce.number().min(0).optional(),
  vatEnabled: z.boolean().optional(),
  vatRate: z.coerce.number().min(0).optional(),
  toolingRecommendation: z.string().optional(),
  materialRecommendation: z.string().optional(),
  coolantRecommendation: z.string().optional(),
});

const quoteSchema = z.object({
  customerId: z.coerce.number().min(1, "Please select a customer"),
  status: z.string().default("Draft"),
  quoteDate: z.string().optional(),
  validUntil: z.string().optional(),
  quoteRevision: z.string().default("A"),
  revisionNotes: z.string().optional(),
  leadTime: z.string().optional(),
  deliveryTerms: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  paymentTerms: z.string().optional(),
  termsAndConditions: z.string().optional(),
  materialCertIncluded: z.boolean().default(false),
  inspectionReportIncluded: z.boolean().default(false),
  fairIncluded: z.boolean().default(false),
  cmmReportIncluded: z.boolean().default(false),
  lineItems: z.array(lineItemSchema).min(1, "At least one part is required"),
});

export type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteWizardProps {
  initialValues?: Partial<QuoteFormValues>;
  onSubmit: (values: QuoteFormValues) => void;
  isSubmitting?: boolean;
  savedQuoteId?: number;
}

const STEPS = ["Quote Info", "Part Details", "Assumptions", "Review", "Complete"];

export function QuoteWizard({ initialValues, onSubmit, isSubmitting, savedQuoteId }: QuoteWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { data: customers, isLoading: isLoadingCustomers } = useListCustomers();
  const { data: machines, isLoading: isLoadingMachines } = useListMachines();
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerId: initialValues?.customerId || 0,
      status: initialValues?.status || "Draft",
      quoteDate: initialValues?.quoteDate || new Date().toISOString().split('T')[0],
      validUntil: initialValues?.validUntil || "",
      quoteRevision: initialValues?.quoteRevision || "A",
      revisionNotes: initialValues?.revisionNotes || "",
      leadTime: initialValues?.leadTime || "",
      deliveryTerms: initialValues?.deliveryTerms || "",
      notes: initialValues?.notes || "",
      internalNotes: initialValues?.internalNotes || "",
      paymentTerms: initialValues?.paymentTerms || "",
      termsAndConditions: initialValues?.termsAndConditions || "",
      materialCertIncluded: initialValues?.materialCertIncluded || false,
      inspectionReportIncluded: initialValues?.inspectionReportIncluded || false,
      fairIncluded: initialValues?.fairIncluded || false,
      cmmReportIncluded: initialValues?.cmmReportIncluded || false,
      lineItems: initialValues?.lineItems?.length ? initialValues.lineItems as any : [{
        partName: "",
        quantity: 1,
        material: "",
        processType: "Milling",
        setupHours: 0,
        programmingHours: 0,
        machiningMinutesPerPart: 0,
        inspectionHours: 0,
        deburringMinutesPerPart: 0,
        materialCostPerUnit: 0,
        materialWastagePercentage: 10,
        toolingAllowance: 0,
        outsideProcessing: 0,
        packaging: 0,
        delivery: 0,
        riskPercentage: 10,
        profitMarginPercentage: 30,
        discountPercentage: 0,
        vatEnabled: false,
        vatRate: 20,
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lineItems" });
  const [activeLineItemIndex, setActiveLineItemIndex] = useState(0);

  useEffect(() => {
    if (settings && !initialValues?.quoteDate) {
      if (!form.getValues("validUntil")) {
        const d = new Date();
        d.setDate(d.getDate() + (settings.quoteValidityDays || 30));
        form.setValue("validUntil", d.toISOString().split('T')[0]);
      }
      if (!form.getValues("paymentTerms")) form.setValue("paymentTerms", settings.paymentTerms || "");
      if (!form.getValues("termsAndConditions")) form.setValue("termsAndConditions", settings.termsAndConditions || "");
      if (!form.getValues("leadTime")) form.setValue("leadTime", settings.defaultLeadTime || "");
      if (!form.getValues("deliveryTerms")) form.setValue("deliveryTerms", settings.defaultDeliveryTerms || "");
      const currentItems = form.getValues("lineItems");
      if (currentItems.length === 1 && !currentItems[0].partName) {
        form.setValue(`lineItems.0.profitMarginPercentage`, settings.defaultMarginPercentage || 30);
        form.setValue(`lineItems.0.vatEnabled`, settings.vatEnabled ?? false);
        form.setValue(`lineItems.0.vatRate`, settings.vatRate || 20);
      }
    }
  }, [settings, initialValues, form]);

  const handleNext = async () => {
    let isValid = false;
    if (currentStep === 0) {
      isValid = await form.trigger(["customerId"]);
    } else if (currentStep === 1) {
      isValid = await form.trigger([
        `lineItems.${activeLineItemIndex}.partName`,
        `lineItems.${activeLineItemIndex}.quantity`,
        `lineItems.${activeLineItemIndex}.material`,
        `lineItems.${activeLineItemIndex}.processType`,
      ]);
    } else if (currentStep === 2) {
      isValid = await form.trigger();
    }
    if (isValid || currentStep > 2) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const handleFinalSubmit = (data: QuoteFormValues) => {
    onSubmit(data);
    setCurrentStep(4);
  };

  if (isLoadingCustomers || isLoadingMachines || isLoadingSettings) {
    return <Skeleton className="w-full h-[600px]" />;
  }

  const calculateCosts = (item: any) => {
    const qty = Number(item.quantity) || 1;
    const selectedMachine = machines?.find(m => m.id === Number(item.machineId));
    const machineHourlyRate = selectedMachine ? selectedMachine.hourlyRate : (settings?.defaultHourlyRate || 0);
    const machineSetupRate = selectedMachine ? selectedMachine.setupRate : (settings?.defaultSetupRate || 0);
    const setupCost = (Number(item.setupHours) || 0) * machineSetupRate;
    const programmingCost = (Number(item.programmingHours) || 0) * machineHourlyRate;
    const machiningCost = ((Number(item.machiningMinutesPerPart) || 0) / 60) * qty * machineHourlyRate;
    const inspectionCost = (Number(item.inspectionHours) || 0) * machineHourlyRate;
    const deburringCost = ((Number(item.deburringMinutesPerPart) || 0) / 60) * qty * machineHourlyRate;
    const materialCostTotal = (Number(item.materialCostPerUnit) || 0) * qty * (1 + (Number(item.materialWastagePercentage) || 0) / 100);
    const directCost = setupCost + programmingCost + machiningCost + inspectionCost + deburringCost + materialCostTotal
      + (Number(item.toolingAllowance) || 0) + (Number(item.outsideProcessing) || 0)
      + (Number(item.packaging) || 0) + (Number(item.delivery) || 0);
    const riskValue = directCost * ((Number(item.riskPercentage) || 0) / 100);
    const costBeforeMargin = directCost + riskValue;
    const profitMarginPercentage = Number(item.profitMarginPercentage) || 0;
    const sellPriceBeforeDiscount = profitMarginPercentage >= 100 ? costBeforeMargin : costBeforeMargin / (1 - profitMarginPercentage / 100);
    const sellPrice = Number(item.discountPercentage) > 0
      ? sellPriceBeforeDiscount * (1 - (Number(item.discountPercentage) || 0) / 100)
      : sellPriceBeforeDiscount;
    const pricePerPart = sellPrice / qty;
    const vatEnabled = item.vatEnabled ?? settings?.vatEnabled ?? false;
    const vatRate = item.vatRate ?? settings?.vatRate ?? 20;
    const vatAmount = vatEnabled ? sellPrice * (vatRate / 100) : 0;
    const totalIncVat = vatEnabled ? sellPrice + vatAmount : sellPrice;
    return { setupCost, programmingCost, machiningCost, inspectionCost, deburringCost, materialCostTotal, directCost, riskValue, costBeforeMargin, sellPrice, pricePerPart, vatEnabled, vatRate, vatAmount, totalIncVat };
  };

  const currencySymbol = settings?.currency === "GBP" ? "£" : settings?.currency === "EUR" ? "€" : "$";

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {STEPS.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium ${
              currentStep === index ? 'bg-primary text-primary-foreground border-primary' :
              currentStep > index ? 'bg-primary/20 text-primary border-primary/20' : 'border-muted-foreground'
            }`}>
              {currentStep > index ? <Check className="w-3 h-3" /> : index + 1}
            </div>
            <span className={currentStep === index ? 'font-medium text-foreground' : ''}>{step}</span>
            {index < STEPS.length - 1 && <div className="w-8 h-px bg-border mx-2" />}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="space-y-6">

          {/* STEP 1: QUOTE INFO */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer & Quote Details</CardTitle>
                  <CardDescription>Who is this quote for and what are the key dates?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="customerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {customers?.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Sent">Sent</SelectItem>
                            <SelectItem value="Won">Won</SelectItem>
                            <SelectItem value="Lost">Lost</SelectItem>
                            <SelectItem value="Expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="quoteDate" render={({ field }) => (
                      <FormItem><FormLabel>Quote Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="validUntil" render={({ field }) => (
                      <FormItem><FormLabel>Valid Until</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="quoteRevision" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quote Revision</FormLabel>
                        <FormControl><Input placeholder="A" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="revisionNotes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Revision Notes</FormLabel>
                        <FormControl><Input placeholder="What changed in this revision?" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Commercial Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Lead Time */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lead Time</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {LEAD_TIME_PRESETS.map(p => (
                          <button key={p} type="button"
                            onClick={() => form.setValue("leadTime", p)}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              form.watch("leadTime") === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                            }`}
                          >{p}</button>
                        ))}
                      </div>
                      <FormField control={form.control} name="leadTime" render={({ field }) => (
                        <FormItem><FormControl><Input placeholder="e.g. 4 weeks" {...field} /></FormControl></FormItem>
                      )} />
                    </div>

                    {/* Delivery Terms */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Delivery Terms</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {DELIVERY_TERM_PRESETS.map(p => (
                          <button key={p} type="button"
                            onClick={() => form.setValue("deliveryTerms", p)}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              form.watch("deliveryTerms") === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                            }`}
                          >{p}</button>
                        ))}
                      </div>
                      <FormField control={form.control} name="deliveryTerms" render={({ field }) => (
                        <FormItem><FormControl><Input placeholder="e.g. Ex Works" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Terms</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PAYMENT_TERM_PRESETS.map(p => (
                        <button key={p} type="button"
                          onClick={() => form.setValue("paymentTerms", p)}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            form.watch("paymentTerms") === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                          }`}
                        >{p}</button>
                      ))}
                    </div>
                    <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                      <FormItem><FormControl><Input placeholder="e.g. 30 days from invoice date" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Notes</FormLabel>
                      <FormControl><Textarea rows={3} placeholder="Notes visible to the customer on the PDF quote…" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="internalNotes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes <span className="text-muted-foreground text-xs font-normal">(not shown on PDF)</span></FormLabel>
                      <FormControl><Textarea rows={3} placeholder="Internal notes for your team only…" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Certification Requirements</CardTitle>
                  <CardDescription>Check which certificates are included with this quote</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {([
                      { name: "materialCertIncluded" as const, label: "Material Certificate" },
                      { name: "inspectionReportIncluded" as const, label: "Inspection Report" },
                      { name: "fairIncluded" as const, label: "FAIR" },
                      { name: "cmmReportIncluded" as const, label: "CMM Report" },
                    ]).map(({ name, label }) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 rounded-md border p-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer text-sm">{label}</FormLabel>
                        </FormItem>
                      )} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 2: PART DETAILS */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Part Details</CardTitle>
                <CardDescription>Define the core geometry and requirements for each part</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Part tabs */}
                {fields.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {fields.map((_, idx) => (
                      <button key={idx} type="button"
                        onClick={() => setActiveLineItemIndex(idx)}
                        className={`px-3 py-1.5 text-sm rounded border ${activeLineItemIndex === idx ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                      >
                        Part {idx + 1}: {form.watch(`lineItems.${idx}.partName`) || "Unnamed"}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.partName`} render={({ field }) => (
                    <FormItem><FormLabel>Part Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.drawingNumber`} render={({ field }) => (
                    <FormItem><FormLabel>Drawing Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.revision`} render={({ field }) => (
                    <FormItem><FormLabel>Part Revision</FormLabel><FormControl><Input placeholder="e.g. A, B, 01" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.quantity`} render={({ field }) => (
                    <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.material`} render={({ field }) => (
                    <FormItem><FormLabel>Material *</FormLabel><FormControl><Input placeholder="e.g. EN8, 316 SS, 6082 T6" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.processType`} render={({ field }) => (
                    <FormItem><FormLabel>Process Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.machineId`} render={({ field }) => (
                    <FormItem><FormLabel>Target Machine</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))} value={field.value ? field.value.toString() : "none"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Default / Any" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Default / Any</SelectItem>
                          {machines?.filter(m => m.active).map(m => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.machineType})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.toleranceClass`} render={({ field }) => (
                    <FormItem><FormLabel>Tolerance Class</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "Standard"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Loose">Loose</SelectItem>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Tight">Tight</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.surfaceFinish`} render={({ field }) => (
                    <FormItem><FormLabel>Surface Finish</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "Standard"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Fine">Fine</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.complexity`} render={({ field }) => (
                    <FormItem><FormLabel>Complexity</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "Medium"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Simple">Simple</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Complex">Complex</SelectItem>
                          <SelectItem value="Very Complex">Very Complex</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    append({
                      partName: "", quantity: 1, material: "", processType: "Milling",
                      setupHours: 0, programmingHours: 0, machiningMinutesPerPart: 0,
                      inspectionHours: 0, deburringMinutesPerPart: 0, materialCostPerUnit: 0,
                      materialWastagePercentage: 10, toolingAllowance: 0, outsideProcessing: 0,
                      packaging: 0, delivery: 0, riskPercentage: 10, profitMarginPercentage: 30,
                      discountPercentage: 0, vatEnabled: settings?.vatEnabled ?? false, vatRate: settings?.vatRate ?? 20,
                    });
                    setActiveLineItemIndex(fields.length);
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> Add Part
                  </Button>
                  {fields.length > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      remove(activeLineItemIndex);
                      setActiveLineItemIndex(Math.max(0, activeLineItemIndex - 1));
                    }}>
                      <Trash2 className="w-4 h-4 mr-1" /> Remove Part
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: ASSUMPTIONS */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {fields.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {fields.map((_, idx) => (
                    <button key={idx} type="button" onClick={() => setActiveLineItemIndex(idx)}
                      className={`px-3 py-1.5 text-sm rounded border ${activeLineItemIndex === idx ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                    >
                      {form.watch(`lineItems.${idx}.partName`) || `Part ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Machining Assumptions</CardTitle>
                  <CardDescription>Time and effort estimates for part production</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Time (Total job)</h3>
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.setupHours`} render={({ field }) => (
                        <FormItem><FormLabel>Setup (Hours)</FormLabel><FormControl><Input type="number" step="0.25" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.programmingHours`} render={({ field }) => (
                        <FormItem><FormLabel>Programming (Hours)</FormLabel><FormControl><Input type="number" step="0.25" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.inspectionHours`} render={({ field }) => (
                        <FormItem><FormLabel>Inspection (Hours)</FormLabel><FormControl><Input type="number" step="0.25" min="0" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Time (Per Part)</h3>
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.machiningMinutesPerPart`} render={({ field }) => (
                        <FormItem><FormLabel>Machining (Mins)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.deburringMinutesPerPart`} render={({ field }) => (
                        <FormItem><FormLabel>Deburring (Mins)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Material & Direct</h3>
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.materialCostPerUnit`} render={({ field }) => (
                        <FormItem><FormLabel>Material Cost/Unit ({currencySymbol})</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.materialWastagePercentage`} render={({ field }) => (
                        <FormItem><FormLabel>Material Wastage (%)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.toolingAllowance`} render={({ field }) => (
                        <FormItem><FormLabel>Tooling Allowance ({currencySymbol})</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.outsideProcessing`} render={({ field }) => (
                        <FormItem><FormLabel>Outside Processing ({currencySymbol})</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.packaging`} render={({ field }) => (
                        <FormItem><FormLabel>Packaging ({currencySymbol})</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.delivery`} render={({ field }) => (
                        <FormItem><FormLabel>Delivery ({currencySymbol})</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Commercials</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.riskPercentage`} render={({ field }) => (
                      <FormItem><FormLabel>Risk Allowance (%)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.profitMarginPercentage`} render={({ field }) => (
                      <FormItem><FormLabel>Profit Margin (%)</FormLabel><FormControl><Input type="number" step="1" min="0" max="99" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.discountPercentage`} render={({ field }) => (
                      <FormItem><FormLabel>Discount (%)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.vatEnabled`} render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 pt-6">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel>Apply VAT</FormLabel>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {fields.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {fields.map((_, idx) => (
                    <button key={idx} type="button" onClick={() => setActiveLineItemIndex(idx)}
                      className={`px-3 py-1.5 text-sm rounded border ${activeLineItemIndex === idx ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                    >
                      {form.watch(`lineItems.${idx}.partName`) || `Part ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {fields.map((field, idx) => {
                if (idx !== activeLineItemIndex) return null;
                const itemVals = form.watch(`lineItems.${idx}`);
                const costs = calculateCosts(itemVals);
                return (
                  <Card key={field.id}>
                    <CardHeader>
                      <div className="flex justify-between items-baseline">
                        <div>
                          <CardTitle>{itemVals.partName || "Unnamed Part"}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">Qty: {itemVals.quantity} · {itemVals.material} · {itemVals.processType}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Unit Price</div>
                          <div className="text-2xl font-bold text-primary">{currencySymbol}{costs.pricePerPart.toFixed(2)}</div>
                          <div className="text-sm font-semibold text-muted-foreground">Total: {currencySymbol}{costs.sellPrice.toFixed(2)}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        {[
                          ["Setup", costs.setupCost],
                          ["Programming", costs.programmingCost],
                          ["Machining", costs.machiningCost],
                          ["Inspection", costs.inspectionCost],
                          ["Deburring", costs.deburringCost],
                          ["Material", costs.materialCostTotal],
                        ].map(([label, val]) => (
                          <div key={label as string} className="flex justify-between p-2 bg-muted/40 rounded">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-mono">{currencySymbol}{(val as number).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Direct Cost</span><span className="font-mono">{currencySymbol}{costs.directCost.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Risk ({itemVals.riskPercentage}%)</span><span className="font-mono">{currencySymbol}{costs.riskValue.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Cost before margin</span><span className="font-mono">{currencySymbol}{costs.costBeforeMargin.toFixed(2)}</span></div>
                        <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                          <span>Sell Price (excl. VAT)</span>
                          <span className="font-mono text-primary">{currencySymbol}{costs.sellPrice.toFixed(2)}</span>
                        </div>
                        {costs.vatEnabled && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>VAT ({costs.vatRate}%)</span>
                            <span className="font-mono">{currencySymbol}{costs.vatAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Quote summary */}
              <Card>
                <CardHeader><CardTitle>Quote Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {form.watch("leadTime") && <div><span className="text-muted-foreground">Lead time:</span> <span className="font-medium">{form.watch("leadTime")}</span></div>}
                    {form.watch("deliveryTerms") && <div><span className="text-muted-foreground">Delivery:</span> <span className="font-medium">{form.watch("deliveryTerms")}</span></div>}
                    {form.watch("paymentTerms") && <div><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{form.watch("paymentTerms")}</span></div>}
                    {form.watch("quoteRevision") && <div><span className="text-muted-foreground">Revision:</span> <span className="font-medium">{form.watch("quoteRevision")}</span></div>}
                  </div>
                  {(form.watch("materialCertIncluded") || form.watch("inspectionReportIncluded") || form.watch("fairIncluded") || form.watch("cmmReportIncluded")) && (
                    <div>
                      <span className="text-muted-foreground">Certifications: </span>
                      {[
                        form.watch("materialCertIncluded") && "Material Cert",
                        form.watch("inspectionReportIncluded") && "Inspection Report",
                        form.watch("fairIncluded") && "FAIR",
                        form.watch("cmmReportIncluded") && "CMM Report",
                      ].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {form.watch("notes") && (
                    <div className="p-3 bg-muted/30 rounded">
                      <div className="text-xs text-muted-foreground uppercase mb-1">Customer Notes</div>
                      <div>{form.watch("notes")}</div>
                    </div>
                  )}
                  {form.watch("internalNotes") && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded dark:bg-amber-950/20 dark:border-amber-800">
                      <div className="text-xs text-amber-600 dark:text-amber-400 uppercase mb-1">Internal Notes (not on PDF)</div>
                      <div>{form.watch("internalNotes")}</div>
                    </div>
                  )}
                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="font-semibold text-base">Quote Total</span>
                    <span className="text-xl font-bold text-primary">
                      {currencySymbol}{fields.reduce((sum, _, idx) => {
                        const costs = calculateCosts(form.watch(`lineItems.${idx}`));
                        return sum + costs.sellPrice;
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 5: COMPLETE */}
          {currentStep === 4 && (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold">Quote Saved!</h2>
                <p className="text-muted-foreground">Your quote has been saved successfully.</p>
                <div className="flex gap-3 justify-center pt-2">
                  {savedQuoteId && (
                    <Button asChild>
                      <Link href={`/quotes/${savedQuoteId}`}>View Quote</Link>
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <Link href="/quotes">Back to Quotes</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          {currentStep < 4 && (
            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={handlePrev} disabled={currentStep === 0}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              {currentStep < 3 ? (
                <Button type="button" onClick={handleNext}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Saving…" : "Save Quote"}
                </Button>
              )}
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
