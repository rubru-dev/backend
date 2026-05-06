export function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const typeLabel: Record<string, string> = {
  RAW_MATERIAL: "Bahan Baku",
  IN_PROCESS: "In-Process",
  FINISHED_GOODS: "Finished Goods",
};

export const categoryLabel: Record<string, string> = {
  COA: "COA",
  LABEL: "Label",
  LAB_RESULT: "Hasil Lab",
  INSPECTION_FORM: "Form Inspeksi",
  OTHER: "Lainnya",
  SOP: "SOP",
  QUALITY_STANDARD: "Standar Mutu",
  PRODUCT_SPEC: "Spesifikasi Produk",
  WORK_INSTRUCTION: "Instruksi Kerja",
  FORM_TEMPLATE: "Template Form",
};

export function cls(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}
