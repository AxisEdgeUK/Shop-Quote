import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
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
import { apiFetch } from "@/lib/api";

type Step = "upload" | "map" | "preview" | "importing" | "result";

interface MappedProduct {
  productCode: string;
  productName: string;
  category: string;
  material: string;
  standardSize: string;
  unit: string;
  defaultSellPrice: number;
  defaultCost: number;
  defaultLeadTime: string;
  notes: string;
  active: boolean;
  _row: number;
}

interface PreviewItem extends MappedProduct {
  status: "ready" | "missing-name";
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

const SHOP_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "productCode", label: "Product Code" },
  { key: "productName", label: "Product Name", required: true },
  { key: "category", label: "Category" },
  { key: "material", label: "Material" },
  { key: "standardSize", label: "Standard Size" },
  { key: "unit", label: "Unit" },
  { key: "defaultSellPrice", label: "Default Sell Price", required: true },
  { key: "defaultCost", label: "Default Cost" },
  { key: "defaultLeadTime", label: "Default Lead Time" },
  { key: "notes", label: "Notes" },
  { key: "active", label: "Active" },
];

const AUTO_ALIASES: Record<string, string[]> = {
  productCode: ["product code", "code", "ref", "reference", "sku", "part no", "part number"],
  productName: ["product name", "name", "description", "product", "item", "item name", "part name"],
  category: ["category", "type", "group", "kind"],
  material: ["material", "alloy", "grade", "spec"],
  standardSize: ["standard size", "size", "dimensions", "dim", "standard"],
  unit: ["unit", "units", "uom", "measure"],
  defaultSellPrice: ["default sell price", "sell price", "price", "unit price", "sell", "£", "sale price"],
  defaultCost: ["default cost", "cost", "buy price", "purchase price", "net"],
  defaultLeadTime: ["default lead time", "lead time", "delivery time", "lead"],
  notes: ["notes", "note", "comments", "remarks", "info"],
  active: ["active", "status", "enabled"],
};

function autoDetect(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  for (const field of SHOP_FIELDS) {
    const aliases = AUTO_ALIASES[field.key] ?? [];
    const match = headers.find(
      (h) => !used.has(h) && aliases.some((a) => h.toLowerCase().trim() === a),
    );
    if (match) { mapping[field.key] = match; used.add(match); }
    else mapping[field.key] = "";
  }
  return mapping;
}

function parseActive(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (!v) return true;
  return !["no", "false", "inactive", "0", "n"].includes(v);
}

function parseNumber(raw: string): number {
  const cleaned = raw.replace(/[£$€,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) || n < 0 ? 0 : n;
}

async function parseSpreadsheet(
  file: File,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
        if (raw.length < 2) { resolve({ headers: [], rows: [] }); return; }
        const headers = (raw[0] as unknown[]).map((h) => String(h ?? "").trim()).filter(Boolean);
        const rows = raw.slice(1)
          .map((row) => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = String((row as unknown[])[i] ?? "").trim(); });
            return obj;
          })
          .filter((row) => Object.values(row).some((v) => v !== ""));
        resolve({ headers, rows });
      } catch {
        reject(new Error("Unable to read this file. Please upload an Excel or CSV file."));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read this file."));
    reader.readAsArrayBuffer(file);
  });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function ProductImportDialog({ open, onOpenChange, onImportComplete }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload"); setFileName(""); setHeaders([]); setRawRows([]);
    setMapping({}); setParseError(""); setIsDragging(false);
    setPreviewItems([]); setImportProgress(0); setImportResult(null);
  };

  const handleClose = () => { onOpenChange(false); setTimeout(reset, 300); };

  const handleFile = async (file: File) => {
    setParseError("");
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      setParseError("Please upload an Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    try {
      const { headers: h, rows } = await parseSpreadsheet(file);
      if (h.length === 0) { setParseError("The file appears empty or has no column headers."); return; }
      setFileName(file.name); setHeaders(h); setRawRows(rows);
      setMapping(autoDetect(h)); setStep("map");
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Unable to read this file.");
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0]; if (file) handleFile(file);
  }, []);

  const buildPreview = () => {
    const items: PreviewItem[] = rawRows.map((row, idx) => {
      const get = (field: string) => mapping[field] ? (row[mapping[field]] ?? "") : "";
      const productName = get("productName").trim();
      if (!productName) {
        return {
          productCode: "", productName, category: "", material: "", standardSize: "",
          unit: "each", defaultSellPrice: 0, defaultCost: 0, defaultLeadTime: "", notes: "", active: true,
          _row: idx + 2, status: "missing-name" as const,
        };
      }
      return {
        productCode: get("productCode").trim(),
        productName,
        category: get("category").trim(),
        material: get("material").trim(),
        standardSize: get("standardSize").trim(),
        unit: get("unit").trim() || "each",
        defaultSellPrice: parseNumber(get("defaultSellPrice")),
        defaultCost: parseNumber(get("defaultCost")),
        defaultLeadTime: get("defaultLeadTime").trim(),
        notes: get("notes").trim(),
        active: parseActive(get("active")),
        _row: idx + 2,
        status: "ready" as const,
      };
    });
    setPreviewItems(items); setStep("preview");
  };

  const runImport = async () => {
    setStep("importing"); setImportProgress(0);
    const result: ImportResult = { imported: 0, skipped: 0, errors: 0 };
    const toProcess = previewItems.filter((i) => i.status === "ready");
    for (let i = 0; i < toProcess.length; i++) {
      const item = toProcess[i];
      try {
        await apiFetch("/products", {
          method: "POST",
          body: JSON.stringify({
            productCode: item.productCode, productName: item.productName,
            category: item.category, material: item.material,
            standardSize: item.standardSize, unit: item.unit,
            defaultSellPrice: item.defaultSellPrice, defaultCost: item.defaultCost,
            defaultLeadTime: item.defaultLeadTime, notes: item.notes, active: item.active,
          }),
        });
        result.imported++;
      } catch { result.errors++; }
      setImportProgress(Math.round(((i + 1) / toProcess.length) * 100));
    }
    onImportComplete?.();
    setImportResult(result); setStep("result");
  };

  const counts = {
    total: previewItems.length,
    ready: previewItems.filter((i) => i.status === "ready").length,
    missingName: previewItems.filter((i) => i.status === "missing-name").length,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Import Standard Products
            </DialogTitle>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            {(["upload", "map", "preview", "result"] as const).map((s, idx) => {
              const allSteps = ["upload", "map", "preview", "importing", "result"];
              const stepIndex = allSteps.indexOf(step);
              const thisIndex = allSteps.indexOf(s);
              const done = stepIndex > thisIndex;
              const active = stepIndex === thisIndex || (s === "preview" && step === "importing");
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-colors ${done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {done ? "✓" : idx + 1}
                  </div>
                  <span className={`text-xs capitalize ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {s === "result" ? "Done" : s}
                  </span>
                  {idx < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {step === "upload" && (
            <div className="p-6 flex flex-col items-center justify-center min-h-[320px]">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
              >
                <Upload className={`w-10 h-10 mx-auto mb-4 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-semibold text-base mb-1">Drop your spreadsheet here</p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border rounded px-3 py-1.5 bg-muted/40">
                  Supported: .xlsx · .xls · .csv
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {parseError && (
                <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 w-full">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground text-center max-w-sm">
                Expected columns: Product Code, Product Name, Category, Material, Standard Size, Unit, Default Sell Price, Default Cost, Default Lead Time, Notes, Active
              </p>
            </div>
          )}

          {step === "map" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 pt-4 pb-3 border-b shrink-0">
                <p className="text-sm text-muted-foreground">
                  Found <strong>{rawRows.length} rows</strong> in <strong>{fileName}</strong>. Match your spreadsheet columns below.
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="px-6 py-4 space-y-3">
                  {SHOP_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-3">
                      <div className="w-40 shrink-0 text-sm font-medium">
                        {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Select
                        value={mapping[field.key] ?? ""}
                        onValueChange={(v) => setMapping((m) => ({ ...m, [field.key]: v === "__none__" ? "" : v }))}
                      >
                        <SelectTrigger className="flex-1 h-9 text-sm">
                          <SelectValue placeholder="— not mapped —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— not mapped —</SelectItem>
                          {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {mapping[field.key] && (
                        <div className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1 shrink-0 max-w-[120px] truncate">
                          {rawRows[0]?.[mapping[field.key]] ?? "—"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="px-6 py-4 border-t shrink-0 flex justify-between">
                <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                <Button onClick={buildPreview} disabled={!mapping["productName"] || !mapping["defaultSellPrice"]}>
                  Preview Import
                </Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-3 border-b shrink-0 grid grid-cols-3 gap-3">
                {[
                  { label: "Ready", value: counts.ready, color: "text-emerald-600" },
                  { label: "Missing Name", value: counts.missingName, color: "text-yellow-600" },
                  { label: "Total Rows", value: counts.total, color: "" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
              <ScrollArea className="flex-1">
                <div className="px-6 py-3 space-y-2">
                  {previewItems.map((item) => (
                    <div key={item._row} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${item.status === "ready" ? "bg-emerald-50 border-emerald-200" : "bg-yellow-50 border-yellow-200"}`}>
                      {item.status === "ready"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        : <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{item.productName || <span className="text-muted-foreground italic">Missing name</span>}</div>
                        {item.status === "ready" && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {item.productCode && <span className="mr-2">{item.productCode}</span>}
                            {item.category && <span className="mr-2">{item.category}</span>}
                            {item.material && <span className="mr-2">{item.material}</span>}
                            {item.unit} · £{item.defaultSellPrice.toFixed(2)}
                          </div>
                        )}
                        {item.status === "missing-name" && (
                          <div className="text-xs text-yellow-700">Row {item._row}: No product name — will be skipped</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="px-6 py-4 border-t shrink-0 flex justify-between">
                <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
                <Button onClick={runImport} disabled={counts.ready === 0}>
                  Import {counts.ready} Product{counts.ready !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[280px] gap-4">
              <FileSpreadsheet className="w-10 h-10 text-primary animate-pulse" />
              <p className="font-medium">Importing products…</p>
              <Progress value={importProgress} className="w-full max-w-xs" />
              <p className="text-sm text-muted-foreground">{importProgress}%</p>
            </div>
          )}

          {step === "result" && importResult && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[280px] gap-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-lg font-semibold">Import complete</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{importResult.imported}</div>
                  <div className="text-xs text-muted-foreground">Imported</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-muted-foreground">{importResult.skipped}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{importResult.errors}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </div>
              <Button onClick={handleClose}>Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
