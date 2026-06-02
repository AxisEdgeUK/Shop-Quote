import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sq_experimental_features";

interface ExperimentalFeatures {
  enableScanAssist: boolean;
}

const DEFAULTS: ExperimentalFeatures = {
  enableScanAssist: false,
};

function load(): ExperimentalFeatures {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(value: ExperimentalFeatures) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

export function useExperimentalFeatures() {
  const [features, setFeatures] = useState<ExperimentalFeatures>(load);

  const set = useCallback(
    <K extends keyof ExperimentalFeatures>(
      key: K,
      value: ExperimentalFeatures[K],
    ) => {
      setFeatures((prev) => {
        const next = { ...prev, [key]: value };
        save(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFeatures(load());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { features, set };
}
