import type { KalkulatorItem } from "@rubahrumah/types";

export interface KalkulatorInput {
  lantai: number;
  luas: number;
  paket: "MINIMALIS" | "LUXURY";
}

export interface KalkulatorResult {
  paket: "MINIMALIS" | "LUXURY";
  harga_per_m2: number;
  total: number;
  label: string;
}

/**
 * Hitung estimasi biaya berdasarkan data kalkulator dari DB
 */
export function calculateEstimasi(
  input: KalkulatorInput,
  data: KalkulatorItem[]
): KalkulatorResult | null {
  const match = data.find(
    (item) => item.lantai === input.lantai && item.paket === input.paket
  );
  if (!match) return null;

  return {
    paket: input.paket,
    harga_per_m2: match.harga_per_m2,
    total: match.harga_per_m2 * input.luas,
    label: match.label,
  };
}

/**
 * Hitung selisih antara 2 paket
 */
export function calculateDiff(minimalis: number, luxury: number): number {
  return luxury - minimalis;
}
