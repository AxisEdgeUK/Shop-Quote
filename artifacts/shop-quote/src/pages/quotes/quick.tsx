import { useState, useEffect, useMemo } from "react";
import {
  useListCustomers,
  useListMachines,
  useGetSettings,
  useCreateQuote,
  getListQuotesQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Zap, Save, FileDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkflowDefaults } from "@/hooks/use-workflow-defaults";

const PROCESSES = [
  "Milling",
  "Turning",
  "Drilling",
  "Grinding",
  "Wire EDM",
  "Other",
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
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

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
                <Input
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. Aluminium 6082"
                  className="h-11"
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
                <Input
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  placeholder="e.g. 2 weeks"
                  className="h-11"
                />
              </div>
            </div>
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
                {result.sellPrice.toFixed(2)}
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
