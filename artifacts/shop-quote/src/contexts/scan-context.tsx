import { createContext, useContext, useState, type ReactNode } from "react";

export type DrawingScanResult = {
  material?: string;
  materialConfidence?: "low" | "medium" | "high";
  quantity?: number;
  drawingNumber?: string;
  revision?: string;
  tolerances: string[];
  coatings: string[];
  inspectionNotes: string[];
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
