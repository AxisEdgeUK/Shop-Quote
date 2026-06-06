import { useState, useEffect, useMemo } from "react";
import {
  useListCustomers,
  useListMachines,
  useGetSettings,
  useCreateQuote,
  getListQuotesQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Zap,
  Save,
  FileDown,
  ArrowRight,
  Plus,
  Trash2,
  PlusCircle,
  Package,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useWorkflowDefaults } from "@/hooks/use-workflow-defaults";
import { MaterialCombobox } from "@/components/quotes/MaterialCombobox";
import { apiFetch, type ChargeableExtra, type StandardProduct } from "@/lib/api";

interface QuoteAddon {
  key: string;
  type: "extra" | "product";
  id: number;
  name: string;
  category: string;
  unit: string;
  unitSellPrice: number;
  qty: number;
  notes: string;
}

let addonKeyCounter = 0;
function nextKey() {
  return `addon-${++addonKeyCounter}`;
}

const PROCESSES = [
  "Milling",
  "Turning",
  "Mill/Turn",
  "Drilling",
  "Grinding",
  "Wire EDM",
  "Other",
];

const LEAD_TIMES = [
  "1 week",
  "2 weeks",
  "3 weeks",
  "4 weeks",
  "6 weeks",
  "8 weeks",
  "10 weeks",
  "12 weeks",
  "To be confirmed",
];

const DELIVERY_METHODS = [
  "Collection",
  "Local Delivery",
  "Courier",
  "Pallet",
  "Customer Arranged",
  "To be confirmed",
];
const CUR = "£";

function calcResult(
  setupHours: number,
  machiningMins: number,
  qty: number,
  materialCost: number,
  toolingAllowance: number,
  margin: number,
  hourlyRate: number,
  setupRate: number,
) {
  const setupCost = setupHours * setupRate;
  const machiningCost = (machiningMins / 60) * qty * hourlyRate;
  const materialTotal = materialCost * qty;
  const directCost =
    setupCost + machiningCost + materialTotal + toolingAllowance;
  const safeMargin = Math.max(0, Math.min(margin, 99));
  const sellPrice = directCost / (1 - safeMargin / 100);
  const pricePerPart = qty > 0 ? sellPrice / qty : 0;
  return {
    setupCost,
    machiningCost,
    materialTotal,
    directCost,
    sellPrice,
    pricePerPart,
  };
}

export function QuickQuote() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { save: saveDefaults, load: loadDefaults } = useWorkflowDefaults();
  const createQuote = useCreateQuote();

  const { data: customers, isLoading: customersLoading } = useListCustomers();
  const { data: machines, isLoading: machinesLoading } = useListMachines();
  const { data: settings, isLoading: settingsLoading } = useGetSettings();

  const [customerId, setCustomerId] = useState(0);
  const [partName, setPartName] = useState("");
  const [qty, setQty] = useState(1);
  const [material, setMaterial] = useState("");
  const [processType, setProcessType] = useState("Milling");
  const [machineId, setMachineId] = useState<number | null>(null);
  const [setupHours, setSetupHours] = useState(0);
  const [machiningMins, setMachiningMins] = useState(0);
  const [materialCost, setMaterialCost] = useState(0);
  const [toolingAllowance, setToolingAllowance] = useState(0);
  const [margin, setMargin] = useState(30);
  const [leadTime, setLeadTime] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [includeDeliveryInTotal, setIncludeDeliveryInTotal] = useState(true);
  const [addons, setAddons] = useState<QuoteAddon[]>([]);
  const [addonSearch, setAddonSearch] = useState("");
  const [showAddonPicker, setShowAddonPicker] = useState(false);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

  const { data: extrasData = [] } = useQuery<ChargeableExtra[]>({
    queryKey: ["extras", true],
    queryFn: () => apiFetch<ChargeableExtra[]>("/extras?all=false"),
  });

  const { data: productsData = [] } = useQuery<StandardProduct[]>({
    queryKey: ["products", true],
    queryFn: () => apiFetch<StandardProduct[]>("/products?all=false"),
  });

  const addonSearchLower = addonSearch.toLowerCase();
  const filteredExtras = extrasData.filter(
    (e) =>
      e.extraName.toLowerCase().includes(addonSearchLower) ||
      e.extraCode.toLowerCase().includes(addonSearchLower) ||
      e.category.toLowerCase().includes(addonSearchLower),
  );
  const filteredProducts = productsData.filter(
    (p) =>
      p.productName.toLowerCase().includes(addonSearchLower) ||
      p.productCode.toLowerCase().includes(addonSearchLower) ||
      p.category.toLowerCase().includes(addonSearchLower),
  );

  useEffect(() => {
    if (settingsLoading || machinesLoading || defaultsLoaded) return;
    const d = loadDefaults();
    if (d.lastMachineId && machines?.find((m) => m.id === d.lastMachineId)) {
      setMachineId(d.lastMachineId);
    }
    if (d.lastMaterial) setMaterial(d.lastMaterial);
    if (d.defaultMargin != null) {
      setMargin(d.defaultMargin);
    } else if (settings?.defaultMarginPercentage) {
      setMargin(parseFloat(String(settings.defaultMarginPercentage)));
    }
    if (d.defaultLeadTime) {
      setLeadTime(d.defaultLeadTime);
    } else if (settings?.defaultLeadTime) {
      setLeadTime(settings.defaultLeadTime);
    }
    setDefaultsLoaded(true);
  }, [
    settingsLoading,
    machinesLoading,
    machines,
    settings,
    defaultsLoaded,
    loadDefaults,
  ]);

  const selectedMachine = machines?.find((m) => m.id === machineId);
  const hourlyRate = selectedMachine
    ? parseFloat(String(selectedMachine.hourlyRate))
    : parseFloat(String(settings?.defaultHourlyRate || 65));
  const setupRate = selectedMachine
    ? parseFloat(String(selectedMachine.setupRate))
    : parseFloat(String(settings?.defaultSetupRate || 65));

  const result = useMemo(
    () =>
      calcResult(
        setupHours,
        machiningMins,
        qty,
        materialCost,
        toolingAllowance,
        margin,
        hourlyRate,
        setupRate,
      ),
    [
      setupHours,
      machiningMins,
      qty,
      materialCost,
      toolingAllowance,
      margin,
      hourlyRate,
      setupRate,
    ],
  );

  const canSubmit = customerId > 0 && partName.trim().length > 0 && qty > 0;

  const buildPayload = () => {
    const validUntilDate = new Date();
    validUntilDate.setDate(
      validUntilDate.getDate() + (settings?.quoteValidityDays || 30),
    );
    return {
      customerId,
      status: "Draft" as const,
      quoteDate: new Date().toISOString().split("T")[0],
      validUntil: validUntilDate.toISOString().split("T")[0],
      leadTime,
      paymentTerms: settings?.paymentTerms || "",
      termsAndConditions: settings?.termsAndConditions || "",
      deliveryTerms: settings?.defaultDeliveryTerms || "",
      quoteRevision: "A",
      revisionNotes: "",
      notes: "",
      internalNotes: "",
      priceBreakQtys: "",
      deliveryMethod,
      deliveryCost,
      includeDeliveryInTotal,
      materialCertIncluded: false,
      inspectionReportIncluded: false,
      fairIncluded: false,
      cmmReportIncluded: false,
      lineItems: [
        {
          partName,
          quantity: qty,
          material,
          processType,
          machineId: machineId ?? null,
          setupHours,
          programmingHours: 0,
          machiningMinutesPerPart: machiningMins,
          inspectionHours: 0,
          deburringMinutesPerPart: 0,
          materialCostPerUnit: materialCost,
          materialWastagePercentage: 0,
          toolingAllowance,
          outsideProcessing: 0,
          packaging: 0,
          delivery: 0,
          riskPercentage: 0,
          profitMarginPercentage: margin,
          discountPercentage: 0,
          vatEnabled: settings?.vatEnabled ?? false,
          vatRate: settings?.vatRate ?? 20,
        },
        ...addons.map((addon) => ({
          partName: addon.name,
          quantity: addon.qty,
          material: "",
          processType: "",
          machineId: null,
          setupHours: 0,
          programmingHours: 0,
          machiningMinutesPerPart: 0,
          inspectionHours: 0,
          deburringMinutesPerPart: 0,
          materialCostPerUnit: 0,
          materialWastagePercentage: 0,
          toolingAllowance: 0,
          outsideProcessing: addon.unitSellPrice * addon.qty,
          packaging: 0,
          delivery: 0,
          riskPercentage: 0,
          profitMarginPercentage: 0,
          discountPercentage: 0,
          vatEnabled: false,
          vatRate: 20,
          lineItemType: addon.type as "extra" | "product",
          notes: addon.notes,
        })),
      ],
    };
  };

  const doSave = (onSuccess: (id: number) => void) => {
    if (!canSubmit) return;
    saveDefaults({
      machineId: machineId ?? undefined,
      material,
      margin,
      leadTime,
    });
    createQuote.mutate(
      { data: buildPayload() as any },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          onSuccess(res.id);
        },
        onError: () =>
          toast({ title: "Failed to save quote", variant: "destructive" }),
      },
    );
  };

  const handleSaveDraft = () =>
    doSave((id) => {
      toast({ title: "Quote saved" });
      setLocation(`/quotes/${id}`);
    });

  const handleGeneratePdf = () =>
    doSave((id) => {
      setLocation(`/quotes/${id}`);
      setTimeout(() => window.print(), 900);
    });

  const handleFullQuote = () =>
    doSave((id) => {
      toast({ title: "Quote created — opening full editor" });
      setLocation(`/quotes/${id}/edit`);
    });

  const isLoading = customersLoading || machinesLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <Skeleton className="lg:col-span-3 h-[600px]" />
          <Skeleton className="lg:col-span-2 h-[500px]" />
        </div>
      </div>
    );
  }

  const cardStyle = {
    background: "hsl(var(--card))",
    borderColor: "hsl(var(--card-border))",
  };

  return (
    <div className="max-w-5xl mx-auto pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/quotes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <Zap className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Quick Quote</h1>
        <span
          className="text-sm hidden md:block"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Professional quote in under 90 seconds
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded border p-5 space-y-4" style={cardStyle}>
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Customer &amp; Part
            </div>
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select
                value={customerId ? String(customerId) : ""}
                onValueChange={(v) => setCustomerId(Number(v))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {(customers || []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Part Name</Label>
                <Input
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="e.g. Bracket A"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Material</Label>
                <MaterialCombobox
                  value={material}
                  onChange={(val, costPerKg) => {
                    setMaterial(val);
                    if (costPerKg !== undefined) {
                      setMaterialCost(costPerKg);
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Process</Label>
                <Select value={processType} onValueChange={setProcessType}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCESSES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Machine</Label>
              <Select
                value={machineId != null ? String(machineId) : "0"}
                onValueChange={(v) =>
                  setMachineId(v === "0" ? null : Number(v))
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select machine..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    Default rates ({CUR}
                    {parseFloat(
                      String(settings?.defaultHourlyRate || 65),
                    ).toFixed(0)}
                    /hr)
                  </SelectItem>
                  {(machines || [])
                    .filter((m) => m.active)
                    .map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name} ({CUR}
                        {parseFloat(String(m.hourlyRate)).toFixed(0)}/hr)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded border p-5 space-y-4" style={cardStyle}>
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Time &amp; Costs
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Setup (hours)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={setupHours}
                  onChange={(e) => setSetupHours(Number(e.target.value))}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Machining (mins/part)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={machiningMins}
                  onChange={(e) => setMachiningMins(Number(e.target.value))}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Material cost/unit ({CUR})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={materialCost}
                  onChange={(e) => setMaterialCost(Number(e.target.value))}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tooling ({CUR})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={toolingAllowance}
                  onChange={(e) => setToolingAllowance(Number(e.target.value))}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          <div className="rounded border p-5 space-y-4" style={cardStyle}>
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Commercials
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Margin (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  step="1"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lead Time</Label>
                <Select value={leadTime} onValueChange={setLeadTime}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select lead time..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_TIMES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded border p-5 space-y-4" style={cardStyle}>
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Delivery
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Delivery Method</Label>
                <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Delivery Cost ({CUR})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryCost}
                    onChange={(e) => setDeliveryCost(Number(e.target.value))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Include in Total</Label>
                  <div className="flex items-center gap-2 h-11">
                    <Switch
                      checked={includeDeliveryInTotal}
                      onCheckedChange={setIncludeDeliveryInTotal}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      {includeDeliveryInTotal ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Extras & Products */}
          <div className="rounded border p-5 space-y-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Extras &amp; Products
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddonPicker((v) => !v)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add
              </Button>
            </div>

            {showAddonPicker && (
              <div
                className="rounded border p-3 space-y-2"
                style={{
                  background: "hsl(var(--muted)/0.3)",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-8 text-sm"
                    placeholder="Search extras and products..."
                    value={addonSearch}
                    onChange={(e) => setAddonSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {filteredExtras.length === 0 &&
                    filteredProducts.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-3">
                        No items found
                      </div>
                    )}
                  {filteredExtras.length > 0 && (
                    <>
                      <div className="flex items-center gap-1.5 px-1 py-1.5">
                        <PlusCircle className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Chargeable Extras
                        </span>
                      </div>
                      {filteredExtras.map((extra) => (
                        <button
                          key={`extra-${extra.id}`}
                          type="button"
                          className="w-full text-left flex items-center justify-between px-3 py-2 rounded text-sm hover:bg-primary/10 transition-colors"
                          onClick={() => {
                            setAddons((prev) => [
                              ...prev,
                              {
                                key: nextKey(),
                                type: "extra",
                                id: extra.id,
                                name: extra.extraName,
                                category: extra.category,
                                unit: extra.unit,
                                unitSellPrice: extra.defaultSellPrice,
                                qty: 1,
                                notes: extra.notes,
                              },
                            ]);
                            setAddonSearch("");
                            setShowAddonPicker(false);
                          }}
                        >
                          <div>
                            <div className="font-medium">{extra.extraName}</div>
                            {extra.category && (
                              <div className="text-xs text-muted-foreground">
                                {extra.category}
                              </div>
                            )}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground ml-4 shrink-0">
                            {CUR}
                            {extra.defaultSellPrice.toFixed(2)} /{extra.unit}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredProducts.length > 0 && (
                    <>
                      <div className="flex items-center gap-1.5 px-1 py-1.5 mt-1">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Standard Products
                        </span>
                      </div>
                      {filteredProducts.map((product) => (
                        <button
                          key={`product-${product.id}`}
                          type="button"
                          className="w-full text-left flex items-center justify-between px-3 py-2 rounded text-sm hover:bg-primary/10 transition-colors"
                          onClick={() => {
                            setAddons((prev) => [
                              ...prev,
                              {
                                key: nextKey(),
                                type: "product",
                                id: product.id,
                                name: product.productName,
                                category: product.category,
                                unit: product.unit,
                                unitSellPrice: product.defaultSellPrice,
                                qty: 1,
                                notes: product.notes,
                              },
                            ]);
                            setAddonSearch("");
                            setShowAddonPicker(false);
                          }}
                        >
                          <div>
                            <div className="font-medium">{product.productName}</div>
                            <div className="text-xs text-muted-foreground">
                              {[product.category, product.material, product.standardSize]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground ml-4 shrink-0">
                            {CUR}
                            {product.defaultSellPrice.toFixed(2)} /{product.unit}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {addons.length === 0 && !showAddonPicker && (
              <p className="text-sm text-muted-foreground">
                No extras or products added yet. Click{" "}
                <span className="font-medium">Add</span> to pick from your
                library.
              </p>
            )}

            {addons.length > 0 && (
              <div className="space-y-2">
                {addons.map((addon) => (
                  <div
                    key={addon.key}
                    className="flex items-center gap-2 rounded border p-2"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    {addon.type === "extra" ? (
                      <PlusCircle className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <Package className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {addon.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {CUR}
                        {addon.unitSellPrice.toFixed(2)} /{addon.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        min="1"
                        value={addon.qty}
                        onChange={(e) => {
                          const q = Math.max(1, Number(e.target.value));
                          setAddons((prev) =>
                            prev.map((a) =>
                              a.key === addon.key ? { ...a, qty: q } : a,
                            ),
                          );
                        }}
                        className="w-16 h-8 text-sm text-center"
                      />
                      <div className="text-sm font-mono text-right w-16">
                        {CUR}
                        {(addon.unitSellPrice * addon.qty).toFixed(2)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setAddons((prev) =>
                            prev.filter((a) => a.key !== addon.key),
                          )
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div
            className="rounded border p-5 lg:sticky lg:top-4"
            style={{
              background: "hsl(var(--card))",
              borderColor: "hsl(213 97% 58% / 0.35)",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Live Result
            </div>

            <div
              className="text-center py-5 border-b mb-4"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <div
                className="text-xs mb-1"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Price per part
              </div>
              <div
                className="text-4xl font-bold tabular-nums"
                style={{ color: "hsl(213 97% 58%)" }}
              >
                {CUR}
                {result.pricePerPart.toFixed(2)}
              </div>
              <div
                className="text-sm mt-1"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Total: {CUR}
                {(
                  result.sellPrice +
                  addons.reduce((s, a) => s + a.unitSellPrice * a.qty, 0) +
                  (includeDeliveryInTotal && deliveryCost > 0
                    ? deliveryCost
                    : 0)
                ).toFixed(2)}
                {includeDeliveryInTotal && deliveryCost > 0 && (
                  <span className="ml-1 text-xs opacity-70">(incl. delivery)</span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {(
                [
                  ["Setup", result.setupCost],
                  ["Machining", result.machiningCost],
                  ["Material", result.materialTotal],
                  ["Tooling", toolingAllowance],
                ] as [string, number][]
              ).map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>
                    {label}
                  </span>
                  <span className="font-mono">
                    {CUR}
                    {val.toFixed(2)}
                  </span>
                </div>
              ))}
              {addons.length > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>
                    Extras &amp; Products
                  </span>
                  <span className="font-mono">
                    {CUR}
                    {addons
                      .reduce((s, a) => s + a.unitSellPrice * a.qty, 0)
                      .toFixed(2)}
                  </span>
                </div>
              )}
              {deliveryCost > 0 && includeDeliveryInTotal && (
                <div className="flex justify-between">
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>
                    Delivery
                  </span>
                  <span className="font-mono">
                    {CUR}
                    {deliveryCost.toFixed(2)}
                  </span>
                </div>
              )}
              <div
                className="flex justify-between border-t pt-2 mt-2"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <span style={{ color: "hsl(var(--muted-foreground))" }}>
                  Direct cost
                </span>
                <span className="font-mono">
                  {CUR}
                  {result.directCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "hsl(var(--muted-foreground))" }}>
                  Margin
                </span>
                <span className="font-mono">{margin}%</span>
              </div>
            </div>

            <div
              className="mt-4 pt-4 border-t text-xs space-y-0.5"
              style={{
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              <div>
                {CUR}
                {hourlyRate.toFixed(0)}/hr machining · {CUR}
                {setupRate.toFixed(0)}/hr setup
              </div>
              {selectedMachine && (
                <div style={{ color: "hsl(213 97% 58%)" }}>
                  {selectedMachine.name}
                </div>
              )}
              {leadTime && <div>Lead time: {leadTime}</div>}
              {deliveryMethod && <div>Delivery: {deliveryMethod}</div>}
            </div>

            <div className="mt-5 space-y-2">
              <Button
                className="w-full h-12 font-semibold gap-2"
                onClick={handleSaveDraft}
                disabled={!canSubmit || createQuote.isPending}
              >
                <Save className="w-4 h-4" />
                {createQuote.isPending ? "Saving..." : "Save Draft"}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-11 gap-1.5 text-sm"
                  onClick={handleGeneratePdf}
                  disabled={!canSubmit || createQuote.isPending}
                >
                  <FileDown className="w-4 h-4" /> Generate PDF
                </Button>
                <Button
                  variant="outline"
                  className="h-11 gap-1.5 text-sm"
                  onClick={handleFullQuote}
                  disabled={!canSubmit || createQuote.isPending}
                >
                  <ArrowRight className="w-4 h-4" /> Full Quote
                </Button>
              </div>
              {!canSubmit && (
                <p
                  className="text-xs text-center pt-1"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  Select a customer and enter a part name to save.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
