import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  useScanContext,
  type DrawingScanResult,
} from "@/contexts/scan-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListCustomers,
  useListMachines,
  useGetSettings,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
  Save,
  AlertTriangle,
  Zap,
  ScanLine,
  X,
  ChevronDown,
} from "lucide-react";
import { Link } from "wouter";
import { QUOTE_TEMPLATES, QuoteTemplate } from "./quote-templates";
import { MaterialCombobox } from "./MaterialCombobox";

/* ── Schema ──────────────────────────────────────────────────── */
const lineItemSchema = z.object({
  partName: z.string().min(1, "Part name is required"),
  drawingNumber: z.string().optional(),
  revision: z.string().optional(),
  quantity: z.coerce.number().min(1),
  material: z.string().optional(),
  processType: z.string().optional(),
  machineId: z.coerce.number().optional().nullable(),
  toleranceClass: z.string().optional(),
  surfaceFinish: z.string().optional(),
  complexity: z.string().optional(),
  lineItemType: z.string().default("standard"),
  hiddenFromPdf: z.boolean().default(false),
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
  specialPackagingIncluded: z.boolean().default(false),
  priceBreakQtys: z.string().default(""),
  deliveryMethod: z.string().optional(),
  deliveryCost: z.coerce.number().default(0),
  includeDeliveryInTotal: z.boolean().default(true),
  rfqReceivedDate: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
  nextAction: z.string().optional(),
  lastContactedDate: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one part is required"),
});

export type QuoteFormValues = z.infer<typeof quoteSchema>;

/* ── Price Break Rows ─────────────────────────────────────────── */
export type PriceBreakRow = {
  qty: number;
  manual: boolean;
  priceEach?: number;
  total?: number;
  notes?: string;
};

function parsePriceBreakRows(raw: string): PriceBreakRow[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    if (typeof parsed[0] === "number") {
      return (parsed as number[]).map((qty) => ({ qty, manual: false }));
    }
    return parsed as PriceBreakRow[];
  } catch {
    return [];
  }
}

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
  "2 weeks",
  "3 weeks",
  "4 weeks",
  "6 weeks",
  "10 working days",
  "15 working days",
  "Ex-stock",
  "To be confirmed",
];
const DELIVERY_TERM_PRESETS = ["Ex Works", "Delivered", "Collection"];

const STEPS = [
  "Customer & Part",
  "Cost Build-Up",
  "Review & Output",
];

/* ── Health indicator ────────────────────────────────────────── */
function healthLabel(
  margin: number,
  risk: number,
  complexity: string,
): {
  color: string;
  bg: string;
  border: string;
  label: string;
  tip: string;
} {
  const effective = margin - risk * 0.3;
  if (effective >= 25)
    return {
      color: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      label: "Healthy",
      tip: "Margin looks solid for this job.",
    };
  if (effective >= 12)
    return {
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      label: "Caution",
      tip: "Margin is thin. Double-check assumptions.",
    };
  return {
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "At Risk",
    tip: "Risk of underquoting. Review costs carefully.",
  };
}

function HealthBadge({
  margin,
  risk,
  complexity,
}: {
  margin: number;
  risk: number;
  complexity?: string;
}) {
  const h = healthLabel(margin, risk, complexity ?? "Medium");
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${h.color} ${h.bg} ${h.border}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${h.label === "Healthy" ? "bg-green-500" : h.label === "Caution" ? "bg-amber-500" : "bg-red-500"}`}
      />
      {h.label}
    </span>
  );
}

/* ── Hidden cost prompt ──────────────────────────────────────── */
const COST_CHECKS = [
  {
    field: "deburringMinutesPerPart" as const,
    label: "Deburring time",
    note: "Small burrs add up on milled edges.",
  },
  {
    field: "inspectionHours" as const,
    label: "Inspection time",
    note: "Don't absorb this. Log it.",
  },
  {
    field: "materialWastagePercentage" as const,
    label: "Material wastage %",
    note: "Off-cuts and drops have real cost.",
  },
  {
    field: "packaging" as const,
    label: "Packaging",
    note: "Boxes, foam, tape. Someone pays.",
  },
  {
    field: "delivery" as const,
    label: "Delivery",
    note: "Courier or your time to the post office.",
  },
  {
    field: "toolingAllowance" as const,
    label: "Tooling wear",
    note: "Inserts, end mills, drills. All cost money.",
  },
  {
    field: "outsideProcessing" as const,
    label: "Subcontract / finishing",
    note: "Anodising, plating, heat treatment.",
  },
];

function CostCheckPanel({ item }: { item: any }) {
  const missed = COST_CHECKS.filter((c) => {
    const v = Number(item[c.field]);
    return v === 0 || isNaN(v);
  });
  if (missed.length === 0)
    return (
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
        {missed.map((c) => (
          <div
            key={c.field}
            className="text-xs text-amber-700 bg-amber-100/60 rounded px-2 py-1.5"
          >
            <span className="font-semibold">{c.label}</span>
            <span className="text-amber-600">: {c.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Template picker ─────────────────────────────────────────── */
function TemplatePicker({
  onSelect,
}: {
  onSelect: (t: QuoteTemplate) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">
            Quick Start: Apply a Template
          </CardTitle>
        </div>
        <CardDescription>
          Pick a job type to preload sensible defaults for step 3. You can
          adjust everything afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
          {QUOTE_TEMPLATES.map((t) => (
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
              <div
                className={`text-xs mt-0.5 ${selected === t.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              >
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
              const t = QUOTE_TEMPLATES.find((x) => x.id === selected)!;
              onSelect(t);
            }}
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Apply {QUOTE_TEMPLATES.find((x) => x.id === selected)?.label}{" "}
            defaults
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Drawing Scan Assist panel ───────────────────────────────── */
type SuggestionItem = {
  label: string;
  displayValue: string;
  fieldPath: string;
  numericValue?: number;
};

const CONFIDENCE_LABELS: Record<
  "low" | "medium" | "high",
  { label: string; bg: string; color: string; border: string }
> = {
  low: {
    label: "Low confidence",
    bg: "rgba(245,158,11,0.08)",
    color: "#92400E",
    border: "rgba(245,158,11,0.25)",
  },
  medium: {
    label: "Medium confidence",
    bg: "rgba(29,143,255,0.08)",
    color: "#1D4ED8",
    border: "rgba(29,143,255,0.2)",
  },
  high: {
    label: "High confidence",
    bg: "rgba(34,197,94,0.08)",
    color: "#166534",
    border: "rgba(34,197,94,0.2)",
  },
};

function buildSuggestions(
  scan: DrawingScanResult,
  idx: number,
): SuggestionItem[] {
  const items: SuggestionItem[] = [];
  if (scan.material)
    items.push({
      label: "Suggested material",
      displayValue: scan.material,
      fieldPath: `lineItems.${idx}.material`,
    });
  if (scan.drawingNumber)
    items.push({
      label: "Drawing number",
      displayValue: scan.drawingNumber,
      fieldPath: `lineItems.${idx}.drawingNumber`,
    });
  if (scan.revision)
    items.push({
      label: "Revision",
      displayValue: scan.revision,
      fieldPath: `lineItems.${idx}.revision`,
    });
  if (scan.quantity != null)
    items.push({
      label: "Suggested quantity",
      displayValue: String(scan.quantity),
      fieldPath: `lineItems.${idx}.quantity`,
      numericValue: scan.quantity,
    });
  if (scan.tolerances.length > 0)
    items.push({
      label: "Possible tight tolerance",
      displayValue: scan.tolerances[0],
      fieldPath: `lineItems.${idx}.toleranceClass`,
    });
  const finishValue =
    scan.finish ||
    (scan.coatings.length > 0 ? scan.coatings.join("; ") : undefined);
  if (finishValue)
    items.push({
      label: "Possible finish / coating",
      displayValue: finishValue,
      fieldPath: `lineItems.${idx}.surfaceFinish`,
    });
  return items;
}

function ScanAssistPanel({
  scan,
  activeIndex,
  onApply,
  onDismiss,
}: {
  scan: DrawingScanResult;
  activeIndex: number;
  onApply: (path: string, value: string | number) => void;
  onDismiss: () => void;
}) {
  const suggestions = buildSuggestions(scan, activeIndex);
  const [statuses, setStatuses] = useState<
    Record<number, "pending" | "accepted" | "ignored">
  >(() =>
    Object.fromEntries(suggestions.map((_, i) => [i, "pending" as const])),
  );

  if (scan.unreadable) {
    return (
      <div
        className="rounded border px-4 py-3 flex items-start gap-2.5"
        style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
      >
        <ScanLine
          className="w-4 h-4 mt-0.5 shrink-0"
          style={{ color: "#94A3B8" }}
        />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold" style={{ color: "#475569" }}>
            Drawing Scan Assist
          </span>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            Unable to detect drawing text. Please review manually.
          </p>
          <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
            If you uploaded a PDF, try uploading a screenshot, JPG, or PNG of
            the drawing instead.
          </p>
        </div>
        <button type="button" onClick={onDismiss} style={{ color: "#CBD5E1" }}>
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const lowConfidenceOnly =
    scan.materialConfidence === "low" && suggestions.length === 0;

  if (suggestions.length === 0 && !lowConfidenceOnly) return null;

  const pendingIndices = Object.entries(statuses)
    .filter(([, s]) => s === "pending")
    .map(([i]) => Number(i));
  const allActioned = pendingIndices.length === 0;

  const accept = (i: number, item: SuggestionItem) => {
    onApply(item.fieldPath, item.numericValue ?? item.displayValue);
    setStatuses((p) => ({ ...p, [i]: "accepted" }));
  };
  const ignore = (i: number) => setStatuses((p) => ({ ...p, [i]: "ignored" }));
  const applyAll = () => {
    const next = { ...statuses };
    pendingIndices.forEach((i) => {
      const item = suggestions[i];
      if (item) {
        onApply(item.fieldPath, item.numericValue ?? item.displayValue);
        next[i] = "accepted";
      }
    });
    setStatuses(next);
  };

  return (
    <div
      className="rounded border overflow-hidden"
      style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #F1F5F9" }}
      >
        <ScanLine
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: "#1D8FFF" }}
        />
        <span className="text-xs font-semibold" style={{ color: "#334155" }}>
          Drawing Scan Assist
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{
            background: "rgba(29,143,255,0.08)",
            color: "#1D8FFF",
            border: "1px solid rgba(29,143,255,0.15)",
          }}
        >
          Suggestions only
        </span>
        <div className="ml-auto flex items-center gap-2">
          {pendingIndices.length > 1 && (
            <button
              type="button"
              onClick={applyAll}
              className="text-xs font-semibold px-2.5 py-0.5 rounded transition-colors"
              style={{
                background: "rgba(29,143,255,0.1)",
                color: "#1D8FFF",
                border: "1px solid rgba(29,143,255,0.22)",
              }}
            >
              Apply all
            </button>
          )}
          {allActioned && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-medium"
              style={{ color: "#1D8FFF" }}
            >
              Dismiss
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            style={{ color: "#CBD5E1" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Low confidence material warning */}
      {scan.materialConfidence === "low" && (
        <div
          className="flex items-start gap-2 px-4 py-2.5"
          style={{
            background: "rgba(245,158,11,0.05)",
            borderBottom: "1px solid rgba(245,158,11,0.14)",
          }}
        >
          <AlertTriangle
            className="w-3.5 h-3.5 mt-0.5 shrink-0"
            style={{ color: "#D97706" }}
          />
          <span className="text-xs" style={{ color: "#92400E" }}>
            Material not confidently detected. Please review manually.
          </span>
        </div>
      )}

      {/* Suggestion rows */}
      {suggestions.length > 0 && (
        <div>
          {suggestions.map((item, i) => {
            const status = statuses[i] ?? "pending";
            const conf =
              item.label === "Suggested material" && scan.materialConfidence
                ? CONFIDENCE_LABELS[scan.materialConfidence]
                : null;
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2"
                style={{
                  borderBottom:
                    i < suggestions.length - 1
                      ? "1px solid #F1F5F9"
                      : undefined,
                  opacity: status !== "pending" ? 0.4 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                <span
                  className="text-xs shrink-0 w-36"
                  style={{ color: "#64748B" }}
                >
                  {item.label}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                  <span
                    className="text-xs font-medium truncate font-mono"
                    style={{ color: "#1E293B" }}
                  >
                    {item.displayValue}
                  </span>
                  {conf && (
                    <span
                      className="text-xs px-1.5 py-px rounded shrink-0"
                      style={{
                        background: conf.bg,
                        color: conf.color,
                        border: `1px solid ${conf.border}`,
                      }}
                    >
                      {conf.label}
                    </span>
                  )}
                </div>
                {status === "accepted" ? (
                  <span
                    className="text-xs flex items-center gap-1 shrink-0"
                    style={{ color: "#22C55E" }}
                  >
                    <Check className="w-3 h-3" /> Applied
                  </span>
                ) : status === "ignored" ? (
                  <span
                    className="text-xs shrink-0"
                    style={{ color: "#94A3B8" }}
                  >
                    Ignored
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => accept(i, item)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors"
                      style={{
                        background: "rgba(34,197,94,0.08)",
                        color: "#16A34A",
                        border: "1px solid rgba(34,197,94,0.2)",
                      }}
                    >
                      <Check className="w-3 h-3" />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => ignore(i)}
                      className="px-2 py-0.5 rounded text-xs font-semibold transition-colors"
                      style={{
                        background: "rgba(148,163,184,0.08)",
                        color: "#64748B",
                        border: "1px solid rgba(148,163,184,0.2)",
                      }}
                    >
                      Ignore
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tight tolerance summary — shown when multiple tolerances detected */}
      {scan.tolerances.length > 1 && (
        <div
          className="px-4 py-3"
          style={{
            borderTop: "1px solid #F1F5F9",
            background: "#FAFBFC",
          }}
        >
          <p
            className="text-xs font-semibold mb-2"
            style={{ color: "#475569" }}
          >
            Possible tight tolerances detected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {scan.tolerances.map((t, i) => (
              <span
                key={i}
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{
                  background: "rgba(29,143,255,0.06)",
                  color: "#334155",
                  border: "1px solid rgba(29,143,255,0.12)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary + quote risk */}
      {(scan.summary || scan.quoteRisk) && (
        <div
          className="px-4 py-3 flex items-start gap-3"
          style={{ borderTop: "1px solid #F1F5F9", background: "#FAFBFC" }}
        >
          {scan.quoteRisk && (
            <span
              className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
              style={{
                background:
                  scan.quoteRisk === "high"
                    ? "rgba(239,68,68,0.08)"
                    : scan.quoteRisk === "medium"
                      ? "rgba(245,158,11,0.08)"
                      : "rgba(34,197,94,0.08)",
                color:
                  scan.quoteRisk === "high"
                    ? "#B91C1C"
                    : scan.quoteRisk === "medium"
                      ? "#92400E"
                      : "#166534",
                border: `1px solid ${
                  scan.quoteRisk === "high"
                    ? "rgba(239,68,68,0.2)"
                    : scan.quoteRisk === "medium"
                      ? "rgba(245,158,11,0.2)"
                      : "rgba(34,197,94,0.2)"
                }`,
              }}
            >
              {scan.quoteRisk.charAt(0).toUpperCase() + scan.quoteRisk.slice(1)}{" "}
              risk
            </span>
          )}
          {scan.summary && (
            <p className="text-xs" style={{ color: "#475569" }}>
              {scan.summary}
            </p>
          )}
        </div>
      )}

      {/* Missing info warning */}
      {scan.missingInfo && scan.missingInfo.length > 0 && (
        <div
          className="px-4 py-3"
          style={{
            borderTop: "1px solid #F1F5F9",
            background: "rgba(245,158,11,0.03)",
          }}
        >
          <p
            className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"
            style={{ color: "#92400E" }}
          >
            <AlertTriangle className="w-3 h-3" />
            Possible missing information
          </p>
          <ul className="flex flex-col gap-1">
            {scan.missingInfo.map((item, i) => (
              <li key={i} className="text-xs" style={{ color: "#78350F" }}>
                · {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Read-only info: threads, heat treatment, critical dims */}
      {(scan.threads?.length > 0 ||
        scan.heatTreatment ||
        scan.criticalDimensions?.length > 0 ||
        scan.partName) && (
        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid #F1F5F9", background: "#FAFBFC" }}
        >
          <p
            className="text-xs font-semibold mb-2"
            style={{ color: "#475569" }}
          >
            Additional drawing information
          </p>
          <div className="flex flex-col gap-1.5">
            {scan.partName && (
              <div className="flex gap-2">
                <span
                  className="text-xs w-32 shrink-0"
                  style={{ color: "#94A3B8" }}
                >
                  Part name
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: "#334155" }}
                >
                  {scan.partName}
                </span>
              </div>
            )}
            {scan.heatTreatment && (
              <div className="flex gap-2">
                <span
                  className="text-xs w-32 shrink-0"
                  style={{ color: "#94A3B8" }}
                >
                  Heat treatment
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: "#334155" }}
                >
                  {scan.heatTreatment}
                </span>
              </div>
            )}
            {scan.threads && scan.threads.length > 0 && (
              <div className="flex gap-2">
                <span
                  className="text-xs w-32 shrink-0"
                  style={{ color: "#94A3B8" }}
                >
                  Threads
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: "#334155" }}
                >
                  {scan.threads.join(", ")}
                </span>
              </div>
            )}
            {scan.criticalDimensions && scan.criticalDimensions.length > 0 && (
              <div className="flex gap-2">
                <span
                  className="text-xs w-32 shrink-0"
                  style={{ color: "#94A3B8" }}
                >
                  Critical dims
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: "#334155" }}
                >
                  {scan.criticalDimensions.join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safety note */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ borderTop: "1px solid #F1F5F9", background: "#FAFBFC" }}
      >
        <AlertTriangle
          className="w-3 h-3 shrink-0"
          style={{ color: "#F59E0B" }}
        />
        <span className="text-xs" style={{ color: "#64748B" }}>
          Always check the drawing before sending a quote.
        </span>
      </div>
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────── */
interface QuoteWizardProps {
  initialValues?: Partial<Omit<QuoteFormValues, "rfqReceivedDate" | "followUpDate" | "followUpNotes" | "nextAction" | "lastContactedDate">> & {
    rfqReceivedDate?: string | null;
    followUpDate?: string | null;
    followUpNotes?: string | null;
    nextAction?: string | null;
    lastContactedDate?: string | null;
  };
  onSubmit: (values: QuoteFormValues) => void;
  isSubmitting?: boolean;
  savedQuoteId?: number;
  initialTemplate?: string;
}

/* ── Component ───────────────────────────────────────────────── */
export function QuoteWizard({
  initialValues,
  onSubmit,
  isSubmitting,
  savedQuoteId,
}: QuoteWizardProps) {
  const { scanResult } = useScanContext();
  const [scanDismissed, setScanDismissed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [templateApplied, setTemplateApplied] = useState(false);
  const [quoteMode, setQuoteMode] = useState<"basic" | "advanced">(() => {
    try {
      return (
        (localStorage.getItem("sq_quoteMode") as "basic" | "advanced") ||
        "basic"
      );
    } catch {
      return "basic";
    }
  });
  const handleQuoteMode = (m: "basic" | "advanced") => {
    setQuoteMode(m);
    try {
      localStorage.setItem("sq_quoteMode", m);
    } catch {}
  };
  const { data: customers, isLoading: isLoadingCustomers } = useListCustomers();
  const { data: machines, isLoading: isLoadingMachines } = useListMachines();
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();

  const isNewQuote = !initialValues?.customerId;

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerId: initialValues?.customerId || 0,
      status: initialValues?.status || "Draft",
      quoteDate:
        initialValues?.quoteDate || new Date().toISOString().split("T")[0],
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
      inspectionReportIncluded:
        initialValues?.inspectionReportIncluded || false,
      fairIncluded: initialValues?.fairIncluded || false,
      cmmReportIncluded: initialValues?.cmmReportIncluded || false,
      specialPackagingIncluded: initialValues?.specialPackagingIncluded || false,
      priceBreakQtys: initialValues?.priceBreakQtys || "",
      deliveryMethod: initialValues?.deliveryMethod || "",
      deliveryCost: parseFloat(String(initialValues?.deliveryCost || 0)),
      includeDeliveryInTotal: initialValues?.includeDeliveryInTotal ?? true,
      rfqReceivedDate: (initialValues as any)?.rfqReceivedDate || "",
      followUpDate: (initialValues as any)?.followUpDate || "",
      followUpNotes: (initialValues as any)?.followUpNotes || "",
      nextAction: (initialValues as any)?.nextAction || "",
      lastContactedDate: (initialValues as any)?.lastContactedDate || "",
      lineItems: initialValues?.lineItems?.length
        ? (initialValues.lineItems as any)
        : [
            {
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
            },
          ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });
  const [activeLineItemIndex, setActiveLineItemIndex] = useState(0);
  const [customQtyInput, setCustomQtyInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [customerDefaultsMsg, setCustomerDefaultsMsg] = useState<string | null>(null);
  const watchedCustomerId = form.watch("customerId");

  // Set defaults from settings once loaded
  useEffect(() => {
    if (settings && !initialValues?.quoteDate) {
      if (!form.getValues("validUntil")) {
        const d = new Date();
        d.setDate(d.getDate() + (settings.quoteValidityDays || 30));
        form.setValue("validUntil", d.toISOString().split("T")[0]);
      }
      if (!form.getValues("paymentTerms"))
        form.setValue("paymentTerms", settings.paymentTerms || "");
      if (!form.getValues("termsAndConditions"))
        form.setValue("termsAndConditions", settings.termsAndConditions || "");
      if (!form.getValues("leadTime"))
        form.setValue("leadTime", settings.defaultLeadTime || "");
      if (!form.getValues("deliveryTerms"))
        form.setValue("deliveryTerms", settings.defaultDeliveryTerms || "");
      const currentItems = form.getValues("lineItems");
      if (currentItems.length === 1 && !currentItems[0].partName) {
        form.setValue(
          "lineItems.0.profitMarginPercentage",
          settings.defaultMarginPercentage || 30,
        );
        form.setValue("lineItems.0.vatEnabled", settings.vatEnabled ?? false);
        form.setValue("lineItems.0.vatRate", settings.vatRate || 20);
      }
    }
  }, [settings, initialValues, form]);

  // Auto-populate from customer quality defaults when customer changes (new quotes only)
  useEffect(() => {
    if (!isNewQuote || !watchedCustomerId || !customers) return;
    const customer = customers.find((c) => c.id === watchedCustomerId);
    if (!customer) return;

    const applied: string[] = [];

    if (customer.defaultPaymentTerms && !form.getValues("paymentTerms")) {
      form.setValue("paymentTerms", customer.defaultPaymentTerms);
      applied.push("payment terms");
    }

    if (customer.typicalMarginPct != null) {
      const settingsMargin = settings?.defaultMarginPercentage ?? 30;
      const items = form.getValues("lineItems");
      const allAtDefault = items.every(
        (i) => i.profitMarginPercentage === 30 || i.profitMarginPercentage === settingsMargin,
      );
      if (allAtDefault) {
        items.forEach((_, idx) => {
          form.setValue(`lineItems.${idx}.profitMarginPercentage`, customer.typicalMarginPct!);
        });
        applied.push(`margin (${customer.typicalMarginPct}%)`);
      }
    }

    if (customer.materialCertRequired && !form.getValues("materialCertIncluded")) {
      form.setValue("materialCertIncluded", true);
      applied.push("material cert");
    }
    if (customer.inspectionReportRequired && !form.getValues("inspectionReportIncluded")) {
      form.setValue("inspectionReportIncluded", true);
      applied.push("inspection report");
    }
    if (customer.fairRequired && !form.getValues("fairIncluded")) {
      form.setValue("fairIncluded", true);
      applied.push("FAIR");
    }
    if (customer.cocRequired && !form.getValues("cmmReportIncluded")) {
      form.setValue("cmmReportIncluded", true);
      applied.push("CMM report (CoC)");
    }
    if (
      customer.specialPackagingRequired &&
      !form.getValues("specialPackagingIncluded")
    ) {
      form.setValue("specialPackagingIncluded", true);
      applied.push("special packaging");
    }

    if (applied.length > 0) {
      setCustomerDefaultsMsg(`Defaults applied from customer: ${applied.join(", ")}.`);
    } else {
      setCustomerDefaultsMsg(null);
    }
  }, [watchedCustomerId, customers, isNewQuote, settings, form]);

  const applyTemplate = (t: QuoteTemplate) => {
    const d = t.defaults;
    form.setValue(
      `lineItems.${activeLineItemIndex}.processType`,
      t.processType,
    );
    form.setValue(`lineItems.${activeLineItemIndex}.setupHours`, d.setupHours);
    form.setValue(
      `lineItems.${activeLineItemIndex}.programmingHours`,
      d.programmingHours,
    );
    form.setValue(
      `lineItems.${activeLineItemIndex}.machiningMinutesPerPart`,
      d.machiningMinutesPerPart,
    );
    form.setValue(
      `lineItems.${activeLineItemIndex}.inspectionHours`,
      d.inspectionHours,
    );
    form.setValue(
      `lineItems.${activeLineItemIndex}.deburringMinutesPerPart`,
      d.deburringMinutesPerPart,
    );
    form.setValue(
      `lineItems.${activeLineItemIndex}.materialWastagePercentage`,
      d.materialWastagePercentage,
    );
    form.setValue(
      `lineItems.${activeLineItemIndex}.toolingAllowance`,
      d.toolingAllowance,
    );
    form.setValue(
      `lineItems.${activeLineItemIndex}.outsideProcessing`,
      d.outsideProcessing,
    );
    form.setValue(`lineItems.${activeLineItemIndex}.packaging`, d.packaging);
    form.setValue(`lineItems.${activeLineItemIndex}.delivery`, d.delivery);
    form.setValue(
      `lineItems.${activeLineItemIndex}.riskPercentage`,
      d.riskPercentage,
    );
    form.setValue(
      `lineItems.${activeLineItemIndex}.profitMarginPercentage`,
      d.profitMarginPercentage,
    );
    form.setValue(
      `lineItems.${activeLineItemIndex}.toleranceClass`,
      d.toleranceClass,
    );
    form.setValue(`lineItems.${activeLineItemIndex}.complexity`, d.complexity);
    form.setValue(
      `lineItems.${activeLineItemIndex}.surfaceFinish`,
      d.surfaceFinish,
    );
    setTemplateApplied(true);
  };

  const handleNext = async () => {
    let isValid = false;
    if (currentStep === 0) {
      isValid = await form.trigger([
        "customerId",
        `lineItems.${activeLineItemIndex}.partName`,
        `lineItems.${activeLineItemIndex}.quantity`,
      ]);
    } else if (currentStep === 1) {
      isValid = await form.trigger();
    }
    if (isValid || currentStep > 1) {
      setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => setCurrentStep((p) => Math.max(p - 1, 0));
  const handleFinalSubmit = (data: QuoteFormValues) => {
    onSubmit(data);
    setCurrentStep(3);
  };

  if (isLoadingCustomers || isLoadingMachines || isLoadingSettings) {
    return <Skeleton className="w-full h-[600px]" />;
  }

  const cur =
    settings?.currency === "GBP"
      ? "£"
      : settings?.currency === "EUR"
        ? "€"
        : "$";

  const calculateCosts = (item: any) => {
    const qty = Number(item.quantity) || 1;
    const sm = machines?.find((m) => m.id === Number(item.machineId));
    const hr = sm ? sm.hourlyRate : settings?.defaultHourlyRate || 0;
    const sr = sm ? sm.setupRate : settings?.defaultSetupRate || 0;
    const setupCost = (Number(item.setupHours) || 0) * sr;
    const programmingCost = (Number(item.programmingHours) || 0) * hr;
    const machiningCost =
      ((Number(item.machiningMinutesPerPart) || 0) / 60) * qty * hr;
    const inspectionCost = (Number(item.inspectionHours) || 0) * hr;
    const deburringCost =
      ((Number(item.deburringMinutesPerPart) || 0) / 60) * qty * hr;
    const materialCostTotal =
      (Number(item.materialCostPerUnit) || 0) *
      qty *
      (1 + (Number(item.materialWastagePercentage) || 0) / 100);
    const directCost =
      setupCost +
      programmingCost +
      machiningCost +
      inspectionCost +
      deburringCost +
      materialCostTotal +
      (Number(item.toolingAllowance) || 0) +
      (Number(item.outsideProcessing) || 0) +
      (Number(item.packaging) || 0) +
      (Number(item.delivery) || 0);
    const riskValue = directCost * ((Number(item.riskPercentage) || 0) / 100);
    const costBeforeMargin = directCost + riskValue;
    const pmp = Number(item.profitMarginPercentage) || 0;
    const pre =
      pmp >= 100 ? costBeforeMargin : costBeforeMargin / (1 - pmp / 100);
    const sellPrice =
      Number(item.discountPercentage) > 0
        ? pre * (1 - (Number(item.discountPercentage) || 0) / 100)
        : pre;
    const pricePerPart = sellPrice / qty;
    const vatEnabled = item.vatEnabled ?? settings?.vatEnabled ?? false;
    const vatRate = item.vatRate ?? settings?.vatRate ?? 20;
    const vatAmount = vatEnabled ? sellPrice * (vatRate / 100) : 0;
    return {
      setupCost,
      programmingCost,
      machiningCost,
      inspectionCost,
      deburringCost,
      materialCostTotal,
      directCost,
      riskValue,
      costBeforeMargin,
      sellPrice,
      pricePerPart,
      vatEnabled,
      vatRate,
      vatAmount,
      totalIncVat: sellPrice + vatAmount,
    };
  };

  const newItemDefaults = () => ({
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
    riskPercentage: settings?.defaultMarginPercentage ? 10 : 10,
    profitMarginPercentage: settings?.defaultMarginPercentage || 30,
    discountPercentage: 0,
    vatEnabled: settings?.vatEnabled ?? false,
    vatRate: settings?.vatRate ?? 20,
  });

  const PartTabs = () =>
    fields.length > 1 ? (
      <div className="flex gap-2 flex-wrap">
        {fields.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveLineItemIndex(idx)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${activeLineItemIndex === idx ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
          >
            {form.watch(`lineItems.${idx}.partName`) || `Part ${idx + 1}`}
          </button>
        ))}
      </div>
    ) : null;

  // ── Complete / success screen ────────────────────────────────────────
  if (currentStep === 3) {
    const customerId = form.getValues("customerId");
    const completedCustomer = customers?.find((c) => c.id === customerId);
    const partNames = form
      .getValues("lineItems")
      .filter((l: any) => !l.hiddenFromPdf)
      .map((l: any) => l.partName)
      .filter(Boolean)
      .join(", ");
    const validUntilRaw = form.getValues("validUntil");
    const validity = validUntilRaw
      ? new Date(validUntilRaw).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";
    const leadTime = form.getValues("leadTime");
    const delivery = form.getValues("deliveryTerms");
    const payment = form.getValues("paymentTerms");
    const emailSubject = completedCustomer
      ? `Quotation – ${completedCustomer.companyName}`
      : "Quotation";
    const emailBody = [
      `Dear ${completedCustomer?.contactName || completedCustomer?.companyName || "Sir/Madam"},`,
      "",
      `Please find attached our quotation${partNames ? ` for: ${partNames}` : ""}.`,
      "",
      ...(validity ? [`This quotation is valid until ${validity}.`] : []),
      ...(leadTime ? [`Lead time is estimated at ${leadTime}.`] : []),
      ...(delivery ? [`Delivery: ${delivery}.`] : []),
      ...(payment ? [`Payment terms: ${payment}.`] : []),
      "",
      "Please do not hesitate to contact us if you have any questions or would like to proceed.",
      "",
      "Kind regards,",
      settings?.companyName || "",
      ...(settings?.phone ? [settings.phone] : []),
      ...(settings?.email ? [settings.email] : []),
    ].join("\n");
    const mailtoHref = completedCustomer?.email
      ? `mailto:${completedCustomer.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      : `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    return (
      <div className="flex-1 px-4 md:px-8 py-8">
        <Card className="max-w-xl mx-auto">
          <CardContent className="py-10 space-y-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto border-2 border-green-500/30">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">Quote Saved!</h2>
              <p className="text-muted-foreground">
                Your quote has been saved and is ready to send.
              </p>
            </div>
            {completedCustomer && (
              <div
                className="rounded border p-5 space-y-4"
                style={{
                  background: "hsl(var(--muted))",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <div
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  Send to Customer
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">
                      {completedCustomer.companyName}
                    </div>
                    {completedCustomer.contactName && (
                      <div className="text-xs text-muted-foreground">
                        Attn: {completedCustomer.contactName}
                      </div>
                    )}
                    {completedCustomer.email && (
                      <div className="text-xs font-mono text-muted-foreground">
                        {completedCustomer.email}
                      </div>
                    )}
                  </div>
                  <a
                    href={mailtoHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: "hsl(213 97% 58%)" }}
                  >
                    <ArrowRight className="w-4 h-4" />
                    Open in Email Client
                  </a>
                </div>
                {!completedCustomer.email && (
                  <p className="text-xs text-amber-500">
                    No email address on file. Add one in Customers to auto-fill
                    the To: field.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Attach the PDF before sending.
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center flex-wrap">
              {savedQuoteId && (
                <Button asChild>
                  <Link href={`/quotes/${savedQuoteId}`}>
                    View &amp; Download PDF
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href="/quotes/new">New Quote</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/quotes">Back to Quotes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Single-screen estimating workspace ───────────────────────────────
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFinalSubmit)}
        className="flex-1 flex min-w-0"
      >
        {/* ── Main scrollable content ──────────────────────────────── */}
        <div className="flex-1 min-w-0 px-4 md:px-5 xl:px-7 py-4 pb-28 space-y-4">

          {/* Banners */}
          {isNewQuote && !templateApplied && (
            <TemplatePicker onSelect={applyTemplate} />
          )}
          {templateApplied && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <Check className="w-4 h-4 shrink-0" />
              Template defaults applied. You can still edit everything below.
              <button
                type="button"
                className="ml-auto text-xs underline"
                onClick={() => setTemplateApplied(false)}
              >
                Change template
              </button>
            </div>
          )}
          {customerDefaultsMsg && (
            <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
              <span className="mt-0.5">ℹ️</span>
              <span>{customerDefaultsMsg}</span>
            </div>
          )}

          {/* ── Info bar ─────────────────────────────────────────────── */}
          <div
            className="rounded border bg-card p-3 space-y-3"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            {/* Row 1: Customer, Status, Quote Date, Valid Until */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="col-span-2 lg:col-span-1">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Customer *</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["Draft", "Sent", "Won", "Lost", "Expired"].map(
                          (s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quoteDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Quote Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-8 text-sm" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Valid Until</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-8 text-sm" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Lead Time, Delivery Terms, RFQ, Follow-up */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Lead Time</label>
                <div className="flex flex-wrap gap-1">
                  {LEAD_TIME_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => form.setValue("leadTime", p)}
                      className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${form.watch("leadTime") === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <FormField
                  control={form.control}
                  name="leadTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          className="h-7 text-xs"
                          placeholder="e.g. 4 weeks"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Delivery Terms</label>
                <div className="flex flex-wrap gap-1">
                  {DELIVERY_TERM_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => form.setValue("deliveryTerms", p)}
                      className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${form.watch("deliveryTerms") === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <FormField
                  control={form.control}
                  name="deliveryTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          className="h-7 text-xs"
                          placeholder="e.g. Ex Works"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="rfqReceivedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">RFQ Received</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-8 text-sm" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Follow-up Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-8 text-sm" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Parts grid ───────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Parts
              </span>
              <div
                className="flex gap-0.5 rounded-md border p-0.5"
                style={{ background: "hsl(var(--muted))" }}
              >
                {(["basic", "advanced"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="px-2.5 py-0.5 rounded text-xs font-medium transition-all capitalize"
                    style={
                      quoteMode === m
                        ? {
                            background: "hsl(var(--background))",
                            color: "hsl(var(--foreground))",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          }
                        : { color: "hsl(var(--muted-foreground))" }
                    }
                    onClick={() => handleQuoteMode(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {fields.map((field, idx) => {
                const item = form.watch(`lineItems.${idx}`);
                const liveC = calculateCosts(item);
                const margin = Number(item.profitMarginPercentage) || 0;
                const risk = Number(item.riskPercentage) || 0;
                const h = healthLabel(
                  margin,
                  risk,
                  item.complexity ?? "Medium",
                );
                const isActive = idx === activeLineItemIndex;

                return (
                  <div
                    key={field.id}
                    className="rounded border bg-card p-3 space-y-2.5 transition-colors cursor-pointer"
                    style={{
                      borderColor: isActive
                        ? "hsl(213 97% 58%)"
                        : "hsl(var(--border))",
                      background: isActive
                        ? "hsl(213 97% 58% / 0.03)"
                        : "hsl(var(--card))",
                    }}
                    onClick={() => setActiveLineItemIndex(idx)}
                  >
                    {/* Card header */}
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: "hsl(213 97% 58% / 0.12)",
                          color: "hsl(213 97% 58%)",
                        }}
                      >
                        P{idx + 1}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${h.bg} ${h.border} ${h.color}`}
                      >
                        {h.label}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <span
                          className="text-sm font-bold font-mono"
                          style={{ color: "hsl(213 97% 58%)" }}
                        >
                          {cur}
                          {liveC.sellPrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({cur}
                          {liveC.pricePerPart.toFixed(2)} ea)
                        </span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(idx);
                              setActiveLineItemIndex(
                                Math.max(0, idx - 1),
                              );
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Part name + qty */}
                    <div
                      className="grid gap-2"
                      style={{ gridTemplateColumns: "1fr 72px" }}
                    >
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.partName`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Part Name *
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-7 text-sm"
                                placeholder="e.g. Bracket Assy"
                                {...f}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.quantity`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Qty *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                className="h-7 text-sm text-center"
                                {...f}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Drawing | Rev | Process */}
                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.drawingNumber`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Drawing</FormLabel>
                            <FormControl>
                              <Input
                                className="h-7 text-xs"
                                placeholder="DWG-001"
                                {...f}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.revision`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Rev</FormLabel>
                            <FormControl>
                              <Input
                                className="h-7 text-xs"
                                placeholder="A"
                                {...f}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.processType`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Process</FormLabel>
                            <Select
                              onValueChange={f.onChange}
                              value={f.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[
                                  "Milling",
                                  "Turning",
                                  "Mill/Turn",
                                  "Manual",
                                  "Other",
                                ].map((v) => (
                                  <SelectItem key={v} value={v}>
                                    {v}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Material | Machine */}
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.material`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Material</FormLabel>
                            <FormControl>
                              <MaterialCombobox
                                value={f.value ?? ""}
                                onChange={(val, costPerKg) => {
                                  f.onChange(val);
                                  if (costPerKg !== undefined)
                                    form.setValue(
                                      `lineItems.${idx}.materialCostPerUnit`,
                                      costPerKg,
                                    );
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.machineId`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Machine</FormLabel>
                            <Select
                              onValueChange={(v) =>
                                f.onChange(
                                  v === "none" ? null : Number(v),
                                )
                              }
                              value={
                                f.value ? f.value.toString() : "none"
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Default" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">
                                  Default / Any
                                </SelectItem>
                                {machines
                                  ?.filter((m) => m.active)
                                  .map((m) => (
                                    <SelectItem
                                      key={m.id}
                                      value={m.id.toString()}
                                    >
                                      {m.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Cost row: Setup | Machining | Mat | Tooling */}
                    <div className="grid grid-cols-4 gap-2">
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.setupHours`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Setup (h)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                className="h-7 text-xs"
                                {...f}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.machiningMinutesPerPart`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Mchn (min)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                className="h-7 text-xs"
                                {...f}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.materialCostPerUnit`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Mat ({cur})
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-7 text-xs"
                                {...f}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.toolingAllowance`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Tool ({cur})
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-7 text-xs"
                                {...f}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Advanced time + material fields */}
                    {quoteMode === "advanced" && (
                      <>
                        <div
                          className="grid grid-cols-3 gap-2 pt-2 border-t"
                          style={{ borderColor: "hsl(var(--border))" }}
                        >
                          <FormField
                            control={form.control}
                            name={`lineItems.${idx}.programmingHours`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Prog (h)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    className="h-7 text-xs"
                                    {...f}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lineItems.${idx}.inspectionHours`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Inspect (h)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    className="h-7 text-xs"
                                    {...f}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lineItems.${idx}.deburringMinutesPerPart`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Deburr (min)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    className="h-7 text-xs"
                                    {...f}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <FormField
                            control={form.control}
                            name={`lineItems.${idx}.materialWastagePercentage`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Wastage %
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    className="h-7 text-xs"
                                    {...f}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lineItems.${idx}.outsideProcessing`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Outside ({cur})
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="h-7 text-xs"
                                    {...f}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lineItems.${idx}.packaging`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Pkgng ({cur})
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="h-7 text-xs"
                                    {...f}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lineItems.${idx}.delivery`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Deliv ({cur})
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="h-7 text-xs"
                                    {...f}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    {/* Commercials: Margin | Discount | [Risk] | VAT */}
                    <div
                      className={`grid gap-2 pt-2 border-t ${quoteMode === "advanced" ? "grid-cols-4" : "grid-cols-3"}`}
                      style={{ borderColor: "hsl(var(--border))" }}
                    >
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.profitMarginPercentage`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Margin %</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                max="99"
                                className="h-7 text-xs"
                                {...f}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.discountPercentage`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Discount %
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                className="h-7 text-xs"
                                {...f}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {quoteMode === "advanced" && (
                        <FormField
                          control={form.control}
                          name={`lineItems.${idx}.riskPercentage`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Risk %</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="1"
                                  min="0"
                                  className="h-7 text-xs"
                                  {...f}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.vatEnabled`}
                        render={({ field: f }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs">VAT</FormLabel>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Switch
                                checked={f.value}
                                onCheckedChange={f.onChange}
                                className="scale-75 origin-left"
                              />
                              <span className="text-xs text-muted-foreground">
                                {f.value ? "On" : "Off"}
                              </span>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Quality (advanced) */}
                    {quoteMode === "advanced" && (
                      <div
                        className="grid grid-cols-3 gap-2 pt-2 border-t"
                        style={{ borderColor: "hsl(var(--border))" }}
                      >
                        <FormField
                          control={form.control}
                          name={`lineItems.${idx}.toleranceClass`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Tolerance
                              </FormLabel>
                              <Select
                                onValueChange={f.onChange}
                                value={f.value || "Standard"}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {[
                                    "Loose",
                                    "Standard",
                                    "Tight",
                                    "Critical",
                                  ].map((v) => (
                                    <SelectItem key={v} value={v}>
                                      {v}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`lineItems.${idx}.surfaceFinish`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Surface</FormLabel>
                              <Select
                                onValueChange={f.onChange}
                                value={f.value || "Standard"}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {["Standard", "Fine", "Critical"].map(
                                    (v) => (
                                      <SelectItem key={v} value={v}>
                                        {v}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`lineItems.${idx}.complexity`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Complexity
                              </FormLabel>
                              <Select
                                onValueChange={f.onChange}
                                value={f.value || "Medium"}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {[
                                    "Simple",
                                    "Medium",
                                    "Complex",
                                    "Very Complex",
                                  ].map((v) => (
                                    <SelectItem key={v} value={v}>
                                      {v}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Cost check (advanced, active part only) */}
                    {quoteMode === "advanced" && isActive && (
                      <CostCheckPanel item={item} />
                    )}

                    {/* Card footer */}
                    <div
                      className="pt-2 flex items-center gap-2 text-xs text-muted-foreground border-t flex-wrap"
                      style={{ borderColor: "hsl(var(--border))" }}
                    >
                      <span>
                        Direct: {cur}
                        {liveC.directCost.toFixed(2)}
                      </span>
                      <span>·</span>
                      <span>
                        w/risk: {cur}
                        {liveC.costBeforeMargin.toFixed(2)}
                      </span>
                      <span>·</span>
                      <span
                        className="font-semibold"
                        style={{ color: "hsl(213 97% 58%)" }}
                      >
                        {cur}
                        {liveC.pricePerPart.toFixed(2)} ea
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add part / one-off row */}
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  append(newItemDefaults() as any);
                  setActiveLineItemIndex(fields.length);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Part
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  append({
                    ...newItemDefaults(),
                    lineItemType: "oneoff",
                    partName: "",
                    material: "N/A",
                    processType: "Other",
                  } as any);
                  setActiveLineItemIndex(fields.length);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add One-off Charge
              </Button>
            </div>
          </div>

          {/* ── Terms, Notes & Options ──────────────────────────────── */}
          <div>
            <button
              type="button"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest py-2 w-full"
              style={{ color: "hsl(var(--muted-foreground))" }}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
              Terms, Notes &amp; Options
            </button>

            {showAdvanced && (
              <div className="space-y-4 mt-2">
                {/* Delivery cost */}
                <div
                  className="rounded border bg-card p-3 space-y-3"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Delivery Cost
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="deliveryCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Cost ({cur})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="h-8"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deliveryMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Method</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Courier"
                              className="h-8"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="includeDeliveryInTotal"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs">
                            Include in total
                          </FormLabel>
                          <div className="flex items-center gap-2 mt-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <span className="text-xs text-muted-foreground">
                              {field.value ? "Yes" : "No"}
                            </span>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Payment terms */}
                <div
                  className="rounded border bg-card p-3 space-y-2"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Payment Terms
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENT_TERM_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => form.setValue("paymentTerms", p)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${form.watch("paymentTerms") === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="e.g. 30 days from invoice date"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes */}
                <div
                  className="rounded border bg-card p-3 space-y-3"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </h4>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="Notes visible to the customer on the PDF…"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Internal Notes{" "}
                          <span className="text-muted-foreground text-xs font-normal">
                            (not on PDF)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="Internal use only…"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Follow-up */}
                <div
                  className="rounded border bg-card p-3 space-y-3"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Follow-up
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="lastContactedDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Contacted</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="followUpNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow-up Notes</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Internal follow-up notes…"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="nextAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Action</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Call to confirm receipt, chase for PO…"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Certifications */}
                <div
                  className="rounded border bg-card p-3"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Certification Requirements
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        name: "materialCertIncluded" as const,
                        label: "Material Cert",
                      },
                      {
                        name: "inspectionReportIncluded" as const,
                        label: "Inspection Report",
                      },
                      { name: "fairIncluded" as const, label: "FAIR" },
                      {
                        name: "cmmReportIncluded" as const,
                        label: "CMM Report",
                      },
                      {
                        name: "specialPackagingIncluded" as const,
                        label: "Special Packaging",
                      },
                    ].map(({ name, label }) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer text-sm">
                              {label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Revision */}
                <div
                  className="rounded border bg-card p-3 space-y-3"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Revision
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="quoteRevision"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Revision</FormLabel>
                          <FormControl>
                            <Input placeholder="A" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="revisionNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Revision Notes</FormLabel>
                          <FormControl>
                            <Input placeholder="What changed?" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Price Breaks */}
                <div
                  className="rounded border bg-card p-3 space-y-3"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quantity Price Breaks
                  </h4>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {[5, 10, 25, 50, 100, 250, 500].map((qty) => {
                      const rows = parsePriceBreakRows(
                        form.watch("priceBreakQtys"),
                      );
                      const exists = rows.some((r) => r.qty === qty);
                      return (
                        <button
                          key={qty}
                          type="button"
                          className={`px-2.5 py-1 rounded border text-xs font-mono transition-colors ${exists ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                          onClick={() => {
                            const current = parsePriceBreakRows(
                              form.watch("priceBreakQtys"),
                            );
                            const next = exists
                              ? current.filter((r) => r.qty !== qty)
                              : [
                                  ...current,
                                  { qty, manual: false },
                                ].sort((a, b) => a.qty - b.qty);
                            form.setValue(
                              "priceBreakQtys",
                              JSON.stringify(next),
                            );
                          }}
                        >
                          {qty}
                        </button>
                      );
                    })}
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Custom"
                        value={customQtyInput}
                        onChange={(e) => setCustomQtyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const qty = parseInt(customQtyInput);
                            if (!qty || qty <= 0) return;
                            const current = parsePriceBreakRows(
                              form.watch("priceBreakQtys"),
                            );
                            if (!current.some((r) => r.qty === qty)) {
                              form.setValue(
                                "priceBreakQtys",
                                JSON.stringify(
                                  [
                                    ...current,
                                    { qty, manual: false },
                                  ].sort((a, b) => a.qty - b.qty),
                                ),
                              );
                            }
                            setCustomQtyInput("");
                          }
                        }}
                        className="w-20 h-7 text-xs font-mono"
                      />
                      <button
                        type="button"
                        className="px-2 py-1 rounded border text-xs hover:bg-muted transition-colors"
                        onClick={() => {
                          const qty = parseInt(customQtyInput);
                          if (!qty || qty <= 0) return;
                          const current = parsePriceBreakRows(
                            form.watch("priceBreakQtys"),
                          );
                          if (!current.some((r) => r.qty === qty)) {
                            form.setValue(
                              "priceBreakQtys",
                              JSON.stringify(
                                [
                                  ...current,
                                  { qty, manual: false },
                                ].sort((a, b) => a.qty - b.qty),
                              ),
                            );
                          }
                          setCustomQtyInput("");
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {(() => {
                    const rows = parsePriceBreakRows(
                      form.watch("priceBreakQtys"),
                    );
                    if (rows.length === 0)
                      return (
                        <p className="text-xs text-muted-foreground">
                          No price breaks added. Click quantities above to
                          add them.
                        </p>
                      );
                    return (
                      <div className="border rounded divide-y text-sm">
                        {rows.map((row, idx) => (
                          <div key={idx} className="p-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  Qty
                                </span>
                                <Input
                                  type="number"
                                  value={row.qty}
                                  min={1}
                                  className="w-16 h-7 text-xs font-mono text-center"
                                  onChange={(e) => {
                                    const newQty =
                                      parseInt(e.target.value) || row.qty;
                                    const current = parsePriceBreakRows(
                                      form.watch("priceBreakQtys"),
                                    );
                                    current[idx] = {
                                      ...current[idx],
                                      qty: newQty,
                                    };
                                    form.setValue(
                                      "priceBreakQtys",
                                      JSON.stringify(current),
                                    );
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Switch
                                  checked={row.manual ?? false}
                                  onCheckedChange={(v) => {
                                    const current = parsePriceBreakRows(
                                      form.watch("priceBreakQtys"),
                                    );
                                    current[idx] = {
                                      ...current[idx],
                                      manual: v,
                                    };
                                    form.setValue(
                                      "priceBreakQtys",
                                      JSON.stringify(current),
                                    );
                                  }}
                                  className="scale-75 origin-left"
                                />
                                <span className="text-xs text-muted-foreground">
                                  Manual
                                </span>
                              </div>
                              {row.manual && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">
                                      Each {cur}
                                    </span>
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      value={row.priceEach ?? ""}
                                      step="0.01"
                                      min={0}
                                      className="w-20 h-7 text-xs font-mono"
                                      onChange={(e) => {
                                        const priceEach =
                                          e.target.value === ""
                                            ? undefined
                                            : parseFloat(e.target.value);
                                        const current =
                                          parsePriceBreakRows(
                                            form.watch("priceBreakQtys"),
                                          );
                                        current[idx] = {
                                          ...current[idx],
                                          priceEach,
                                          total:
                                            priceEach != null &&
                                            row.qty > 0
                                              ? parseFloat(
                                                  (
                                                    priceEach * row.qty
                                                  ).toFixed(2),
                                                )
                                              : current[idx].total,
                                        };
                                        form.setValue(
                                          "priceBreakQtys",
                                          JSON.stringify(current),
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">
                                      Total {cur}
                                    </span>
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      value={row.total ?? ""}
                                      step="0.01"
                                      min={0}
                                      className="w-24 h-7 text-xs font-mono"
                                      onChange={(e) => {
                                        const total =
                                          e.target.value === ""
                                            ? undefined
                                            : parseFloat(e.target.value);
                                        const current =
                                          parsePriceBreakRows(
                                            form.watch("priceBreakQtys"),
                                          );
                                        current[idx] = {
                                          ...current[idx],
                                          total,
                                          priceEach:
                                            total != null && row.qty > 0
                                              ? parseFloat(
                                                  (
                                                    total / row.qty
                                                  ).toFixed(4),
                                                )
                                              : current[idx].priceEach,
                                        };
                                        form.setValue(
                                          "priceBreakQtys",
                                          JSON.stringify(current),
                                        );
                                      }}
                                    />
                                  </div>
                                </>
                              )}
                              <button
                                type="button"
                                className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => {
                                  const current = parsePriceBreakRows(
                                    form.watch("priceBreakQtys"),
                                  );
                                  current.splice(idx, 1);
                                  form.setValue(
                                    "priceBreakQtys",
                                    JSON.stringify(current),
                                  );
                                }}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <Input
                              placeholder="Notes (optional)"
                              value={row.notes ?? ""}
                              className="h-7 text-xs"
                              onChange={(e) => {
                                const current = parsePriceBreakRows(
                                  form.watch("priceBreakQtys"),
                                );
                                current[idx] = {
                                  ...current[idx],
                                  notes: e.target.value,
                                };
                                form.setValue(
                                  "priceBreakQtys",
                                  JSON.stringify(current),
                                );
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky summary panel ─────────────────────────────────── */}
        <div
          className="hidden lg:flex flex-col w-[260px] xl:w-[280px] shrink-0 sticky overflow-y-auto border-l"
          style={{
            top: 44,
            height: "calc(100vh - 44px)",
            background: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
          }}
        >
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Quote Summary
            </div>

            {/* Per-part rows */}
            {fields.map((field, idx) => {
              const item = form.watch(`lineItems.${idx}`);
              const liveC = calculateCosts(item);
              const partName = item.partName || `Part ${idx + 1}`;
              return (
                <div
                  key={field.id}
                  className="flex justify-between items-start gap-2 text-xs py-2 border-b"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{partName}</div>
                    <div className="text-muted-foreground">
                      qty {item.quantity || 1} × {cur}
                      {liveC.pricePerPart.toFixed(2)}
                    </div>
                  </div>
                  <div className="font-mono font-semibold shrink-0">
                    {cur}
                    {liveC.sellPrice.toFixed(2)}
                  </div>
                </div>
              );
            })}

            {/* Delivery line */}
            {form.watch("includeDeliveryInTotal") &&
              Number(form.watch("deliveryCost")) > 0 && (
                <div className="flex justify-between text-xs py-1">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-mono">
                    {cur}
                    {Number(form.watch("deliveryCost")).toFixed(2)}
                  </span>
                </div>
              )}

            {/* Grand total */}
            {(() => {
              const partsTotal = fields.reduce(
                (sum, _, idx) =>
                  sum +
                  calculateCosts(form.watch(`lineItems.${idx}`)).sellPrice,
                0,
              );
              const deliveryExtra = form.watch("includeDeliveryInTotal")
                ? Number(form.watch("deliveryCost")) || 0
                : 0;
              const grandTotal = partsTotal + deliveryExtra;
              const vatTotal = fields.reduce(
                (sum, _, idx) =>
                  sum +
                  calculateCosts(form.watch(`lineItems.${idx}`)).vatAmount,
                0,
              );
              return (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">
                      Total (excl. VAT)
                    </span>
                    <span
                      className="text-xl font-bold font-mono"
                      style={{ color: "hsl(213 97% 58%)" }}
                    >
                      {cur}
                      {grandTotal.toFixed(2)}
                    </span>
                  </div>
                  {vatTotal > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>VAT</span>
                        <span className="font-mono">
                          {cur}
                          {vatTotal.toFixed(2)}
                        </span>
                      </div>
                      <div
                        className="flex justify-between text-sm font-semibold border-t pt-1.5"
                        style={{ borderColor: "hsl(var(--border))" }}
                      >
                        <span>Total (inc. VAT)</span>
                        <span className="font-mono">
                          {cur}
                          {(grandTotal + vatTotal).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Lead time / terms summary */}
            <div
              className="pt-2 space-y-1 text-xs border-t"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              {form.watch("leadTime") && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">
                    Lead time
                  </span>
                  <span className="font-medium text-right">
                    {form.watch("leadTime")}
                  </span>
                </div>
              )}
              {form.watch("deliveryTerms") && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">
                    Delivery
                  </span>
                  <span className="font-medium text-right">
                    {form.watch("deliveryTerms")}
                  </span>
                </div>
              )}
              {form.watch("paymentTerms") && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">
                    Payment
                  </span>
                  <span className="font-medium text-right truncate max-w-[130px]">
                    {form.watch("paymentTerms")}
                  </span>
                </div>
              )}
            </div>

            {/* Health tip for active part */}
            {(() => {
              const activeItem = form.watch(
                `lineItems.${activeLineItemIndex}`,
              );
              if (!activeItem) return null;
              const margin =
                Number(activeItem.profitMarginPercentage) || 0;
              const risk = Number(activeItem.riskPercentage) || 0;
              const h = healthLabel(
                margin,
                risk,
                activeItem.complexity ?? "Medium",
              );
              return (
                <div
                  className={`text-xs px-3 py-2 rounded border ${h.bg} ${h.border} ${h.color}`}
                >
                  <strong>{h.label}:</strong> {h.tip}
                </div>
              );
            })()}
          </div>

          {/* Save button */}
          <div
            className="p-4 border-t space-y-2 shrink-0"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? "Saving…" : "Save Quote"}
            </Button>
            {savedQuoteId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <Link href={`/quotes/${savedQuoteId}`}>View PDF</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile save button (fixed) */}
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 p-4 border-t z-20"
          style={{
            background: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
          }}
        >
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving…" : "Save Quote"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
