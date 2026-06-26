import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  useListCustomers,
  useListMachines,
  useGetSettings,
  useCreateQuote,
  useUpdateQuote,
  getListQuotesQueryKey,
  getGetQuoteQueryKey,
  type Quote,
  type QuoteLineItem,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  Save,
  FileDown,
  Eye,
  Plus,
  Trash2,
  PlusCircle,
  Package,
  Search,
  Copy,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface PartEntry {
  key: string;
  partName: string;
  drawingNumber: string;
  revision: string;
  qty: number;
  material: string;
  processType: string;
  machineId: number | null;
  rateSource: "machine" | "manual";
  manualHourlyRate: number;
  manualSetupRate: number | null;
  setupHours: number;
  machiningMins: number;
  materialCost: number;
  toolingAllowance: number;
  notes: string;
  collapsed: boolean;
  // Snapshot of the original persisted line item so advanced fields (programming,
  // inspection, risk, tolerances, etc.) — which are no longer editable in the UI —
  // round-trip without loss when an existing quote is edited and re-saved.
  _original?: QuoteLineItem;
}

interface CalcResult {
  setupCost: number;
  machiningCost: number;
  materialTotal: number;
  directCost: number;
  sellPrice: number;
  pricePerPart: number;
}

type MachineRow = {
  id: number;
  name: string;
  hourlyRate: string | number;
  setupRate: string | number;
  active: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";

// ── Counters ──────────────────────────────────────────────────────────────────

let addonKeyCounter = 0;
let partKeyCounter = 0;
function nextAddonKey() { return `addon-${++addonKeyCounter}`; }
function nextPartKey() { return `part-${++partKeyCounter}`; }

// ── Constants ─────────────────────────────────────────────────────────────────

const PROCESSES = ["Milling", "Turning", "Mill/Turn", "Drilling", "Grinding", "Wire EDM", "Other"];
const LEAD_TIMES = ["1 week", "2 weeks", "3 weeks", "4 weeks", "6 weeks", "8 weeks", "10 weeks", "12 weeks", "To be confirmed"];
const DELIVERY_METHODS = ["Collection", "Local Delivery", "Courier", "Pallet", "Customer Arranged", "To be confirmed"];
const CUR = "£";
const MAX_PARTS = 10;
const ADDON_TYPES = new Set(["extra", "product"]);

// ── Calc ───────────────────────────────────────────────────────────────────────

function calcResult(
  setupHours: number,
  machiningMins: number,
  qty: number,
  materialCost: number,
  toolingAllowance: number,
  margin: number,
  hourlyRate: number,
  setupRate: number,
): CalcResult {
  const setupCost = setupHours * setupRate;
  const machiningCost = (machiningMins / 60) * qty * hourlyRate;
  const materialTotal = materialCost * qty;
  const directCost = setupCost + machiningCost + materialTotal + toolingAllowance;
  const safeMargin = Math.max(0, Math.min(margin, 99));
  const sellPrice = directCost / (1 - safeMargin / 100);
  const pricePerPart = qty > 0 ? sellPrice / qty : 0;
  return { setupCost, machiningCost, materialTotal, directCost, sellPrice, pricePerPart };
}

function makePart(defaults: Partial<PartEntry> = {}): PartEntry {
  return {
    key: nextPartKey(),
    partName: "",
    drawingNumber: "",
    revision: "",
    qty: 1,
    material: "",
    processType: "Milling",
    machineId: null,
    rateSource: "machine",
    manualHourlyRate: 0,
    manualSetupRate: null,
    setupHours: 0,
    machiningMins: 0,
    materialCost: 0,
    toolingAllowance: 0,
    notes: "",
    collapsed: false,
    ...defaults,
  };
}

// Maps a persisted line item back into the editable PartEntry shape, keeping the
// raw item as `_original` for advanced-field preservation on save.
function partFromLineItem(item: QuoteLineItem): PartEntry {
  const isManual = item.rateSource === "manual";
  const manualHourly = isManual ? item.machineHourlyRate : 0;
  const manualSetup =
    isManual && item.machineSetupRate > 0 && item.machineSetupRate !== item.machineHourlyRate
      ? item.machineSetupRate
      : null;
  return makePart({
    partName: item.partName,
    drawingNumber: item.drawingNumber || "",
    revision: item.revision || "",
    qty: item.quantity,
    material: item.material || "",
    processType: item.processType || "Milling",
    machineId: isManual ? null : (item.machineId ?? null),
    rateSource: isManual ? "manual" : "machine",
    manualHourlyRate: manualHourly,
    manualSetupRate: manualSetup,
    setupHours: item.setupHours,
    machiningMins: item.machiningMinutesPerPart,
    materialCost: item.materialCostPerUnit,
    toolingAllowance: item.toolingAllowance,
    notes: "",
    _original: item,
  });
}

function addonFromLineItem(item: QuoteLineItem): QuoteAddon {
  const qty = item.quantity > 0 ? item.quantity : 1;
  return {
    key: nextAddonKey(),
    type: (item.lineItemType === "product" ? "product" : "extra") as "extra" | "product",
    id: 0,
    name: item.partName,
    category: "",
    unit: "ea",
    unitSellPrice: qty > 0 ? item.outsideProcessing / qty : item.outsideProcessing,
    qty,
    notes: "",
  };
}

// ── PartCard ──────────────────────────────────────────────────────────────────

interface PartCardProps {
  part: PartEntry;
  index: number;
  total: number;
  result: CalcResult;
  machines: MachineRow[];
  defaultHourlyRate: number;
  isPack: boolean;
  onUpdate: (patch: Partial<PartEntry>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function PartCard({
  part,
  index,
  total,
  result,
  machines,
  defaultHourlyRate,
  isPack,
  onUpdate,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PartCardProps) {
  const [showNotes, setShowNotes] = useState(!!part.notes);

  const activeMachines = machines.filter((m) => m.active);

  return (
    <div
      className="rounded border overflow-hidden"
      style={{
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--card-border))",
      }}
    >
      {/* ── Card header ── */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background: "hsl(var(--muted)/0.45)",
          borderBottom: part.collapsed ? "none" : "1px solid hsl(var(--border))",
        }}
      >
        {isPack && (
          <span
            className="text-[10px] font-bold shrink-0 tabular-nums"
            style={{ color: "hsl(213 97% 58%)" }}
          >
            P{index + 1}
          </span>
        )}
        <span className="text-sm font-medium truncate flex-1 min-w-0">
          {part.partName || (
            <span className="italic text-muted-foreground">
              {isPack ? `Part ${index + 1}` : "New part"}
            </span>
          )}
        </span>

        {result.sellPrice > 0 && (
          <span
            className="text-sm font-mono font-bold shrink-0"
            style={{ color: "hsl(213 97% 58%)" }}
          >
            {CUR}{result.sellPrice.toFixed(2)}
          </span>
        )}

        <div className="flex items-center gap-0 shrink-0">
          {isPack && (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveUp} disabled={index === 0} title="Move up">
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveDown} disabled={index === total - 1} title="Move down">
                <ChevronDown className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDuplicate} title="Duplicate">
                <Copy className="w-3 h-3" />
              </Button>
              {total > 1 && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onRemove} title="Remove">
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdate({ collapsed: !part.collapsed })} title={part.collapsed ? "Expand" : "Collapse"}>
            {part.collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* ── Card body ── */}
      {!part.collapsed && (
        <div className="p-3 space-y-2">
          {/* Row 1: Part Name | Qty */}
          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 72px" }}>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Part Name {isPack && <span className="text-destructive">*</span>}</Label>
              <Input
                value={part.partName}
                onChange={(e) => onUpdate({ partName: e.target.value })}
                placeholder="e.g. Bracket A"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Qty</Label>
              <Input
                type="number"
                min="1"
                value={part.qty}
                onChange={(e) => onUpdate({ qty: Math.max(1, Number(e.target.value)) })}
                className="h-8 text-sm text-center"
              />
            </div>
          </div>

          {/* Row 2: Drawing | Rev | Process */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Drawing No.</Label>
              <Input
                value={part.drawingNumber}
                onChange={(e) => onUpdate({ drawingNumber: e.target.value })}
                placeholder="ABC-001"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Rev</Label>
              <Input
                value={part.revision}
                onChange={(e) => onUpdate({ revision: e.target.value })}
                placeholder="A"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Process</Label>
              <Select value={part.processType} onValueChange={(v) => onUpdate({ processType: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROCESSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Material */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Material</Label>
            <MaterialCombobox
              value={part.material}
              onChange={(val, costPerKg) => {
                onUpdate({
                  material: val,
                  ...(costPerKg !== undefined ? { materialCost: costPerKg } : {}),
                });
              }}
            />
          </div>

          {/* Row 3b: Rate source — Select Machine (default) vs Manual Rate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Rate</Label>
              <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => onUpdate({ rateSource: "machine" })}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    part.rateSource === "machine"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Select Machine
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate({ rateSource: "manual" })}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    part.rateSource === "manual"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Manual Rate
                </button>
              </div>
            </div>

            {part.rateSource === "machine" ? (
              <Select
                value={part.machineId != null ? String(part.machineId) : "0"}
                onValueChange={(v) => onUpdate({ machineId: v === "0" ? null : Number(v) })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    Default ({CUR}{defaultHourlyRate.toFixed(0)}/hr)
                  </SelectItem>
                  {activeMachines.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} ({CUR}{parseFloat(String(m.hourlyRate)).toFixed(0)}/hr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Hourly rate ({CUR}/hr)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={part.manualHourlyRate || ""}
                    onChange={(e) => onUpdate({ manualHourlyRate: Number(e.target.value) })}
                    placeholder="e.g. 65"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Setup rate ({CUR}/hr, optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={part.manualSetupRate ?? ""}
                    onChange={(e) =>
                      onUpdate({
                        manualSetupRate: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="= hourly"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}

            {part.rateSource === "manual" &&
            (!part.manualHourlyRate || part.manualHourlyRate <= 0) ? (
              <p className="text-[11px] text-destructive">
                Hourly rate required for manual rate quote.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Select a machine or enter a manual hourly rate.
              </p>
            )}
          </div>

          {/* Row 4: Setup | Machining | Mat Cost | Tooling */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Setup (hrs)</Label>
              <Input
                type="number"
                min="0"
                step="0.25"
                value={part.setupHours}
                onChange={(e) => onUpdate({ setupHours: Number(e.target.value) })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Run (mins)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={part.machiningMins}
                onChange={(e) => onUpdate({ machiningMins: Number(e.target.value) })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Mat. {CUR}/unit</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={part.materialCost}
                onChange={(e) => onUpdate({ materialCost: Number(e.target.value) })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Tooling {CUR}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={part.toolingAllowance}
                onChange={(e) => onUpdate({ toolingAllowance: Number(e.target.value) })}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Notes toggle + field */}
          {showNotes ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Notes</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setShowNotes(false); onUpdate({ notes: "" }); }}
                >
                  Clear &amp; hide
                </button>
              </div>
              <Textarea
                rows={2}
                placeholder="Specific requirements, tolerances, finish…"
                value={part.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                className="resize-none text-sm"
              />
            </div>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowNotes(true)}
            >
              <StickyNote className="w-3 h-3" />
              Add notes
            </button>
          )}

          {/* Part subtotal */}
          <div
            className="flex justify-between items-baseline pt-2 border-t text-xs"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <span className="text-muted-foreground">
              {part.qty > 1 && result.pricePerPart > 0
                ? `${CUR}${result.pricePerPart.toFixed(2)} × ${part.qty}`
                : "Subtotal"}
            </span>
            <span
              className="font-mono font-semibold text-sm"
              style={{ color: result.sellPrice > 0 ? "hsl(213 97% 58%)" : "hsl(var(--muted-foreground))" }}
            >
              {CUR}{result.sellPrice.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary panel ─────────────────────────────────────────────────────────────

interface SummaryPanelProps {
  isPack: boolean;
  parts: PartEntry[];
  partResults: CalcResult[];
  addons: QuoteAddon[];
  addonsTotal: number;
  grandTotal: number;
  deliveryCost: number;
  includeDeliveryInTotal: boolean;
  margin: number;
  leadTime: string;
  deliveryMethod: string;
  machines: MachineRow[];
  defaultHourlyRate: number;
  defaultSetupRate: number;
  hasDraft: boolean;
  canView: boolean;
  onView: () => void;
  onGeneratePdf: () => void;
}

function SummaryPanel({
  isPack,
  parts,
  partResults,
  addons,
  addonsTotal,
  grandTotal,
  deliveryCost,
  includeDeliveryInTotal,
  margin,
  leadTime,
  deliveryMethod,
  machines,
  defaultHourlyRate,
  defaultSetupRate,
  hasDraft,
  canView,
  onView,
  onGeneratePdf,
}: SummaryPanelProps) {
  const singleResult = partResults[0];
  const singlePart = !isPack ? parts[0] : undefined;
  const isManual = singlePart?.rateSource === "manual";
  const selectedMachine =
    !isPack && !isManual ? machines.find((m) => m.id === parts[0]?.machineId) : null;
  const hrDisplay = isManual
    ? singlePart?.manualHourlyRate || 0
    : selectedMachine
      ? parseFloat(String(selectedMachine.hourlyRate))
      : defaultHourlyRate;
  const srDisplay = isManual
    ? singlePart?.manualSetupRate != null && singlePart.manualSetupRate > 0
      ? singlePart.manualSetupRate
      : singlePart?.manualHourlyRate || 0
    : selectedMachine
      ? parseFloat(String(selectedMachine.setupRate))
      : defaultSetupRate;

  const singleTotal =
    singleResult.sellPrice +
    addonsTotal +
    (includeDeliveryInTotal && deliveryCost > 0 ? deliveryCost : 0);

  return (
    <div className="flex flex-col">
      {/* Header label */}
      <div
        className="text-[10px] font-bold uppercase tracking-widest mb-3"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {isPack ? "Pack Summary" : "Live Result"}
      </div>

      {/* Hero total */}
      <div
        className="text-center py-3 border-b mb-3"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        {!isPack && (
          <div className="text-[10px] mb-0.5 text-muted-foreground">Price per part</div>
        )}
        <div
          className="text-3xl font-bold tabular-nums"
          style={{ color: "hsl(213 97% 58%)" }}
        >
          {CUR}{isPack ? grandTotal.toFixed(2) : singleResult.pricePerPart.toFixed(2)}
        </div>
        {!isPack && (
          <div className="text-xs mt-0.5 text-muted-foreground">
            Total: {CUR}{singleTotal.toFixed(2)}
            {includeDeliveryInTotal && deliveryCost > 0 && (
              <span className="ml-1 opacity-70">(incl. delivery)</span>
            )}
          </div>
        )}
        {isPack && (
          <div className="text-xs mt-0.5 text-muted-foreground">
            {parts.length} part{parts.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="space-y-1.5 text-xs">
        {isPack ? (
          /* Pack: per-part rows */
          parts.map((part, idx) => (
            <div key={part.key} className="flex justify-between gap-1">
              <span className="truncate text-muted-foreground">
                <span className="font-medium text-foreground">
                  {part.partName || `Part ${idx + 1}`}
                </span>
                {part.qty > 1 && <span className="ml-1 opacity-70">×{part.qty}</span>}
              </span>
              <span className="font-mono shrink-0">
                {CUR}{partResults[idx].sellPrice.toFixed(2)}
              </span>
            </div>
          ))
        ) : (
          /* Single: cost breakdown */
          <>
            {(
              [
                ["Setup", singleResult.setupCost],
                ["Machining", singleResult.machiningCost],
                ["Material", singleResult.materialTotal],
                ["Tooling", singleResult.directCost - singleResult.setupCost - singleResult.machiningCost - singleResult.materialTotal],
              ] as [string, number][]
            ).map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono">{CUR}{val.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 border-t" style={{ borderColor: "hsl(var(--border))" }}>
              <span className="text-muted-foreground">Direct cost</span>
              <span className="font-mono">{CUR}{singleResult.directCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margin</span>
              <span className="font-mono">{margin}%</span>
            </div>
          </>
        )}

        {/* Shared: extras + delivery totals */}
        {addons.length > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Extras &amp; Products</span>
            <span className="font-mono">{CUR}{addonsTotal.toFixed(2)}</span>
          </div>
        )}
        {deliveryCost > 0 && includeDeliveryInTotal && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-mono">{CUR}{deliveryCost.toFixed(2)}</span>
          </div>
        )}

        {/* Grand total row */}
        <div
          className="flex justify-between pt-1.5 border-t font-semibold"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <span>{isPack ? "Grand Total" : "Total"}</span>
          <span className="font-mono">{CUR}{(isPack ? grandTotal : singleTotal).toFixed(2)}</span>
        </div>

        {/* Rates / meta (single part) */}
        {!isPack && (
          <div
            className="pt-1.5 space-y-0.5"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <div>{CUR}{hrDisplay.toFixed(0)}/hr · setup {CUR}{srDisplay.toFixed(0)}/hr</div>
            {isManual ? (
              <div style={{ color: "hsl(213 97% 58%)" }}>Manual rate</div>
            ) : (
              selectedMachine && (
                <div style={{ color: "hsl(213 97% 58%)" }}>{selectedMachine.name}</div>
              )
            )}
            {leadTime && <div>Lead time: {leadTime}</div>}
            {deliveryMethod && <div>Delivery: {deliveryMethod}</div>}
          </div>
        )}
        {isPack && leadTime && (
          <div className="text-muted-foreground pt-0.5">Lead time: {leadTime}</div>
        )}
        {isPack && deliveryMethod && (
          <div className="text-muted-foreground">Delivery: {deliveryMethod}</div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 space-y-2 shrink-0">
        <Button
          className="w-full h-10 font-semibold gap-2"
          onClick={onView}
          disabled={!canView}
        >
          <Eye className="w-4 h-4" />
          View Quote
        </Button>
        <Button
          variant="outline"
          className="w-full h-9 gap-1 text-sm"
          onClick={onGeneratePdf}
          disabled={!canView}
        >
          <FileDown className="w-3.5 h-3.5" /> Generate PDF
        </Button>
        {!hasDraft && (
          <p className="text-xs text-center text-muted-foreground">
            Select a customer to start the quote — it then saves automatically.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Addons section ────────────────────────────────────────────────────────────

function AddonsSection({
  addons,
  setAddons,
  addonSearch,
  setAddonSearch,
  showAddonPicker,
  setShowAddonPicker,
  filteredExtras,
  filteredProducts,
}: {
  addons: QuoteAddon[];
  setAddons: React.Dispatch<React.SetStateAction<QuoteAddon[]>>;
  addonSearch: string;
  setAddonSearch: (v: string) => void;
  showAddonPicker: boolean;
  setShowAddonPicker: (v: boolean) => void;
  filteredExtras: ChargeableExtra[];
  filteredProducts: StandardProduct[];
}) {
  const cardStyle = {
    background: "hsl(var(--card))",
    borderColor: "hsl(var(--card-border))",
  };

  return (
    <div className="rounded border p-4 space-y-3" style={cardStyle}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Extras &amp; Products
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddonPicker(!showAddonPicker)}>
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>

      {showAddonPicker && (
        <div className="rounded border p-3 space-y-2" style={{ background: "hsl(var(--muted)/0.3)", borderColor: "hsl(var(--border))" }}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-sm" placeholder="Search extras and products…" value={addonSearch} onChange={(e) => setAddonSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredExtras.length === 0 && filteredProducts.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-3">No items found</div>
            )}
            {filteredExtras.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-1 py-1">
                  <PlusCircle className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Chargeable Extras</span>
                </div>
                {filteredExtras.map((extra) => (
                  <button key={`extra-${extra.id}`} type="button"
                    className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded text-sm hover:bg-primary/10 transition-colors"
                    onClick={() => {
                      setAddons((prev) => [...prev, { key: nextAddonKey(), type: "extra", id: extra.id, name: extra.extraName, category: extra.category, unit: extra.unit, unitSellPrice: extra.defaultSellPrice, qty: 1, notes: extra.notes }]);
                      setAddonSearch(""); setShowAddonPicker(false);
                    }}>
                    <div>
                      <div className="font-medium">{extra.extraName}</div>
                      {extra.category && <div className="text-xs text-muted-foreground">{extra.category}</div>}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground ml-4 shrink-0">{CUR}{extra.defaultSellPrice.toFixed(2)} /{extra.unit}</div>
                  </button>
                ))}
              </>
            )}
            {filteredProducts.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-1 py-1 mt-1">
                  <Package className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Standard Products</span>
                </div>
                {filteredProducts.map((product) => (
                  <button key={`product-${product.id}`} type="button"
                    className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded text-sm hover:bg-primary/10 transition-colors"
                    onClick={() => {
                      setAddons((prev) => [...prev, { key: nextAddonKey(), type: "product", id: product.id, name: product.productName, category: product.category, unit: product.unit, unitSellPrice: product.defaultSellPrice, qty: 1, notes: product.notes }]);
                      setAddonSearch(""); setShowAddonPicker(false);
                    }}>
                    <div>
                      <div className="font-medium">{product.productName}</div>
                      <div className="text-xs text-muted-foreground">{[product.category, product.material, product.standardSize].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground ml-4 shrink-0">{CUR}{product.defaultSellPrice.toFixed(2)} /{product.unit}</div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {addons.length === 0 && !showAddonPicker && (
        <p className="text-sm text-muted-foreground">No extras added. Click <span className="font-medium">Add</span> to pick from your library.</p>
      )}

      {addons.length > 0 && (
        <div className="space-y-1.5">
          {addons.map((addon) => (
            <div key={addon.key} className="flex items-center gap-2 rounded border p-2" style={{ borderColor: "hsl(var(--border))" }}>
              {addon.type === "extra" ? <PlusCircle className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> : <Package className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{addon.name}</div>
                <div className="text-xs text-muted-foreground">{CUR}{addon.unitSellPrice.toFixed(2)} /{addon.unit}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input type="number" min="1" value={addon.qty}
                  onChange={(e) => { const q = Math.max(1, Number(e.target.value)); setAddons((prev) => prev.map((a) => a.key === addon.key ? { ...a, qty: q } : a)); }}
                  className="w-14 h-7 text-sm text-center" />
                <div className="text-sm font-mono w-14 text-right">{CUR}{(addon.unitSellPrice * addon.qty).toFixed(2)}</div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setAddons((prev) => prev.filter((a) => a.key !== addon.key))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Save status pill ───────────────────────────────────────────────────────────

function SaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const map = {
    saving: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: "Saving…", color: "hsl(var(--muted-foreground))" },
    saved: { icon: <Check className="w-3 h-3" />, label: "Saved", color: "hsl(142 71% 45%)" },
    error: { icon: <AlertCircle className="w-3 h-3" />, label: "Save failed", color: "hsl(var(--destructive))" },
  } as const;
  const c = map[state];
  return (
    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: c.color }}>
      {c.icon}
      {c.label}
    </span>
  );
}

// ── Main builder ──────────────────────────────────────────────────────────────

interface QuoteBuilderProps {
  /** Persisted quote id once it exists (route id for edit, draft id for new). */
  quoteId?: number;
  /** Existing quote to hydrate from (edit, or "quote similar job" template). */
  initialQuote?: Quote;
  /** Called with the new draft id the moment it is auto-created. */
  onQuoteCreated?: (id: number) => void;
}

export function QuoteBuilder({ quoteId, initialQuote, onQuoteCreated }: QuoteBuilderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { save: saveDefaults, load: loadDefaults } = useWorkflowDefaults();
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();

  const { data: customers, isLoading: customersLoading } = useListCustomers();
  const { data: machines, isLoading: machinesLoading } = useListMachines();
  const { data: settings, isLoading: settingsLoading } = useGetSettings();

  // ── Shared state ───────────────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState(0);
  const [margin, setMargin] = useState(30);
  const [leadTime, setLeadTime] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [includeDeliveryInTotal, setIncludeDeliveryInTotal] = useState(true);
  const [addons, setAddons] = useState<QuoteAddon[]>([]);
  const [addonSearch, setAddonSearch] = useState("");
  const [showAddonPicker, setShowAddonPicker] = useState(false);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  const [parts, setParts] = useState<PartEntry[]>([makePart()]);

  // ── Draft / persistence state ───────────────────────────────────────────────
  const [createdId, setCreatedId] = useState<number | undefined>();
  const effectiveId = quoteId ?? createdId;
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [hydrated, setHydrated] = useState(false);
  const creatingRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);

  const isPack = parts.length > 1;

  // ── Extras/Products ────────────────────────────────────────────────────────
  const { data: extrasData = [] } = useQuery<ChargeableExtra[]>({
    queryKey: ["extras", true],
    queryFn: () => apiFetch<ChargeableExtra[]>("/extras?all=false"),
  });
  const { data: productsData = [] } = useQuery<StandardProduct[]>({
    queryKey: ["products", true],
    queryFn: () => apiFetch<StandardProduct[]>("/products?all=false"),
  });

  const addonSearchLower = addonSearch.toLowerCase();
  const filteredExtras = extrasData.filter((e) =>
    e.extraName.toLowerCase().includes(addonSearchLower) ||
    e.extraCode.toLowerCase().includes(addonSearchLower) ||
    e.category.toLowerCase().includes(addonSearchLower),
  );
  const filteredProducts = productsData.filter((p) =>
    p.productName.toLowerCase().includes(addonSearchLower) ||
    p.productCode.toLowerCase().includes(addonSearchLower) ||
    p.category.toLowerCase().includes(addonSearchLower),
  );

  // ── Hydrate from an existing quote (edit / quote-similar) ────────────────────
  useEffect(() => {
    if (!initialQuote || hydrated) return;
    setCustomerId(initialQuote.customerId);
    setLeadTime(initialQuote.leadTime || "");
    setDeliveryMethod(initialQuote.deliveryMethod || "");
    setDeliveryCost(Number(initialQuote.deliveryCost ?? 0));
    setIncludeDeliveryInTotal(initialQuote.includeDeliveryInTotal ?? true);

    const items = initialQuote.lineItems || [];
    const partItems = items.filter((it) => !ADDON_TYPES.has(it.lineItemType));
    const addonItems = items.filter((it) => ADDON_TYPES.has(it.lineItemType));
    if (partItems.length > 0) {
      setParts(partItems.map(partFromLineItem));
      setMargin(partItems[0].profitMarginPercentage);
    }
    setAddons(addonItems.map(addonFromLineItem));
    setDefaultsLoaded(true);
    setHydrated(true);
  }, [initialQuote, hydrated]);

  // ── Load workflow defaults (blank new quote only) ────────────────────────────
  useEffect(() => {
    if (initialQuote) return;
    if (settingsLoading || machinesLoading || defaultsLoaded) return;
    const d = loadDefaults();
    const machineExists = d.lastMachineId && machines?.find((m) => m.id === d.lastMachineId);
    setParts((prev) => prev.map((p) => ({
      ...p,
      ...(machineExists ? { machineId: d.lastMachineId! } : {}),
      ...(d.lastMaterial ? { material: d.lastMaterial } : {}),
    })));
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
  }, [initialQuote, settingsLoading, machinesLoading, machines, settings, defaultsLoaded, loadDefaults]);

  // ── Rates ──────────────────────────────────────────────────────────────────
  const defaultHourlyRate = parseFloat(String(settings?.defaultHourlyRate || 65));
  const defaultSetupRate = parseFloat(String(settings?.defaultSetupRate || 65));

  const getMachineRates = useCallback(
    (machineId: number | null) => {
      const m = (machines || []).find((m) => m.id === machineId);
      return {
        hourlyRate: m ? parseFloat(String(m.hourlyRate)) : defaultHourlyRate,
        setupRate: m ? parseFloat(String(m.setupRate)) : defaultSetupRate,
      };
    },
    [machines, defaultHourlyRate, defaultSetupRate],
  );

  const getPartRates = useCallback(
    (part: PartEntry) => {
      if (part.rateSource === "manual") {
        const hourlyRate = part.manualHourlyRate || 0;
        const setupRate =
          part.manualSetupRate != null && part.manualSetupRate > 0
            ? part.manualSetupRate
            : hourlyRate;
        return { hourlyRate, setupRate };
      }
      return getMachineRates(part.machineId);
    },
    [getMachineRates],
  );

  // ── Calculations ───────────────────────────────────────────────────────────
  const partResults = useMemo<CalcResult[]>(() => {
    return parts.map((part) => {
      const { hourlyRate, setupRate } = getPartRates(part);
      return calcResult(part.setupHours, part.machiningMins, part.qty, part.materialCost, part.toolingAllowance, margin, hourlyRate, setupRate);
    });
  }, [parts, getPartRates, margin]);

  const addonsTotal = useMemo(() => addons.reduce((s, a) => s + a.unitSellPrice * a.qty, 0), [addons]);
  const grandTotal = useMemo(
    () => partResults.reduce((sum, r) => sum + r.sellPrice, 0) + addonsTotal + (includeDeliveryInTotal && deliveryCost > 0 ? deliveryCost : 0),
    [partResults, addonsTotal, includeDeliveryInTotal, deliveryCost],
  );

  // ── Validation ─────────────────────────────────────────────────────────────
  const manualRateMissing = parts.some(
    (p) => p.rateSource === "manual" && (!p.manualHourlyRate || p.manualHourlyRate <= 0),
  );
  const partsValid =
    parts.every((p) => p.partName.trim().length > 0 && p.qty > 0) && !manualRateMissing;

  // ── Part helpers ───────────────────────────────────────────────────────────
  const updatePart = useCallback(
    (key: string, patch: Partial<PartEntry>) =>
      setParts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p))),
    [],
  );

  const addPart = () => {
    if (parts.length >= MAX_PARTS) return;
    const last = parts[parts.length - 1];
    setParts((prev) => [
      ...prev,
      makePart({
        machineId: last.machineId,
        material: last.material,
        processType: last.processType,
        rateSource: last.rateSource,
        manualHourlyRate: last.manualHourlyRate,
        manualSetupRate: last.manualSetupRate,
      }),
    ]);
  };

  const duplicatePart = (key: string) => {
    if (parts.length >= MAX_PARTS) return;
    const src = parts.find((p) => p.key === key);
    if (!src) return;
    const idx = parts.findIndex((p) => p.key === key);
    const copy = makePart({ ...src, key: nextPartKey(), partName: src.partName ? `${src.partName} (copy)` : "", collapsed: false, _original: undefined });
    setParts((prev) => { const next = [...prev]; next.splice(idx + 1, 0, copy); return next; });
  };

  const removePart = (key: string) => {
    if (parts.length === 1) return;
    setParts((prev) => prev.filter((p) => p.key !== key));
  };

  const movePart = (key: string, dir: -1 | 1) => {
    const idx = parts.findIndex((p) => p.key === key);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= parts.length) return;
    setParts((prev) => { const next = [...prev]; [next[idx], next[newIdx]] = [next[newIdx], next[idx]]; return next; });
  };

  // ── Payload builders ─────────────────────────────────────────────────────────
  const buildLineItems = useCallback(() => {
    return [
      ...parts.map((part) => {
        const adv = part._original;
        return {
          partName: part.partName,
          drawingNumber: part.drawingNumber,
          revision: part.revision,
          quantity: part.qty,
          material: part.material,
          processType: part.processType,
          machineId: part.rateSource === "manual" ? null : (part.machineId ?? null),
          rateSource: part.rateSource,
          manualHourlyRate: part.rateSource === "manual" ? part.manualHourlyRate : undefined,
          manualSetupRate:
            part.rateSource === "manual" && part.manualSetupRate != null && part.manualSetupRate > 0
              ? part.manualSetupRate
              : undefined,
          setupHours: part.setupHours,
          programmingHours: adv?.programmingHours ?? 0,
          machiningMinutesPerPart: part.machiningMins,
          inspectionHours: adv?.inspectionHours ?? 0,
          deburringMinutesPerPart: adv?.deburringMinutesPerPart ?? 0,
          materialCostPerUnit: part.materialCost,
          materialWastagePercentage: adv?.materialWastagePercentage ?? 0,
          toolingAllowance: part.toolingAllowance,
          outsideProcessing: adv?.outsideProcessing ?? 0,
          packaging: adv?.packaging ?? 0,
          delivery: adv?.delivery ?? 0,
          riskPercentage: adv?.riskPercentage ?? 0,
          profitMarginPercentage: margin,
          discountPercentage: adv?.discountPercentage ?? 0,
          vatEnabled: adv?.vatEnabled ?? settings?.vatEnabled ?? false,
          vatRate: adv?.vatRate ?? settings?.vatRate ?? 20,
          toleranceClass: adv?.toleranceClass,
          surfaceFinish: adv?.surfaceFinish,
          complexity: adv?.complexity,
          hiddenFromPdf: adv?.hiddenFromPdf,
          notes: part.notes,
        };
      }),
      ...addons.map((addon) => ({
        partName: addon.name,
        drawingNumber: "",
        revision: "",
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
    ];
  }, [parts, addons, margin, settings]);

  // Full header — only used on CREATE, where a fresh quote needs its dates/terms.
  const buildCreateData = useCallback(() => {
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + (settings?.quoteValidityDays || 30));
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
      priceBreakQtys: "",
      deliveryMethod,
      deliveryCost,
      includeDeliveryInTotal,
      materialCertIncluded: false,
      inspectionReportIncluded: false,
      fairIncluded: false,
      cmmReportIncluded: false,
      lineItems: partsValid ? buildLineItems() : [],
    };
  }, [customerId, leadTime, deliveryMethod, deliveryCost, includeDeliveryInTotal, settings, partsValid, buildLineItems]);

  // Minimal patch — ONLY the fields the builder owns. Never status, dates,
  // notes, or internalNotes (those belong to other surfaces / would be clobbered).
  const buildUpdateData = useCallback(() => {
    return {
      customerId,
      leadTime,
      deliveryMethod,
      deliveryCost,
      includeDeliveryInTotal,
      ...(partsValid ? { lineItems: buildLineItems() } : {}),
    };
  }, [customerId, leadTime, deliveryMethod, deliveryCost, includeDeliveryInTotal, partsValid, buildLineItems]);

  const updateSerialized = useMemo(() => JSON.stringify(buildUpdateData()), [buildUpdateData]);

  // ── Auto-create draft the moment a customer is chosen ────────────────────────
  useEffect(() => {
    if (effectiveId || creatingRef.current) return;
    if (customerId <= 0) return;
    if (!defaultsLoaded) return;
    creatingRef.current = true;
    setSaveState("saving");
    saveDefaults({ machineId: parts[0]?.machineId ?? undefined, material: parts[0]?.material, margin, leadTime });
    createQuote.mutate(
      { data: buildCreateData() as never },
      {
        onSuccess: (res) => {
          lastSavedRef.current = JSON.stringify(buildUpdateData());
          setCreatedId(res.id);
          onQuoteCreated?.(res.id);
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          setSaveState("saved");
        },
        onError: () => {
          creatingRef.current = false;
          setSaveState("error");
          toast({ title: "Failed to create draft quote", variant: "destructive" });
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, effectiveId, defaultsLoaded]);

  // ── Debounced auto-save ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!effectiveId) return;
    // In the edit flow, wait for hydration so the baseline reflects the loaded
    // quote (not the empty default state) — otherwise we'd write on open.
    if (initialQuote && !hydrated) return;
    if (lastSavedRef.current === null) {
      // First settle after hydrate/create — establish baseline without saving.
      lastSavedRef.current = updateSerialized;
      return;
    }
    if (updateSerialized === lastSavedRef.current) return;
    setSaveState("saving");
    const t = setTimeout(() => {
      updateQuote.mutate(
        { id: effectiveId, data: buildUpdateData() as never },
        {
          onSuccess: () => {
            lastSavedRef.current = updateSerialized;
            queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(effectiveId) });
            queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
            setSaveState("saved");
          },
          onError: () => setSaveState("error"),
        },
      );
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateSerialized, effectiveId]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (customersLoading || machinesLoading || settingsLoading) {
    return (
      <div className="p-5 space-y-4 w-full">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const machinesList = (machines || []) as MachineRow[];
  const cardStyle = { background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" };
  const canView = !!effectiveId;

  const handleView = () => { if (effectiveId) setLocation(`/quotes/${effectiveId}`); };
  const handleGeneratePdf = () => {
    if (!effectiveId) return;
    setLocation(`/quotes/${effectiveId}`);
    setTimeout(() => window.print(), 900);
  };

  // ── Render — single column ───────────────────────────────────────────────────
  return (
    <div className="w-full min-w-0 px-4 md:px-5 pt-4 pb-10 space-y-4">
      {/* Status row */}
      <div className="flex items-center justify-between min-h-5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Quote {isPack ? `· Pack (${parts.length})` : ""}
        </span>
        <SaveStatus state={saveState} />
      </div>

      {/* ── Quote Details bar ── */}
      <div className="rounded border p-4" style={cardStyle}>
        <div className="grid grid-cols-2 gap-3">
          {/* Customer */}
          <div className="col-span-2 space-y-1">
            <Label className="text-xs font-semibold text-foreground">Customer</Label>
            <Select value={customerId ? String(customerId) : ""} onValueChange={(v) => setCustomerId(Number(v))}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {(customers || []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Margin */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Margin (%)</Label>
            <Input type="number" min="0" max="99" step="1" value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="h-9" />
          </div>

          {/* Lead Time */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Lead Time</Label>
            <Select value={leadTime} onValueChange={setLeadTime}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Parts ── */}
      <div className="space-y-3">
        {parts.map((part, idx) => (
          <PartCard
            key={part.key}
            part={part}
            index={idx}
            total={parts.length}
            result={partResults[idx]}
            machines={machinesList}
            defaultHourlyRate={defaultHourlyRate}
            isPack={isPack}
            onUpdate={(patch) => updatePart(part.key, patch)}
            onDuplicate={() => duplicatePart(part.key)}
            onRemove={() => removePart(part.key)}
            onMoveUp={() => movePart(part.key, -1)}
            onMoveDown={() => movePart(part.key, 1)}
          />
        ))}
      </div>

      {/* ── Add Another Part ── */}
      {parts.length < MAX_PARTS && (
        <button
          type="button"
          onClick={addPart}
          className="w-full rounded-lg py-3 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Another Part
        </button>
      )}

      {/* ── Delivery ── */}
      <div className="rounded border p-4" style={cardStyle}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground uppercase tracking-widest">Delivery</Label>
            <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Method…" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Cost ({CUR})</Label>
            <Input type="number" min="0" step="0.01" value={deliveryCost} onChange={(e) => setDeliveryCost(Number(e.target.value))} className="h-9" />
          </div>
          <div className="flex items-center gap-3 h-9">
            <Switch checked={includeDeliveryInTotal} onCheckedChange={setIncludeDeliveryInTotal} />
            <span className="text-sm text-muted-foreground">Include in total</span>
          </div>
        </div>
      </div>

      {/* ── Extras & Products ── */}
      <AddonsSection
        addons={addons}
        setAddons={setAddons}
        addonSearch={addonSearch}
        setAddonSearch={setAddonSearch}
        showAddonPicker={showAddonPicker}
        setShowAddonPicker={setShowAddonPicker}
        filteredExtras={filteredExtras}
        filteredProducts={filteredProducts}
      />

      {/* ── Summary ── */}
      <div className="rounded border p-4" style={cardStyle}>
        <SummaryPanel
          isPack={isPack}
          parts={parts}
          partResults={partResults}
          addons={addons}
          addonsTotal={addonsTotal}
          grandTotal={grandTotal}
          deliveryCost={deliveryCost}
          includeDeliveryInTotal={includeDeliveryInTotal}
          margin={margin}
          leadTime={leadTime}
          deliveryMethod={deliveryMethod}
          machines={machinesList}
          defaultHourlyRate={defaultHourlyRate}
          defaultSetupRate={defaultSetupRate}
          hasDraft={canView}
          canView={canView}
          onView={handleView}
          onGeneratePdf={handleGeneratePdf}
        />
      </div>
    </div>
  );
}
