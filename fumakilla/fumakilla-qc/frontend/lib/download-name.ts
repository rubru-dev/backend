/**
 * Membuat nama file unduhan yang konsisten & bermakna di seluruh aplikasi.
 *
 * Pola: "{Jenis Dokumen} - {Klien} - {Info} - {DD-MM-YYYY}.{ext}"
 * Bagian klien / info bersifat opsional (dilewati jika kosong).
 *
 * Contoh:
 *   downloadName({ doc: "Quotation", client: "PT Maju Jaya", info: "QT-2026-001", ext: "pdf" })
 *     -> "Quotation - PT Maju Jaya - QT-2026-001 - 16-07-2026.pdf"
 *   downloadName({ doc: "Kalender Survey", info: "Juli 2026", ext: "pdf" })
 *     -> "Kalender Survey - Juli 2026 - 16-07-2026.pdf"
 */

// Hilangkan karakter ilegal di nama file, rapikan spasi/pemisah ganda.
function clean(v: unknown): string {
  return String(v ?? "")
    .replace(/[\/\\:*?"<>|]+/g, " ")   // karakter terlarang di Windows/umum
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Tanggal unduh dalam format DD-MM-YYYY (waktu lokal).
export function todayDMY(d: Date = new Date()): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function downloadName(opts: {
  doc: string;                // jenis dokumen — WAJIB (mis. "Invoice", "Report B2B")
  client?: string | null;     // nama klien / customer
  info?: string | null;       // info tambahan (nomor dokumen, periode, dsb.)
  ext: string;                // ekstensi tanpa titik: "pdf" | "png" | "pptx"
  date?: Date;                // override tanggal (default: hari ini)
}): string {
  const parts = [opts.doc, opts.client, opts.info]
    .map(clean)
    .filter(Boolean);
  parts.push(todayDMY(opts.date));
  const base = parts.join(" - ") || "Dokumen";
  const ext = clean(opts.ext).replace(/^\.+/, "").toLowerCase() || "file";
  return `${base}.${ext}`;
}
