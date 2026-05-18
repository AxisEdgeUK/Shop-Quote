import { createContext, useContext, useState, type ReactNode } from "react";

export type DrawingScanResult = {
  partName?: string;
  material?: string;
  materialConfidence?: "low" | "medium" | "high";
  quantity?: number;
  drawingNumber?: string;
  revision?: string;
  finish?: string;
  heatTreatment?: string;
  tolerances: string[];
  coatings: string[];
  threads: string[];
  criticalDimensions: string[];
  inspectionNotes: string[];
  missingInfo: string[];
  quoteRisk?: "low" | "medium" | "high";
  summary?: string;
  unreadable?: boolean;
};

type ScanContextValue = {
  scanResult: DrawingScanResult | null;
  setScanResult: (result: DrawingScanResult | null) => void;
};

const ScanContext = createContext<ScanContextValue>({
  scanResult: null,
  setScanResult: () => {},
});

export function ScanContextProvider({ children }: { children: ReactNode }) {
  const [scanResult, setScanResult] = useState<DrawingScanResult | null>(null);
  return (
    <ScanContext.Provider value={{ scanResult, setScanResult }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScanContext() {
  return useContext(ScanContext);
}
