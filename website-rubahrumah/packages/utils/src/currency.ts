/**
 * Format angka ke format Rupiah
 * @example formatRupiah(764500000) => "Rp764.500.000"
 */
export function formatRupiah(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "Rp0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format singkat: Rp764,5 Jt / Rp1,2 M
 */
export function formatRupiahShort(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp${(amount / 1_000_000_000).toFixed(1)} M`;
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toFixed(1)} Jt`;
  if (amount >= 1_000) return `Rp${(amount / 1_000).toFixed(0)} Rb`;
  return formatRupiah(amount);
}

/**
 * Parse string Rupiah ke angka
 * @example parseRupiah("Rp764.500.000") => 764500000
 */
export function parseRupiah(formatted: string): number {
  const cleaned = formatted.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

/**
 * Format input field Rupiah secara live (saat user mengetik)
 * @example formatRupiahInput("764500000") => "764.500.000"
 */
export function formatRupiahInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
