import { useState, useEffect, useMemo, useCallback } from "react";
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
  Copy,
  ChevronDown,
  ChevronUp,
  Layers,
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
  setupHours: number;
  machiningMins: number;
  materialCost: number;
  toolingAllowance: number;
  notes: string;
  collapsed: boolean;
}

interface CalcResult {
  setupCost: number;
  machiningCost: number;
  materialTotal: number;
  directCost: number;
  sellPrice: number;
  pricePerPart: number;
}

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

// ── Calculation ───────────────────────────────────────────────────────────────

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
    setupHours: 0,
    machiningMins: 0,
    materialCost: 0,
    toolingAllowance: 0,
    notes: "",
    collapsed: false,
    ...defaults,
  };
}

// ── Sub-component: Machine select ─────────────────────────────────────────────

function MachineSelect({
  machineId,
  machines,
  defaultHourlyRate,
  onChange,
}: {
  machineId: number | null;
  machines: { id: number; name: string; hourlyRate: string | number; active: boolean }[];
  defaultHourlyRate: number;
  onChange: (id: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Machine</Label>
      <Select
        value={machineId != null ? String(machineId) : "0"}
        onValueChange={(v) => onChange(v === "0" ? null : Number(v))}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Select machine..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">
            Default rates ({CUR}{defaultHourlyRate.toFixed(0)}/hr)
          </SelectItem>
          {machines
            .filter((m) => m.active)
            .map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.name} ({CUR}{parseFloat(String(m.hourlyRate)).toFixed(0)}/hr)
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Sub-component: Part card (pack mode) ──────────────────────────────────────

interface PartCardProps {
  part: PartEntry;
  index: number;
  total: number;
  result: CalcResult;
  machines: { id: number; name: string; hourlyRate: string | number; active: boolean }[];
  defaultHourlyRate: number;
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
  onUpdate,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PartCardProps) {
  return (
    <div
      className="rounded border overflow-hidden"
      style={{
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--card-border))",
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: "hsl(var(--muted)/0.4)",
          borderBottom: part.collapsed ? "none" : "1px solid hsl(var(--border))",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs font-bold shrink-0"
            style={{ color: "hsl(213 97% 58%)" }}
          >
            PART {index + 1}
          </span>
          {part.partName && (
            <span className="text-sm font-medium truncate">{part.partName}</span>
          )}
          {!part.partName && (
            <span className="text-sm text-muted-foreground italic">Untitled part</span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          {result.sellPrice > 0 && (
            <span
              className="text-sm font-mono font-bold mr-1"
              style={{ color: "hsl(213 97% 58%)" }}
            >
              {CUR}{result.sellPrice.toFixed(2)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDuplicate}
            title="Duplicate part"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          {total > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              title="Remove part"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdate({ collapsed: !part.collapsed })}
            title={part.collapsed ? "Expand" : "Collapse"}
          >
            {part.collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Card body */}
      {!part.collapsed && (
        <div className="p-4 space-y-3">
          {/* Row 1: Part Name + Qty */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Part Name *</Label>
              <Input
                value={part.partName}
                onChange={(e) => onUpdate({ partName: e.target.value })}
                placeholder="e.g. Bracket A"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Qty</Label>
              <Input
                type="number"
                min="1"
                value={part.qty}
                onChange={(e) => onUpdate({ qty: Math.max(1, Number(e.target.value)) })}
                className="h-10"
              />
            </div>
          </div>

          {/* Row 2: Drawing No + Revision + Process */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Drawing No.</Label>
              <Input
                value={part.drawingNumber}
                onChange={(e) => onUpdate({ drawingNumber: e.target.value })}
                placeholder="ABC-001"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rev</Label>
              <Input
                value={part.revision}
                onChange={(e) => onUpdate({ revision: e.target.value })}
                placeholder="A"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Process</Label>
              <Select
                value={part.processType}
                onValueChange={(v) => onUpdate({ processType: v })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCESSES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Material + Machine */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Material</Label>
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
            <MachineSelect
              machineId={part.machineId}
              machines={machines}
              defaultHourlyRate={defaultHourlyRate}
              onChange={(id) => onUpdate({ machineId: id })}
            />
          </div>

          {/* Row 4: Time + Cost fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Setup (hrs)</Label>
              <Input
                type="number"
                min="0"
                step="0.25"
                value={part.setupHours}
                onChange={(e) => onUpdate({ setupHours: Number(e.target.value) })}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Machining (mins)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={part.machiningMins}
                onChange={(e) => onUpdate({ machiningMins: Number(e.target.value) })}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Material ({CUR}/unit)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={part.materialCost}
                onChange={(e) => onUpdate({ materialCost: Number(e.target.value) })}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tooling ({CUR})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={part.toolingAllowance}
                onChange={(e) => onUpdate({ toolingAllowance: Number(e.target.value) })}
                className="h-10"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>
              Notes{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              rows={2}
              placeholder="Specific requirements, tolerances, finish…"
              value={part.notes}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              className="resize-none text-sm"
            />
          </div>

          {/* Part subtotal */}
          <div
            className="flex justify-between items-center pt-2.5 border-t text-sm"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <span className="text-muted-foreground">
              Part subtotal · {part.qty}×{" "}
              {result.pricePerPart > 0 && (
                <span className="text-foreground font-mono">
                  {CUR}{result.pricePerPart.toFixed(2)} each
                </span>
              )}
            </span>
            <span
              className="font-mono font-bold text-base"
              style={{ color: "hsl(213 97% 58%)" }}
            >
              {CUR}{result.sellPrice.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component: Pack summary panel ─────────────────────────────────────────

function PackSummaryPanel({
  parts,
  partResults,
  addons,
  addonsTotal,
  grandTotal,
  deliveryCost,
  includeDeliveryInTotal,
}: {
  parts: PartEntry[];
  partResults: CalcResult[];
  addons: QuoteAddon[];
  addonsTotal: number;
  grandTotal: number;
  deliveryCost: number;
  includeDeliveryInTotal: boolean;
}) {
  return (
    <>
      <div
        className="text-xs font-semibold uppercase tracking-widest mb-4"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        Pack Summary
      </div>

      {/* Grand total hero */}
      <div
        className="text-center py-4 border-b mb-4"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Grand Total
        </div>
        <div
          className="text-4xl font-bold tabular-nums"
          style={{ color: "hsl(213 97% 58%)" }}
        >
          {CUR}{grandTotal.toFixed(2)}
        </div>
        <div className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          {parts.length} part{parts.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Per-part rows */}
      <div className="space-y-2 text-sm">
        {parts.map((part, idx) => (
          <div key={part.key} className="flex justify-between gap-2">
            <span className="truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
              <span className="font-medium" style={{ color: "hsl(var(--foreground))" }}>
                {part.partName || `Part ${idx + 1}`}
              </span>
              {part.qty > 1 && (
                <span className="text-xs ml-1">×{part.qty}</span>
              )}
            </span>
            <span className="font-mono shrink-0">
              {CUR}{partResults[idx].sellPrice.toFixed(2)}
            </span>
          </div>
        ))}

        {addons.length > 0 && (
          <div className="flex justify-between">
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Extras &amp; Products</span>
            <span className="font-mono">{CUR}{addonsTotal.toFixed(2)}</span>
          </div>
        )}

        {deliveryCost > 0 && includeDeliveryInTotal && (
          <div className="flex justify-between">
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Delivery</span>
            <span className="font-mono">{CUR}{deliveryCost.toFixed(2)}</span>
          </div>
        )}

        <div
          className="flex justify-between border-t pt-2 mt-1 font-semibold"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <span>Grand Total</span>
          <span className="font-mono">{CUR}{grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </>
  );
}

// ── Sub-component: Single-part result panel ───────────────────────────────────

function SinglePartResultPanel({
  result,
  addons,
  addonsTotal,
  deliveryCost,
  includeDeliveryInTotal,
  margin,
  machines,
  machineId,
  defaultHourlyRate,
  defaultSetupRate,
  leadTime,
  deliveryMethod,
}: {
  result: CalcResult;
  addons: QuoteAddon[];
  addonsTotal: number;
  deliveryCost: number;
  includeDeliveryInTotal: boolean;
  margin: number;
  machines: { id: number; name: string; hourlyRate: string | number; setupRate: string | number }[];
  machineId: number | null;
  defaultHourlyRate: number;
  defaultSetupRate: number;
  leadTime: string;
  deliveryMethod: string;
}) {
  const selectedMachine = machines.find((m) => m.id === machineId);
  const hrDisplay = selectedMachine
    ? parseFloat(String(selectedMachine.hourlyRate))
    : defaultHourlyRate;
  const srDisplay = selectedMachine
    ? parseFloat(String(selectedMachine.setupRate))
    : defaultSetupRate;

  const total =
    result.sellPrice +
    addonsTotal +
    (includeDeliveryInTotal && deliveryCost > 0 ? deliveryCost : 0);

  return (
    <>
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
        <div className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Price per part
        </div>
        <div
          className="text-4xl font-bold tabular-nums"
          style={{ color: "hsl(213 97% 58%)" }}
        >
          {CUR}{result.pricePerPart.toFixed(2)}
        </div>
        <div className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Total: {CUR}{total.toFixed(2)}
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
            ["Tooling", result.directCost - result.setupCost - result.machiningCost - result.materialTotal],
          ] as [string, number][]
        ).map(([label, val]) => (
          <div key={label} className="flex justify-between">
            <span style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
            <span className="font-mono">{CUR}{val.toFixed(2)}</span>
          </div>
        ))}

        {addons.length > 0 && (
          <div className="flex justify-between">
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Extras &amp; Products</span>
            <span className="font-mono">{CUR}{addonsTotal.toFixed(2)}</span>
          </div>
        )}

        {deliveryCost > 0 && includeDeliveryInTotal && (
          <div className="flex justify-between">
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Delivery</span>
            <span className="font-mono">{CUR}{deliveryCost.toFixed(2)}</span>
          </div>
        )}

        <div
          className="flex justify-between border-t pt-2 mt-2"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <span style={{ color: "hsl(var(--muted-foreground))" }}>Direct cost</span>
          <span className="font-mono">{CUR}{result.directCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "hsl(var(--muted-foreground))" }}>Margin</span>
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
          {CUR}{hrDisplay.toFixed(0)}/hr machining · {CUR}{srDisplay.toFixed(0)}/hr setup
        </div>
        {selectedMachine && (
          <div style={{ color: "hsl(213 97% 58%)" }}>{selectedMachine.name}</div>
        )}
        {leadTime && <div>Lead time: {leadTime}</div>}
        {deliveryMethod && <div>Delivery: {deliveryMethod}</div>}
      </div>
    </>
  );
}

// ── Sub-component: Addons section ─────────────────────────────────────────────

interface AddonsSectionProps {
  addons: QuoteAddon[];
  setAddons: React.Dispatch<React.SetStateAction<QuoteAddon[]>>;
  addonSearch: string;
  setAddonSearch: (v: string) => void;
  showAddonPicker: boolean;
  setShowAddonPicker: (v: boolean) => void;
  filteredExtras: ChargeableExtra[];
  filteredProducts: StandardProduct[];
}

function AddonsSection({
  addons,
  setAddons,
  addonSearch,
  setAddonSearch,
  showAddonPicker,
  setShowAddonPicker,
  filteredExtras,
  filteredProducts,
}: AddonsSectionProps) {
  const cardStyle = {
    background: "hsl(var(--card))",
    borderColor: "hsl(var(--card-border))",
  };

  return (
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
          onClick={() => setShowAddonPicker(!showAddonPicker)}
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
            {filteredExtras.length === 0 && filteredProducts.length === 0 && (
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
                          key: nextAddonKey(),
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
                        <div className="text-xs text-muted-foreground">{extra.category}</div>
                      )}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground ml-4 shrink-0">
                      {CUR}{extra.defaultSellPrice.toFixed(2)} /{extra.unit}
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
                          key: nextAddonKey(),
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
                      {CUR}{product.defaultSellPrice.toFixed(2)} /{product.unit}
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
          <span className="font-medium">Add</span> to pick from your library.
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
                <div className="text-sm font-medium truncate">{addon.name}</div>
                <div className="text-xs text-muted-foreground">
                  {CUR}{addon.unitSellPrice.toFixed(2)} /{addon.unit}
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
                      prev.map((a) => (a.key === addon.key ? { ...a, qty: q } : a)),
                    );
                  }}
                  className="w-16 h-8 text-sm text-center"
                />
                <div className="text-sm font-mono text-right w-16">
                  {CUR}{(addon.unitSellPrice * addon.qty).toFixed(2)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    setAddons((prev) => prev.filter((a) => a.key !== addon.key))
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
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuickQuote() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { save: saveDefaults, load: loadDefaults } = useWorkflowDefaults();
  const createQuote = useCreateQuote();

  const { data: customers, isLoading: customersLoading } = useListCustomers();
  const { data: machines, isLoading: machinesLoading } = useListMachines();
  const { data: settings, isLoading: settingsLoading } = useGetSettings();

  // ── Shared quote-level state ───────────────────────────────────────────────
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

  // ── Parts ─────────────────────────────────────────────────────────────────
  const [parts, setParts] = useState<PartEntry[]>([makePart()]);
  const isPack = parts.length > 1;

  // ── Extras/Products data ───────────────────────────────────────────────────
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

  // ── Load defaults ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (settingsLoading || machinesLoading || defaultsLoaded) return;
    const d = loadDefaults();
    const machineExists = d.lastMachineId && machines?.find((m) => m.id === d.lastMachineId);
    setParts((prev) =>
      prev.map((p) => ({
        ...p,
        ...(machineExists ? { machineId: d.lastMachineId! } : {}),
        ...(d.lastMaterial ? { material: d.lastMaterial } : {}),
      })),
    );
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
  }, [settingsLoading, machinesLoading, machines, settings, defaultsLoaded, loadDefaults]);

  // ── Derived rates ──────────────────────────────────────────────────────────
  const defaultHourlyRate = parseFloat(String(settings?.defaultHourlyRate || 65));
  const defaultSetupRate = parseFloat(String(settings?.defaultSetupRate || 65));

  function getMachineRates(machineId: number | null) {
    const m = machines?.find((m) => m.id === machineId);
    return {
      hourlyRate: m ? parseFloat(String(m.hourlyRate)) : defaultHourlyRate,
      setupRate: m ? parseFloat(String(m.setupRate)) : defaultSetupRate,
    };
  }

  // ── Per-part calculations ──────────────────────────────────────────────────
  const partResults = useMemo<CalcResult[]>(() => {
    return parts.map((part) => {
      const { hourlyRate, setupRate } = getMachineRates(part.machineId);
      return calcResult(
        part.setupHours,
        part.machiningMins,
        part.qty,
        part.materialCost,
        part.toolingAllowance,
        margin,
        hourlyRate,
        setupRate,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts, machines, settings, margin]);

  const addonsTotal = useMemo(
    () => addons.reduce((s, a) => s + a.unitSellPrice * a.qty, 0),
    [addons],
  );

  const grandTotal = useMemo(
    () =>
      partResults.reduce((sum, r) => sum + r.sellPrice, 0) +
      addonsTotal +
      (includeDeliveryInTotal && deliveryCost > 0 ? deliveryCost : 0),
    [partResults, addonsTotal, includeDeliveryInTotal, deliveryCost],
  );

  // ── Validation ─────────────────────────────────────────────────────────────
  const canSubmit =
    customerId > 0 &&
    parts.every((p) => p.partName.trim().length > 0 && p.qty > 0);

  // ── Part mutation helpers ──────────────────────────────────────────────────
  const updatePart = useCallback(
    (key: string, patch: Partial<PartEntry>) =>
      setParts((prev) =>
        prev.map((p) => (p.key === key ? { ...p, ...patch } : p)),
      ),
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
      }),
    ]);
  };

  const duplicatePart = (key: string) => {
    if (parts.length >= MAX_PARTS) return;
    const src = parts.find((p) => p.key === key);
    if (!src) return;
    const idx = parts.findIndex((p) => p.key === key);
    const copy = makePart({
      ...src,
      partName: src.partName ? `${src.partName} (copy)` : "",
      collapsed: false,
    });
    setParts((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const removePart = (key: string) => {
    if (parts.length === 1) return;
    setParts((prev) => prev.filter((p) => p.key !== key));
  };

  const movePart = (key: string, dir: -1 | 1) => {
    const idx = parts.findIndex((p) => p.key === key);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= parts.length) return;
    setParts((prev) => {
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  // ── Build payload ──────────────────────────────────────────────────────────
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
        ...parts.map((part) => ({
          partName: part.partName,
          drawingNumber: part.drawingNumber,
          revision: part.revision,
          quantity: part.qty,
          material: part.material,
          processType: part.processType,
          machineId: part.machineId ?? null,
          setupHours: part.setupHours,
          programmingHours: 0,
          machiningMinutesPerPart: part.machiningMins,
          inspectionHours: 0,
          deburringMinutesPerPart: 0,
          materialCostPerUnit: part.materialCost,
          materialWastagePercentage: 0,
          toolingAllowance: part.toolingAllowance,
          outsideProcessing: 0,
          packaging: 0,
          delivery: 0,
          riskPercentage: 0,
          profitMarginPercentage: margin,
          discountPercentage: 0,
          vatEnabled: settings?.vatEnabled ?? false,
          vatRate: settings?.vatRate ?? 20,
          notes: part.notes,
        })),
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
      ],
    };
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const doSave = (onSuccess: (id: number) => void) => {
    if (!canSubmit) return;
    saveDefaults({
      machineId: parts[0].machineId ?? undefined,
      material: parts[0].material,
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

  // ── Loading state ──────────────────────────────────────────────────────────
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

  const machinesList = (machines || []) as {
    id: number;
    name: string;
    hourlyRate: string | number;
    setupRate: string | number;
    active: boolean;
  }[];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto pb-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/quotes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <Zap className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Quick Quote</h1>
        {isPack && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0"
            style={{
              background: "hsl(213 97% 58% / 0.12)",
              color: "hsl(213 97% 58%)",
              border: "1px solid hsl(213 97% 58% / 0.3)",
            }}
          >
            <Layers className="w-3 h-3" />
            PACK · {parts.length} parts
          </span>
        )}
        <span
          className="text-sm hidden md:block"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {isPack
            ? `Multi-part RFQ — ${parts.length} parts`
            : "Professional quote in under 90 seconds"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Quote Details (shared: customer + margin + lead time) */}
          <div className="rounded border p-5 space-y-4" style={cardStyle}>
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {isPack ? "Quote Details" : "Customer & Part"}
            </div>

            {/* Customer */}
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

            {/* Margin + Lead Time */}
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
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Single-part mode: inline part fields */}
            {!isPack && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Part Name</Label>
                    <Input
                      value={parts[0].partName}
                      onChange={(e) => updatePart(parts[0].key, { partName: e.target.value })}
                      placeholder="e.g. Bracket A"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={parts[0].qty}
                      onChange={(e) =>
                        updatePart(parts[0].key, { qty: Math.max(1, Number(e.target.value)) })
                      }
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Material</Label>
                    <MaterialCombobox
                      value={parts[0].material}
                      onChange={(val, costPerKg) => {
                        updatePart(parts[0].key, {
                          material: val,
                          ...(costPerKg !== undefined ? { materialCost: costPerKg } : {}),
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Process</Label>
                    <Select
                      value={parts[0].processType}
                      onValueChange={(v) => updatePart(parts[0].key, { processType: v })}
                    >
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROCESSES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <MachineSelect
                  machineId={parts[0].machineId}
                  machines={machinesList}
                  defaultHourlyRate={defaultHourlyRate}
                  onChange={(id) => updatePart(parts[0].key, { machineId: id })}
                />
              </>
            )}
          </div>

          {/* Single-part mode: Time & Costs */}
          {!isPack && (
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
                    value={parts[0].setupHours}
                    onChange={(e) => updatePart(parts[0].key, { setupHours: Number(e.target.value) })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Machining (mins/part)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={parts[0].machiningMins}
                    onChange={(e) => updatePart(parts[0].key, { machiningMins: Number(e.target.value) })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Material cost/unit ({CUR})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={parts[0].materialCost}
                    onChange={(e) => updatePart(parts[0].key, { materialCost: Number(e.target.value) })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tooling ({CUR})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={parts[0].toolingAllowance}
                    onChange={(e) => updatePart(parts[0].key, { toolingAllowance: Number(e.target.value) })}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pack mode: Part cards */}
          {isPack &&
            parts.map((part, idx) => (
              <PartCard
                key={part.key}
                part={part}
                index={idx}
                total={parts.length}
                result={partResults[idx]}
                machines={machinesList}
                defaultHourlyRate={defaultHourlyRate}
                onUpdate={(patch) => updatePart(part.key, patch)}
                onDuplicate={() => duplicatePart(part.key)}
                onRemove={() => removePart(part.key)}
                onMoveUp={() => movePart(part.key, -1)}
                onMoveDown={() => movePart(part.key, 1)}
              />
            ))}

          {/* Add Another Part button */}
          {parts.length < MAX_PARTS && (
            <button
              type="button"
              onClick={addPart}
              className="w-full rounded border-2 border-dashed p-3.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors hover:border-primary/60 hover:text-primary"
              style={{
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              <Plus className="w-4 h-4" />
              Add Another Part
            </button>
          )}

          {/* Delivery */}
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
                      <SelectItem key={m} value={m}>{m}</SelectItem>
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
                    <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {includeDeliveryInTotal ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Extras & Products */}
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
        </div>

        {/* ── Right panel ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div
            className="rounded border p-5 lg:sticky lg:top-4"
            style={{
              background: "hsl(var(--card))",
              borderColor: "hsl(213 97% 58% / 0.35)",
            }}
          >
            {isPack ? (
              <PackSummaryPanel
                parts={parts}
                partResults={partResults}
                addons={addons}
                addonsTotal={addonsTotal}
                grandTotal={grandTotal}
                deliveryCost={deliveryCost}
                includeDeliveryInTotal={includeDeliveryInTotal}
              />
            ) : (
              <SinglePartResultPanel
                result={partResults[0]}
                addons={addons}
                addonsTotal={addonsTotal}
                deliveryCost={deliveryCost}
                includeDeliveryInTotal={includeDeliveryInTotal}
                margin={margin}
                machines={machinesList}
                machineId={parts[0].machineId}
                defaultHourlyRate={defaultHourlyRate}
                defaultSetupRate={defaultSetupRate}
                leadTime={leadTime}
                deliveryMethod={deliveryMethod}
              />
            )}

            {/* Action buttons */}
            <div className="mt-5 space-y-2">
              <Button
                className="w-full h-12 font-semibold gap-2"
                onClick={handleSaveDraft}
                disabled={!canSubmit || createQuote.isPending}
              >
                <Save className="w-4 h-4" />
                {createQuote.isPending
                  ? "Saving..."
                  : isPack
                  ? "Save Pack as Draft"
                  : "Save Draft"}
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
                  <ArrowRight className="w-4 h-4" />{" "}
                  {isPack ? "Convert to Full" : "Full Quote"}
                </Button>
              </div>
              {!canSubmit && (
                <p
                  className="text-xs text-center pt-1"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {customerId === 0
                    ? "Select a customer to save."
                    : "All parts need a name to save."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
