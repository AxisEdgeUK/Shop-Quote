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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, ArrowRight, ArrowLeft, Check, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  termsAndConditions: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one part is required"),
});

export type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteWizardProps {
  initialValues?: Partial<QuoteFormValues>;
  onSubmit: (values: QuoteFormValues) => void;
  isSubmitting?: boolean;
}

const STEPS = ["Customer", "Part Details", "Assumptions", "Review", "Complete"];

export function QuoteWizard({ initialValues, onSubmit, isSubmitting }: QuoteWizardProps) {
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
      validUntil: initialValues?.validUntil || "", // Set dynamically from settings if empty
      notes: initialValues?.notes || "",
      paymentTerms: initialValues?.paymentTerms || "",
      termsAndConditions: initialValues?.termsAndConditions || "",
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
        vatEnabled: true,
        vatRate: 20,
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const [activeLineItemIndex, setActiveLineItemIndex] = useState(0);

  // Set defaults from settings once loaded
  useEffect(() => {
    if (settings && !initialValues?.quoteDate) {
      if (!form.getValues("validUntil")) {
        const d = new Date();
        d.setDate(d.getDate() + (settings.quoteValidityDays || 30));
        form.setValue("validUntil", d.toISOString().split('T')[0]);
      }
      if (!form.getValues("paymentTerms")) {
        form.setValue("paymentTerms", settings.paymentTerms || "");
      }
      if (!form.getValues("termsAndConditions")) {
        form.setValue("termsAndConditions", settings.termsAndConditions || "");
      }

      // Pre-fill line item defaults if it's a new quote
      const currentItems = form.getValues("lineItems");
      if (currentItems.length === 1 && !currentItems[0].partName) {
        form.setValue(`lineItems.0.profitMarginPercentage`, settings.defaultMarginPercentage || 30);
        form.setValue(`lineItems.0.vatEnabled`, settings.vatEnabled ?? true);
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
        `lineItems.${activeLineItemIndex}.processType`
      ]);
    } else if (currentStep === 2) {
      isValid = await form.trigger(); // Trigger all for line item
    }

    if (isValid || currentStep > 2) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFinalSubmit = (data: QuoteFormValues) => {
    onSubmit(data);
    setCurrentStep(4); // Success step
  };

  if (isLoadingCustomers || isLoadingMachines || isLoadingSettings) {
    return <Skeleton className="w-full h-[600px]" />;
  }

  // Cost calculation function for step 4
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
    
    const directCost = setupCost + programmingCost + machiningCost + inspectionCost + deburringCost + materialCostTotal + 
      (Number(item.toolingAllowance) || 0) + (Number(item.outsideProcessing) || 0) + 
      (Number(item.packaging) || 0) + (Number(item.delivery) || 0);
      
    const riskValue = directCost * ((Number(item.riskPercentage) || 0) / 100);
    const costBeforeMargin = directCost + riskValue;
    
    const profitMarginPercentage = Number(item.profitMarginPercentage) || 0;
    // sell_price = cost_before_margin / (1 - profit_margin_percentage / 100)
    const sellPrice = profitMarginPercentage >= 100 ? costBeforeMargin : costBeforeMargin / (1 - profitMarginPercentage / 100);
    
    let finalSellPrice = sellPrice;
    if (Number(item.discountPercentage) > 0) {
      finalSellPrice = sellPrice * (1 - (Number(item.discountPercentage) || 0) / 100);
    }
    
    const pricePerPart = finalSellPrice / qty;
    
    const vatEnabled = item.vatEnabled ?? settings?.vatEnabled ?? true;
    const vatRate = item.vatRate ?? settings?.vatRate ?? 20;
    
    const vatAmount = vatEnabled ? finalSellPrice * (vatRate / 100) : 0;
    const totalIncVat = vatEnabled ? finalSellPrice + vatAmount : finalSellPrice;

    return {
      setupCost, programmingCost, machiningCost, inspectionCost, deburringCost, materialCostTotal,
      directCost, riskValue, costBeforeMargin, sellPrice: finalSellPrice, pricePerPart,
      vatEnabled, vatRate, vatAmount, totalIncVat
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full border ${
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
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="space-y-8">
          
          {/* STEP 1: CUSTOMER */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Customer</CardTitle>
                <CardDescription>Choose who this quote is for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(Number(v))} 
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* STEP 2: PART DETAILS */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Part Details</CardTitle>
                <CardDescription>Define the core geometry and requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.partName`} render={({ field }) => (
                    <FormItem><FormLabel>Part Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.drawingNumber`} render={({ field }) => (
                    <FormItem><FormLabel>Drawing Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.revision`} render={({ field }) => (
                    <FormItem><FormLabel>Revision</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.quantity`} render={({ field }) => (
                    <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.material`} render={({ field }) => (
                    <FormItem><FormLabel>Material</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.processType`} render={({ field }) => (
                    <FormItem><FormLabel>Process Type</FormLabel>
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
                        <FormControl><SelectTrigger><SelectValue placeholder="Default/Any" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Default / Any</SelectItem>
                          {machines?.filter(m => m.active).map(m => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.machineType})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
                      <FormMessage />
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
                      <FormMessage />
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
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: ASSUMPTIONS */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Machining Assumptions</CardTitle>
                  <CardDescription>Time and effort estimates for part production</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Time (Total)</h3>
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
                        <FormItem><FormLabel>Material Cost/Unit (£)</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.materialWastagePercentage`} render={({ field }) => (
                        <FormItem><FormLabel>Material Wastage (%)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.toolingAllowance`} render={({ field }) => (
                        <FormItem><FormLabel>Tooling Allowance (£)</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.outsideProcessing`} render={({ field }) => (
                        <FormItem><FormLabel>Outside Processing (£)</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Commercials</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.riskPercentage`} render={({ field }) => (
                      <FormItem><FormLabel>Risk Allowance (%)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.profitMarginPercentage`} render={({ field }) => (
                      <FormItem><FormLabel>Profit Margin (%)</FormLabel><FormControl><Input type="number" step="1" min="0" max="99" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.discountPercentage`} render={({ field }) => (
                      <FormItem><FormLabel>Discount (%)</FormLabel><FormControl><Input type="number" step="1" min="0" {...field} /></FormControl></FormItem>
                    )} />
                    <div className="flex flex-col space-y-2 pt-6">
                      <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.vatEnabled`} render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel>Apply VAT</FormLabel>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 4: REVIEW & PRICING */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown Review</CardTitle>
                  <CardDescription>Live cost calculations based on your assumptions</CardDescription>
                </CardHeader>
                <CardContent>
                  {fields.map((field, idx) => {
                    if (idx !== activeLineItemIndex) return null;
                    const itemVals = form.watch(`lineItems.${idx}`);
                    const costs = calculateCosts(itemVals);
                    
                    return (
                      <div key={field.id} className="space-y-6">
                        <div className="flex justify-between items-baseline border-b pb-4">
                          <div>
                            <h3 className="text-xl font-bold">{itemVals.partName || "Unnamed Part"}</h3>
                            <p className="text-sm text-muted-foreground">Qty: {itemVals.quantity} • Material: {itemVals.material}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Unit Price</div>
                            <div className="text-2xl font-bold text-primary">£{costs.pricePerPart.toFixed(2)}</div>
                            <div className="text-sm font-semibold">Total: £{costs.sellPrice.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-muted/50 p-3 rounded-md">
                            <div className="text-muted-foreground mb-1">Setup Cost</div>
                            <div className="font-semibold">£{costs.setupCost.toFixed(2)}</div>
                          </div>
                          <div className="bg-muted/50 p-3 rounded-md">
                            <div className="text-muted-foreground mb-1">Programming</div>
                            <div className="font-semibold">£{costs.programmingCost.toFixed(2)}</div>
                          </div>
                          <div className="bg-muted/50 p-3 rounded-md">
                            <div className="text-muted-foreground mb-1">Machining</div>
                            <div className="font-semibold">£{costs.machiningCost.toFixed(2)}</div>
                          </div>
                          <div className="bg-muted/50 p-3 rounded-md">
                            <div className="text-muted-foreground mb-1">Material Total</div>
                            <div className="font-semibold">£{costs.materialCostTotal.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <tbody>
                              <tr className="border-b bg-muted/20">
                                <td className="py-2 px-4 font-medium w-1/2">Direct Cost</td>
                                <td className="py-2 px-4 text-right">£{costs.directCost.toFixed(2)}</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 px-4">Risk Allowance ({itemVals.riskPercentage || 0}%)</td>
                                <td className="py-2 px-4 text-right">£{costs.riskValue.toFixed(2)}</td>
                              </tr>
                              <tr className="border-b font-medium">
                                <td className="py-2 px-4">Cost Before Margin</td>
                                <td className="py-2 px-4 text-right">£{costs.costBeforeMargin.toFixed(2)}</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 px-4">Margin ({itemVals.profitMarginPercentage || 0}%)</td>
                                <td className="py-2 px-4 text-right">£{(costs.sellPrice - costs.costBeforeMargin).toFixed(2)}</td>
                              </tr>
                              <tr className="border-b bg-muted/50 text-base font-bold">
                                <td className="py-3 px-4">Sell Price</td>
                                <td className="py-3 px-4 text-right">£{costs.sellPrice.toFixed(2)}</td>
                              </tr>
                              {costs.vatEnabled && (
                                <>
                                  <tr className="border-b">
                                    <td className="py-2 px-4">VAT ({costs.vatRate}%)</td>
                                    <td className="py-2 px-4 text-right">£{costs.vatAmount.toFixed(2)}</td>
                                  </tr>
                                  <tr className="bg-primary/5 font-bold">
                                    <td className="py-3 px-4">Total Inc VAT</td>
                                    <td className="py-3 px-4 text-right text-primary">£{costs.totalIncVat.toFixed(2)}</td>
                                  </tr>
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Internal Technical Notes (Optional)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.toolingRecommendation`} render={({ field }) => (
                    <FormItem><FormLabel>Tooling Notes</FormLabel><FormControl><Textarea className="h-20" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.materialRecommendation`} render={({ field }) => (
                    <FormItem><FormLabel>Material Stockholder</FormLabel><FormControl><Textarea className="h-20" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`lineItems.${activeLineItemIndex}.coolantRecommendation`} render={({ field }) => (
                    <FormItem><FormLabel>Coolant Notes</FormLabel><FormControl><Textarea className="h-20" {...field} /></FormControl></FormItem>
                  )} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 5: FINALISE */}
          {currentStep === 4 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Quote Saved!</h2>
                <p className="text-muted-foreground mb-8">The quote has been generated successfully.</p>
                {/* PDF Download will be handled by the parent component after redirect */}
                <div className="flex justify-center gap-4">
                  <Button type="button" disabled variant="outline">Generating PDF...</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Controls */}
          {currentStep < 4 && (
            <div className="flex justify-between pt-4 border-t">
              <Button type="button" variant="outline" onClick={handlePrev} disabled={currentStep === 0}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              
              {currentStep < 3 ? (
                <Button type="button" onClick={handleNext}>
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="w-4 h-4 mr-2" /> 
                  {isSubmitting ? "Saving Quote..." : "Save Quote"}
                </Button>
              )}
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
