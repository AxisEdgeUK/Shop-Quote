export type QuoteMode = "basic" | "advanced";

export interface WorkflowDefaults {
  lastMachineId: number | null;
  lastMaterial: string | null;
  defaultMargin: number | null;
  defaultLeadTime: string | null;
  lastPaymentTerms: string | null;
}

const K = {
  machineId: "sq_lastMachineId",
  material: "sq_lastMaterial",
  margin: "sq_defaultMargin",
  leadTime: "sq_defaultLeadTime",
  paymentTerms: "sq_lastPaymentTerms",
  mode: "sq_quoteMode",
} as const;

function lg(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function ls(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {}
}

export function useWorkflowDefaults() {
  function load(): WorkflowDefaults {
    const rawMachineId = lg(K.machineId);
    const rawMargin = lg(K.margin);
    return {
      lastMachineId: rawMachineId ? Number(rawMachineId) : null,
      lastMaterial: lg(K.material),
      defaultMargin: rawMargin ? Number(rawMargin) : null,
      defaultLeadTime: lg(K.leadTime),
      lastPaymentTerms: lg(K.paymentTerms),
    };
  }

  function save(opts: {
    machineId?: number;
    material?: string;
    margin?: number;
    leadTime?: string;
    paymentTerms?: string;
  }): void {
    if (opts.machineId != null) ls(K.machineId, String(opts.machineId));
    if (opts.material) ls(K.material, opts.material);
    if (opts.margin != null) ls(K.margin, String(opts.margin));
    if (opts.leadTime) ls(K.leadTime, opts.leadTime);
    if (opts.paymentTerms) ls(K.paymentTerms, opts.paymentTerms);
  }

  function getMode(): QuoteMode {
    return (lg(K.mode) as QuoteMode) || "basic";
  }

  function setMode(mode: QuoteMode): void {
    ls(K.mode, mode);
  }

  return { load, save, getMode, setMode };
}
