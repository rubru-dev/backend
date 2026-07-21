/** Normalisasi nomor lokal → format internasional Indonesia (628xxx). */
export function normalizeWaNumber(raw: string): string | null {
  let n = String(raw || "").replace(/\D/g, "");
  if (!n) return null;
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  // kalau sudah diawali kode negara lain (mis. 62..., 60...), biarkan apa adanya
  if (n.length < 10 || n.length > 15) return null;
  return n;
}
