const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE}/api${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ChargeableExtra {
  id: number;
  extraCode: string;
  extraName: string;
  category: string;
  unit: string;
  defaultSellPrice: number;
  defaultCost: number;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StandardProduct {
  id: number;
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
  createdAt: string;
  updatedAt: string;
}
