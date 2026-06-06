import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  createMaterial,
  updateMaterial,
  useListMaterials,
  getListMaterialsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

type Step = "upload" | "map" | "preview" | "importing" | "result";
type DuplicateAction = "skip" | "update" | "new";

interface MappedMaterial {
  material: string;
  grade: string;
  form: string;
  costPerKg: number;
  density: number;
  supplier: string;
  defaultStockAllowance: number;
  active: boolean;
  _row: number;
}

interface PreviewItem extends MappedMaterial {
  status: "ready" | "missing-required" | "duplicate";
  duplicateId?: number;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
}

/* ── Field definitions ───────────────────────────────────────── */

const SHOP_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "material", label: "Material", required: true },
  { key: "grade", label: "Grade", required: true },
  { key: "form", label: "Form" },
  { key: "supplier", label: "Supplier" },
  { key: "defaultStockAllowance", label: "Stock Allowance %" },
  { key: "active", label: "Active" },
];

const AUTO_ALIASES: Record<string, string[]> = {
  material: [
    "material",
    "material type",
    "alloy",
    "metal",
    "base material",
    "material name",
  ],
  grade: [
    "grade",
    "specification",
    "spec",
    "alloy grade",
    "material grade",
    "type",
    "material spec",
  ],
  form: [
    "form",
    "shape",
    "product form",
    "stock form",
    "material form",
    "product",
  ],
  costPerKg: [
    "cost per kg",
    "price per kg",
    "£/kg",
    "$/kg",
    "cost/kg",
    "unit cost",
    "cost per kilo",
    "price/kg",
  ],
  density: ["density", "g/cm3", "g/cm³", "specific gravity", "density g/cm3"],
  supplier: ["supplier", "vendor", "manufacturer", "source", "distributor"],
  defaultStockAllowance: [
    "stock allowance",
    "default stock allowance",
    "wastage",
    "wastage %",
    "allowance %",
    "stock wastage",
  ],
  active: ["active", "status", "in use", "enabled", "available"],
};

function autoDetect(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  for (const field of SHOP_FIELDS) {
    const aliases = AUTO_ALIASES[field.key] ?? [];
    const match = headers.find(
      (h) => !used.has(h) && aliases.some((a) => h.toLowerCase().trim() === a),
    );
    if (match) {
      mapping[field.key] = match;
      used.add(match);
    } else {
      mapping[field.key] = "";
    }
  }
  return mapping;
}

function parseNum(raw: string): number {
  const cleaned = raw.replace(/[£$€,\s%]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) || n < 0 ? 0 : n;
}

function parseActive(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (!v) return true;
  return !["no", "false", "inactive", "0", "n"].includes(v);
}

/* ── File parsing ────────────────────────────────────────────── */

async function parseSpreadsheet(file: File): Promise<{
  headers: string[];
  rows: Record<string, string>[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: "",
        }) as unknown[][];
        if (raw.length < 2) {
          resolve({ headers: [], rows: [] });
          return;
        }
        const headers = (raw[0] as unknown[])
          .map((h) => String(h ?? "").trim())
          .filter(Boolean);
        const rows = raw
          .slice(1)
          .map((row) => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              obj[h] = String((row as unknown[])[i] ?? "").trim();
            });
            return obj;
          })
          .filter((row) => Object.values(row).some((v) => v !== ""));
        resolve({ headers, rows });
      } catch {
        reject(
          new Error(
            "Unable to read this file. Please upload an Excel or CSV material list.",
          ),
        );
      }
    };
    reader.onerror = () =>
      reject(
        new Error(
          "Unable to read this file. Please upload an Excel or CSV material list.",
        ),
      );
    reader.readAsArrayBuffer(file);
  });
}

/* ── Component ───────────────────────────────────────────────── */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialImportDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: existingMaterials = [] } = useListMaterials();

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [duplicateAction, setDuplicateAction] =
    useState<DuplicateAction>("skip");
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setParseError("");
    setIsDragging(false);
    setPreviewItems([]);
    setDuplicateAction("skip");
    setImportProgress(0);
    setImportResult(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const handleFile = async (file: File) => {
    setParseError("");
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      setParseError("Please upload an Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    try {
      const { headers: h, rows } = await parseSpreadsheet(file);
      if (h.length === 0) {
        setParseError(
          "The file appears to be empty or has no column headers in the first row.",
        );
        return;
      }
      setFileName(file.name);
      setHeaders(h);
      setRawRows(rows);
      setMapping(autoDetect(h));
      setStep("map");
    } catch (err: unknown) {
      setParseError(
        err instanceof Error ? err.message : "Unable to read this file.",
      );
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const buildPreview = () => {
    const items: PreviewItem[] = rawRows.map((row, idx) => {
      const get = (field: string) =>
        mapping[field] ? (row[mapping[field]] ?? "") : "";

      const material = get("material").trim();
      const grade = get("grade").trim();
      const form = get("form").trim();

      if (!material || !grade) {
        return {
          material,
          grade,
          form,
          costPerKg: parseNum(get("costPerKg")),
          density: parseNum(get("density")),
          supplier: get("supplier").trim(),
          defaultStockAllowance: parseNum(get("defaultStockAllowance")) || 10,
          active: parseActive(get("active")),
          _row: idx + 2,
          status: "missing-required" as const,
        };
      }

      const dup = existingMaterials.find(
        (m) =>
          m.material.toLowerCase() === material.toLowerCase() &&
          m.grade.toLowerCase() === grade.toLowerCase() &&
          m.form.toLowerCase() === form.toLowerCase(),
      );

      return {
        material,
        grade,
        form,
        costPerKg: parseNum(get("costPerKg")),
        density: parseNum(get("density")),
        supplier: get("supplier").trim(),
        defaultStockAllowance: parseNum(get("defaultStockAllowance")) || 10,
        active: parseActive(get("active")),
        _row: idx + 2,
        status: dup ? ("duplicate" as const) : ("ready" as const),
        duplicateId: dup?.id,
      };
    });
    setPreviewItems(items);
    setStep("preview");
  };

  const runImport = async () => {
    setStep("importing");
    setImportProgress(0);
    const result: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };
    const toProcess = previewItems.filter(
      (i) => i.status !== "missing-required",
    );
    for (let i = 0; i < toProcess.length; i++) {
      const item = toProcess[i];
      const payload = {
        material: item.material,
        grade: item.grade,
        form: item.form,
        costPerKg: item.costPerKg,
        density: item.density,
        supplier: item.supplier,
        defaultStockAllowance: item.defaultStockAllowance,
        active: item.active,
      };
      try {
        if (item.status === "duplicate") {
          if (duplicateAction === "skip") {
            result.skipped++;
          } else if (duplicateAction === "update" && item.duplicateId) {
            await updateMaterial(item.duplicateId, payload);
            result.updated++;
          } else {
            await createMaterial(payload);
            result.imported++;
          }
        } else {
          await createMaterial(payload);
          result.imported++;
        }
      } catch {
        result.errors++;
      }
      setImportProgress(Math.round(((i + 1) / toProcess.length) * 100));
    }
    await queryClient.invalidateQueries({
      queryKey: getListMaterialsQueryKey(),
    });
    setImportResult(result);
    setStep("result");
  };

  const counts = {
    total: previewItems.length,
    ready: previewItems.filter((i) => i.status === "ready").length,
    duplicates: previewItems.filter((i) => i.status === "duplicate").length,
    missingRequired: previewItems.filter((i) => i.status === "missing-required")
      .length,
  };

  const importCount =
    counts.ready + (duplicateAction !== "skip" ? counts.duplicates : 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Import Materials
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            {(["upload", "map", "preview", "result"] as const).map((s, idx) => {
              const allSteps = [
                "upload",
                "map",
                "preview",
                "importing",
                "result",
              ];
              const stepIndex = allSteps.indexOf(step);
              const thisIndex = allSteps.indexOf(s);
              const done = stepIndex > thisIndex;
              const active =
                stepIndex === thisIndex ||
                (s === "preview" && step === "importing");
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-colors ${done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {done ? "✓" : idx + 1}
                  </div>
                  <span
                    className={`text-xs capitalize ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                  >
                    {s === "result" ? "Done" : s}
                  </span>
                  {idx < 3 && (
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="p-6 flex flex-col items-center justify-center min-h-[320px]">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
              >
                <Upload
                  className={`w-10 h-10 mx-auto mb-4 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`}
                />
                <p className="font-semibold text-base mb-1">
                  Drop your spreadsheet here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse files
                </p>
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border rounded px-3 py-1.5 bg-muted/40">
                  Supported: .xlsx · .xls · .csv
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {parseError && (
                <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 w-full">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground text-center max-w-sm">
                Your first row should contain column headers like "Material",
                "Grade", "Cost Per Kg" etc.
              </p>
            </div>
          )}

          {/* Step 2: Map */}
          {step === "map" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 pt-4 pb-3 border-b shrink-0">
                <p className="text-sm text-muted-foreground">
                  Found <strong>{rawRows.length} rows</strong> in{" "}
                  <strong>{fileName}</strong>. Match your columns to the right
                  fields.
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="px-6 py-4 space-y-3">
                  {SHOP_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-3">
                      <div className="w-40 shrink-0 text-sm font-medium">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-0.5">*</span>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Select
                        value={mapping[field.key] ?? ""}
                        onValueChange={(v) =>
                          setMapping((m) => ({
                            ...m,
                            [field.key]: v === "__none__" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-9 text-sm">
                          <SelectValue placeholder="— not mapped —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            — not mapped —
                          </SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mapping[field.key] && (
                        <div className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1 shrink-0 max-w-[140px] truncate">
                          {rawRows[0]?.[mapping[field.key]] ?? "—"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="px-6 pb-4">
                  <div className="rounded-lg bg-muted/50 border px-4 py-3 text-xs text-muted-foreground space-y-1">
                    <p>
                      <strong>Material</strong> — the base material family, e.g.
                      Aluminium, Steel, Stainless
                    </p>
                    <p>
                      <strong>Grade</strong> — the specific grade or
                      specification, e.g. 6082-T6, EN24T, 316
                    </p>
                    <p>
                      <strong>Duplicate check</strong> — Material + Grade + Form
                      must all match to be a duplicate
                    </p>
                  </div>
                </div>
              </ScrollArea>
              <div className="px-6 py-4 border-t shrink-0 flex justify-between">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button
                  onClick={buildPreview}
                  disabled={!mapping["material"] || !mapping["grade"]}
                >
                  Preview Import
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-4 border-b shrink-0 grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">{counts.total}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Total rows
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {counts.ready}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Ready
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {counts.duplicates}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Duplicates
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${counts.missingRequired > 0 ? "text-red-500" : "text-muted-foreground"}`}
                  >
                    {counts.missingRequired}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Needs review
                  </div>
                </div>
              </div>

              {counts.duplicates > 0 && (
                <div className="px-6 py-3 border-b shrink-0 flex items-center gap-3 bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm font-medium text-amber-800">
                    {counts.duplicates} duplicate
                    {counts.duplicates > 1 ? "s" : ""} found:
                  </span>
                  <Select
                    value={duplicateAction}
                    onValueChange={(v) =>
                      setDuplicateAction(v as DuplicateAction)
                    }
                  >
                    <SelectTrigger className="h-8 w-44 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip duplicates</SelectItem>
                      <SelectItem value="update">Update existing</SelectItem>
                      <SelectItem value="new">Import as new</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <ScrollArea className="flex-1">
                <div className="px-6 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-6">
                          Row
                        </th>
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Material
                        </th>
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Grade
                        </th>
                        <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Form
                        </th>
                        <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((item) => (
                        <tr key={item._row} className="border-b last:border-0">
                          <td className="py-2 pr-3 text-xs text-muted-foreground font-mono">
                            {item._row}
                          </td>
                          <td className="py-2 pr-3 font-medium truncate max-w-[120px]">
                            {item.material || (
                              <span className="text-muted-foreground italic">
                                —
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground truncate max-w-[120px]">
                            {item.grade || "—"}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground text-xs truncate max-w-[100px]">
                            {item.form || "—"}
                          </td>
                          <td className="py-2">
                            {item.status === "ready" && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            )}
                            {item.status === "duplicate" && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                Duplicate
                              </span>
                            )}
                            {item.status === "missing-required" && (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                                Missing field
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>

              <div className="px-6 py-4 border-t shrink-0 flex justify-between items-center">
                <Button variant="outline" onClick={() => setStep("map")}>
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  {counts.missingRequired > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {counts.missingRequired} row
                      {counts.missingRequired > 1 ? "s" : ""} will be skipped
                    </span>
                  )}
                  <Button onClick={runImport} disabled={importCount === 0}>
                    Import {importCount} Material{importCount !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === "importing" && (
            <div className="p-10 flex flex-col items-center justify-center min-h-[300px] gap-6">
              <div className="text-center">
                <div className="text-lg font-semibold mb-1">
                  Importing materials…
                </div>
                <div className="text-sm text-muted-foreground">
                  Please wait while we process your file.
                </div>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <Progress value={importProgress} className="h-2" />
                <div className="text-center text-xs text-muted-foreground">
                  {importProgress}% complete
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Result */}
          {step === "result" && importResult && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[300px] gap-6">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="text-center">
                <div className="text-lg font-bold mb-1">Import complete</div>
                <div className="text-sm text-muted-foreground">
                  Materials are ready to use in quotes.
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                <div className="rounded-lg border bg-emerald-50 border-emerald-200 p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-700">
                    {importResult.imported}
                  </div>
                  <div className="text-xs text-emerald-700 mt-1">Imported</div>
                </div>
                <div className="rounded-lg border bg-muted p-4 text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {importResult.updated + importResult.skipped}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {duplicateAction === "update" ? "Updated" : "Skipped"}
                  </div>
                </div>
                <div
                  className={`rounded-lg border p-4 text-center ${importResult.errors > 0 ? "bg-red-50 border-red-200" : "bg-muted"}`}
                >
                  <div
                    className={`text-2xl font-bold ${importResult.errors > 0 ? "text-red-600" : "text-muted-foreground"}`}
                  >
                    {importResult.errors}
                  </div>
                  <div
                    className={`text-xs mt-1 ${importResult.errors > 0 ? "text-red-600" : "text-muted-foreground"}`}
                  >
                    Errors
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset}>
                  Import Another File
                </Button>
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
