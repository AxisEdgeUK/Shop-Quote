import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useListCustomers, useListMachines, useGetSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, ArrowRight, ArrowLeft, Check, Save, AlertTriangle, Zap } from "lucide-react";
import { Link } from "wouter";
import { QUOTE_TEMPLATES, QuoteTemplate } from "./quote-templates";

/* ── Schema ──────────────────────────────────────────────────── */
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

/* ── Constants ───────────────────────────────────────────────── */
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

const STEPS = ["Quote Info", "Part Details", "Assumptions", "Review", "Complete"];

/* ── Health indicator ────────────────────────────────────────── */
function healthLabel(margin: number, risk: number, complexity: string): {
  color: string; bg: string; border: string; label: string; tip: string;
} {
  const effective = margin - risk * 0.3;
  if (effective >= 25) return { color: "text-green-700", bg: "bg-green-50", border: "border-green-200", label: "Healthy", tip: "Margin looks solid for this job." };
  if (effective >= 12) return { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: "Caution", tip: "Margin is thin — double-check assumptions." };
  return { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", label: "At Risk", tip: "Risk of underquoting. Review costs carefully." };
}

function HealthBadge({ margin, risk, complexity }: { margin: number; risk: number; complexity?: string }) {
  const h = healthLabel(margin, risk, complexity ?? "Medium");
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${h.color} ${h.bg} ${h.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${h.label === "Healthy" ? "bg-green-500" : h.label === "Caution" ? "bg-amber-500" : "bg-red-500"}`} />
      {h.label}
    </span>
  );
}

/* ── Hidden cost prompt ──────────────────────────────────────── */
const COST_CHECKS = [
  { field: "deburringMinutesPerPart" as const, label: "Deburring time", note: "Small burrs add up on milled edges." },
  { field: "inspectionHours" as const, label: "Inspection time", note: "Don't absorb this — log it." },
  { field: "materialWastagePercentage" as const, label: "Material wastage %", note: "Off-cuts and drops have real cost." },
  { field: "packaging" as const, label: "Packaging", note: "Boxes, foam, tape — someone pays." },
  { field: "delivery" as const, label: "Delivery", note: "Courier or your time to the post office." },
  { field: "toolingAllowance" as const, label: "Tooling wear", note: "Inserts, end mills, drills — all cost money." },
  { field: "outsideProcessing" as const, label: "Subcontract / finishing", note: "Anodising, plating, heat treatment." },
];

function CostCheckPanel({ item }: { item: any }) {
  const missed = COST_CHECKS.filter(c => {
    const v = Number(item[c.field]);
    return v === 0 || isNaN(v);
  });
  if (missed.length === 0) return (
    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
      <Check className="w-4 h-4 shrink-0" />
      All cost areas have been filled in.
    </div>
  );
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Did you include these costs?
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {missed.map(c => (
          <div key={c.field} className="text-xs text-amber-700 bg-amber-100/60 rounded px-2 py-1.5">
            <span className="font-semibold">{c.label}</span>
            <span className="text-amber-600"> — {c.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Template picker ─────────────────────────────────────────── */
function TemplatePicker({ onSelect }: { onSelect: (t: QuoteTemplate) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Quick Start — Apply a Template</CardTitle>
        </div>
        <CardDescription>Pick a job type to preload sensible defaults for step 3. You can adjust everything afterwards.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
          {QUOTE_TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={`text-left p-3 rounded-lg border transition-all ${
                selected === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="font-semibold text-sm">{t.label}</div>
              <div className={`text-xs mt-0.5 ${selected === t.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {t.description}
              </div>
            </button>
          ))}
        </div>
        {selected && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const t = QUOTE_TEMPLATES.find(x => x.id === selected)!;
              onSelect(t);
            }}
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Apply {QUOTE_TEMPLATES.find(x => x.id === selected)?.label} defaults
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Props ───────────────────────────────────────────────────── */
interface QuoteWizardProps {
  initialValues?: Partial<QuoteFormValues>;
  onSubmit: (values: QuoteFormValues) => void;
  isSubmitting?: boolean;
  savedQuoteId?: number;
}

/* ── Component ───────────────────────────────────────────────── */
export function QuoteWizard({ initialValues, onSubmit, isSubmitting, savedQuoteId }: QuoteWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [templateApplied, setTemplateApplied] = useState(false);
  const { data: customers, isLoading: isLoadingCustomers } = useListCustomers();
  const { data: machines, isLoading: isLoadingMachines } = useListMachines();
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();

  const isNewQuote = !initialValues?.customerId;

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerId: initialValues?.customerId || 0,
      status: initialValues?.status || "Draft",
      quoteDate: initialValues?.quoteDate || new Date().toISOString().split("T")[0],
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
      lineItems: initialValues?.lineItems?.length
        ? (initialValues.lineItems as any)
        : [{
            partName: "", quantity: 1, material: "", processType: "Milling",
            setupHours: 0, programmingHours: 0, machiningMinutesPerPart: 0,
            inspectionHours: 0, deburringMinutesPerPart: 0, materialCostPerUnit: 0,
            materialWastagePercentage: 10, toolingAllowance: 0, outsideProcessing: 0,
            packaging: 0, delivery: 0, riskPercentage: 10, profitMarginPercentage: 30,
            discountPercentage: 0, vatEnabled: false, vatRate: 20,
          }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lineItems" });
  const [activeLineItemIndex, setActiveLineItemIndex] = useState(0);

  // Set defaults from settings once loaded
  useEffect(() => {
    if (settings && !initialValues?.quoteDate) {
      if (!form.getValues("validUntil")) {
        const d = new Date();
        d.setDate(d.getDate() + (settings.quoteValidityDays || 30));
        form.setValue("validUntil", d.toISOString().split("T")[0]);
      }
      if (!form.getValues("paymentTerms")) form.setValue("paymentTerms", settings.paymentTerms || "");
      if (!form.getValues("termsAndConditions")) form.setValue("termsAndConditions", settings.termsAndConditions || "");
      if (!form.getValues("leadTime")) form.setValue("leadTime", settings.defaultLeadTime || "");
      if (!form.getValues("deliveryTerms")) form.setValue("deliveryTerms", settings.defaultDeliveryTerms || "");
      const currentItems = form.getValues("lineItems");
      if (currentItems.length === 1 && !currentItems[0].partName) {
        form.setValue("lineItems.0.profitMarginPercentage", settings.defaultMarginPercentage || 30);
        form.setValue("lineItems.0.vatEnabled", settings.vatEnabled ?? false);
        form.setValue("lineItems.0.vatRate", settings.vatRate || 20);
      }
    }
  }, [settings, initialValues, form]);

  const applyTemplate = (t: QuoteTemplate) => {
    const d = t.defaults;
    form.setValue(`lineItems.${activeLineItemIndex}.processType`, t.processType);
    form.setValue(`lineItems.${activeLineItemIndex}.setupHours`, d.setupHours);
    form.setValue(`lineItems.${activeLineItemIndex}.programmingHours`, d.programmingHours);
    form.setValue(`lineItems.${activeLineItemIndex}.machiningMinutesPerPart`, d.machiningMinutesPerPart);
    form.setValue(`lineItems.${activeLineItemIndex}.inspectionHours`, d.inspectionHours);
    form.setValue(`lineItems.${activeLineItemIndex}.deburringMinutesPerPart`, d.deburringMinutesPerPart);
    form.setValue(`lineItems.${activeLineItemIndex}.materialWastagePercentage`, d.materialWastagePercentage);
    form.setValue(`lineItems.${activeLineItemIndex}.toolingAllowance`, d.toolingAllowance);
    form.setValue(`lineItems.${activeLineItemIndex}.outsideProcessing`, d.outsideProcessing);
    form.setValue(`lineItems.${activeLineItemIndex}.packaging`, d.packaging);
    form.setValue(`lineItems.${activeLineItemIndex}.delivery`, d.delivery);
    form.setValue(`lineItems.${activeLineItemIndex}.riskPercentage`, d.riskPercentage);
    form.setValue(`lineItems.${activeLineItemIndex}.profitMarginPercentage`, d.profitMarginPercentage);
    form.setValue(`lineItems.${activeLineItemIndex}.toleranceClass`, d.toleranceClass);
    form.setValue(`lineItems.${activeLineItemIndex}.complexity`, d.complexity);
    form.setValue(`lineItems.${activeLineItemIndex}.surfaceFinish`, d.surfaceFinish);
    setTemplateApplied(true);
  };

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
      setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => setCurrentStep((p) => Math.max(p - 1, 0));
  const handleFinalSubmit = (data: QuoteFormValues) => { onSubmit(data); setCurrentStep(4); };

  if (isLoadingCustomers || isLoadingMachines || isLoadingSettings) {
    return <Skeleton className="w-full h-[600px]" />;
  }

  const cur = settings?.currency === "GBP" ? "£" : settings?.currency === "EUR" ? "€" : "$";

  const calculateCosts = (item: any) => {
    const qty = Number(item.quantity) || 1;
    const sm = machines?.find(m => m.id === Number(item.machineId));
    const hr = sm ? sm.hourlyRate : (settings?.defaultHourlyRate || 0);
    const sr = sm ? sm.setupRate : (settings?.defaultSetupRate || 0);
    const setupCost = (Number(item.setupHours) || 0) * sr;
    const programmingCost = (Number(item.programmingHours) || 0) * hr;
    const machiningCost = ((Number(item.machiningMinutesPerPart) || 0) / 60) * qty * hr;
    const inspectionCost = (Number(item.inspectionHours) || 0) * hr;
    const deburringCost = ((Number(item.deburringMinutesPerPart) || 0) / 60) * qty * hr;
    const materialCostTotal = (Number(item.materialCostPerUnit) || 0) * qty * (1 + (Number(item.materialWastagePercentage) || 0) / 100);
    const directCost = setupCost + programmingCost + machiningCost + inspectionCost + deburringCost
      + materialCostTotal + (Number(item.toolingAllowance) || 0) + (Number(item.outsideProcessing) || 0)
      + (Number(item.packaging) || 0) + (Number(item.delivery) || 0);
    const riskValue = directCost * ((Number(item.riskPercentage) || 0) / 100);
    const costBeforeMargin = directCost + riskValue;
    const pmp = Number(item.profitMarginPercentage) || 0;
    const pre = pmp >= 100 ? costBeforeMargin : costBeforeMargin / (1 - pmp / 100);
    const sellPrice = Number(item.discountPercentage) > 0 ? pre * (1 - (Number(item.discountPercentage) || 0) / 100) : pre;
    const pricePerPart = sellPrice / qty;
    const vatEnabled = item.vatEnabled ?? settings?.vatEnabled ?? false;
    const vatRate = item.vatRate ?? settings?.vatRate ?? 20;
    const vatAmount = vatEnabled ? sellPrice * (vatRate / 100) : 0;
    return { setupCost, programmingCost, machiningCost, inspectionCost, deburringCost, materialCostTotal, directCost, riskValue, costBeforeMargin, sellPrice, pricePerPart, vatEnabled, vatRate, vatAmount, totalIncVat: sellPrice + vatAmount };
  };

  const newItemDefaults = () => ({
    partName: "", quantity: 1, material: "", processType: "Milling",
    setupHours: 0, programmingHours: 0, machiningMinutesPerPart: 0,
    inspectionHours: 0, deburringMinutesPerPart: 0, materialCostPerUnit: 0,
    materialWastagePercentage: 10, toolingAllowance: 0, outsideProcessing: 0,
    packaging: 0, delivery: 0, riskPercentage: settings?.defaultMarginPercentage ? 10 : 10,
    profitMarginPercentage: settings?.defaultMarginPercentage || 30,
    discountPercentage: 0, vatEnabled: settings?.vatEnabled ?? false, vatRate: settings?.vatRate ?? 20,
  });

  const PartTabs = () => fields.length > 1 ? (
    <div className="flex gap-2 flex-wrap">
      {fields.map((_, idx) => (
        <button key={idx} type="button" onClick={() => setActiveLineItemIndex(idx)}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${activeLineItemIndex === idx ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
        >
          {form.watch(`lineItems.${idx}.partName`) || `Part ${idx + 1}`}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
        {STEPS.map((step, index) => (
          <div key={step} className="flex items-center gap-1">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium shrink-0 ${
              currentStep === index ? "bg-primary text-primary-foreground border-primary" :
              currentStep > index ? "bg-primary/20 text-primary border-primary/20" : "border-muted-foreground"
            }`}>
              {currentStep > index ? <Check className="w-3 h-3" /> : index + 1}
            </div>
            <span className={`${currentStep === index ? "font-medium text-foreground" : ""} hidden sm:inline`}>{step}</span>
            {index < STEPS.length - 1 && <div className="w-6 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="space-y-4">

          {/* ── STEP 1: QUOTE INFO ──────────────────────────────────── */}
          {currentStep === 0 && (
            <div className="space-y-4">
              {/* Template picker — new quotes only */}
              {isNewQuote && !templateApplied && (
                <TemplatePicker onSelect={applyTemplate} />
              )}
              {templateApplied && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                  <Check className="w-4 h-4 shrink-0" />
                  Template defaults applied — you can still edit everything in step 3.
                  <button type="button" className="ml-auto text-xs underline" onClick={() => setTemplateApplied(false)}>Change template</button>
                </div>
              )}

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
                          {customers?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem><FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {["Draft","Sent","Won","Lost","Expired"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                      <FormItem><FormLabel>Revision</FormLabel><FormControl><Input placeholder="A" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="revisionNotes" render={({ field }) => (
                      <FormItem><FormLabel>Revision Notes</FormLabel><FormControl><Input placeholder="What changed?" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Commercial Terms</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lead Time</label>
                      <div className="flex flex-wrap gap-1.5">
                        {LEAD_TIME_PRESETS.map(p => (
                          <button key={p} type="button" onClick={() => form.setValue("leadTime", p)}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${form.watch("leadTime") === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                          >{p}</button>
                        ))}
                      </div>
                      <FormField control={form.control} name="leadTime" render={({ field }) => (
                        <FormItem><FormControl><Input placeholder="e.g. 4 weeks" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Delivery Terms</label>
                      <div className="flex flex-wrap gap-1.5">
                        {DELIVERY_TERM_PRESETS.map(p => (
                          <button key={p} type="button" onClick={() => form.setValue("deliveryTerms", p)}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${form.watch("deliveryTerms") === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                          >{p}</button>
                        ))}
                      </div>
                      <FormField control={form.control} name="deliveryTerms" render={({ field }) => (
                        <FormItem><FormControl><Input placeholder="e.g. Ex Works" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Terms</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_TERM_PRESETS.map(p => (
                        <button key={p} type="button" onClick={() => form.setValue("paymentTerms", p)}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${form.watch("paymentTerms") === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
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
                <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Notes</FormLabel>
                      <FormControl><Textarea rows={3} placeholder="Notes visible to the customer on the PDF…" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="internalNotes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes <span className="text-muted-foreground text-xs font-normal">(not on PDF)</span></FormLabel>
                      <FormControl><Textarea rows={2} placeholder="Internal use only…" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Certification Requirements</CardTitle>
                  <CardDescription>Which certificates are included with this quote?</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {([
                      { name: "materialCertIncluded" as const, label: "Material Cert" },
                      { name: "inspectionReportIncluded" as const, label: "Inspection Report" },
                      { name: "fairIncluded" as const, label: "FAIR" },
                      { name: "cmmReportIncluded" as const, label: "CMM Report" },
                    ]).map(({ name, label }) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 rounded-md border p-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="font-normal cursor-pointer text-sm">{label}</FormLabel>
                        </FormItem>
                      )} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── STEP 2: PART DETAILS ────────────────────────────────── */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Part Details</CardTitle>
                <CardDescription>Define the core geometry and requirements for each part</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <PartTabs />
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
                          {["Milling","Turning","Mill-Turn","Manual","Other"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
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
                          {machines?.filter(m => m.active).map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.machineType})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.toleranceClass`} render={({ field }) => (
                    <FormItem><FormLabel>Tolerance Class</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "Standard"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{["Loose","Standard","Tight","Critical"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.surfaceFinish`} render={({ field }) => (
                    <FormItem><FormLabel>Surface Finish</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "Standard"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{["Standard","Fine","Critical"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.complexity`} render={({ field }) => (
                    <FormItem><FormLabel>Complexity</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "Medium"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{["Simple","Medium","Complex","Very Complex"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { append(newItemDefaults() as any); setActiveLineItemIndex(fields.length); }}>
                    <Plus className="w-4 h-4 mr-1" /> Add Part
                  </Button>
                  {fields.length > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { remove(activeLineItemIndex); setActiveLineItemIndex(Math.max(0, activeLineItemIndex - 1)); }}>
                      <Trash2 className="w-4 h-4 mr-1" /> Remove Part
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 3: ASSUMPTIONS ─────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <PartTabs />

              {/* Hidden cost prompts */}
              <CostCheckPanel item={form.watch(`lineItems.${activeLineItemIndex}`)} />

              <Card>
                <CardHeader>
                  <CardTitle>Machining Assumptions</CardTitle>
                  <CardDescription>Time and effort estimates — adjust from template if needed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Time — total job</h3>
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.setupHours`} render={({ field }) => (
                        <FormItem><FormLabel>Setup (hours)</FormLabel><FormControl><Input type="number" step="0.25" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.programmingHours`} render={({ field }) => (
                        <FormItem><FormLabel>Programming (hours)</FormLabel><FormControl><Input type="number" step="0.25" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.inspectionHours`} render={({ field }) => (
                        <FormItem><FormLabel>Inspection (hours)</FormLabel><FormControl><Input type="number" step="0.25" min="0" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Time — per part</h3>
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.machiningMinutesPerPart`} render={({ field }) => (
                        <FormItem><FormLabel>Machining (mins)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.deburringMinutesPerPart`} render={({ field }) => (
                        <FormItem><FormLabel>Deburring (mins)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Material & direct costs</h3>
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.materialCostPerUnit`} render={({ field }) => (
                        <FormItem><FormLabel>Material cost/unit ({cur})</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.materialWastagePercentage`} render={({ field }) => (
                        <FormItem><FormLabel>Wastage (%)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.toolingAllowance`} render={({ field }) => (
                        <FormItem><FormLabel>Tooling ({cur})</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.outsideProcessing`} render={({ field }) => (
                        <FormItem><FormLabel>Outside processing ({cur})</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.packaging`} render={({ field }) => (
                        <FormItem><FormLabel>Packaging ({cur})</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.delivery`} render={({ field }) => (
                        <FormItem><FormLabel>Delivery ({cur})</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
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
                      <FormItem><FormLabel>Risk allowance (%)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.profitMarginPercentage`} render={({ field }) => (
                      <FormItem><FormLabel>Profit margin (%)</FormLabel><FormControl><Input type="number" step="1" min="0" max="99" {...field} /></FormControl></FormItem>
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

          {/* ── STEP 4: REVIEW ──────────────────────────────────────── */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <PartTabs />

              {fields.map((field, idx) => {
                if (idx !== activeLineItemIndex) return null;
                const itemVals = form.watch(`lineItems.${idx}`);
                const c = calculateCosts(itemVals);
                const margin = Number(itemVals.profitMarginPercentage) || 0;
                const risk = Number(itemVals.riskPercentage) || 0;

                return (
                  <Card key={field.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <CardTitle>{itemVals.partName || "Unnamed Part"}</CardTitle>
                            <HealthBadge margin={margin} risk={risk} complexity={itemVals.complexity} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Qty: {itemVals.quantity} · {itemVals.material} · {itemVals.processType}
                            {itemVals.drawingNumber && ` · Dwg: ${itemVals.drawingNumber}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground">Unit Price</div>
                          <div className="text-2xl font-bold text-primary">{cur}{c.pricePerPart.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground font-medium">Total: {cur}{c.sellPrice.toFixed(2)}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {[
                          ["Setup", c.setupCost],
                          ["Programming", c.programmingCost],
                          ["Machining", c.machiningCost],
                          ["Inspection", c.inspectionCost],
                          ["Deburring", c.deburringCost],
                          ["Material", c.materialCostTotal],
                        ].map(([label, val]) => (
                          <div key={label as string} className="flex justify-between items-center px-3 py-2 bg-muted/40 rounded text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-mono">{cur}{(val as number).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 space-y-1 text-sm border-t">
                        <div className="flex justify-between"><span className="text-muted-foreground">Direct cost</span><span className="font-mono">{cur}{c.directCost.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Risk ({risk}%)</span><span className="font-mono">{cur}{c.riskValue.toFixed(2)}</span></div>
                        <div className="flex justify-between font-semibold border-t pt-1.5 mt-1">
                          <span>Sell price (excl. VAT)</span>
                          <span className="font-mono text-primary">{cur}{c.sellPrice.toFixed(2)}</span>
                        </div>
                        {c.vatEnabled && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>VAT ({c.vatRate}%)</span>
                            <span className="font-mono">{cur}{c.vatAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Health tip */}
                      {(() => {
                        const h = healthLabel(margin, risk, itemVals.complexity ?? "Medium");
                        return (
                          <div className={`text-xs px-3 py-2 rounded border ${h.bg} ${h.border} ${h.color}`}>
                            <strong>{h.label}:</strong> {h.tip}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Quote totals summary */}
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
                    <span className="font-semibold text-base">Quote Total (excl. VAT)</span>
                    <span className="text-xl font-bold text-primary">
                      {cur}{fields.reduce((sum, _, idx) => sum + calculateCosts(form.watch(`lineItems.${idx}`)).sellPrice, 0).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── STEP 5: COMPLETE ────────────────────────────────────── */}
          {currentStep === 4 && (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold">Quote Saved!</h2>
                <p className="text-muted-foreground">Your quote has been saved successfully.</p>
                <div className="flex gap-3 justify-center pt-2">
                  {savedQuoteId && <Button asChild><Link href={`/quotes/${savedQuoteId}`}>View Quote</Link></Button>}
                  <Button variant="outline" asChild><Link href="/quotes">Back to Quotes</Link></Button>
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
