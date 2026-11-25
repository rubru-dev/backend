"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { projectStockApi } from "@/lib/api/projectStock";
import { getLogoBase64 } from "@/lib/get-logo";
import { Button } from "@/components/ui/button";

function safeFilePart(value: unknown, fallback: string, maxLength = 80) {
  const safe = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return safe || fallback;
}

function jakartaDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(validDate);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}`;
}

function pbFilename(pb: any) {
  const number = safeFilePart(pb.nomor_pb, `PB-${pb.id}`, 40);
  const type = pb.project_type === "interior" ? "Interior" : "Sipil";
  const project = safeFilePart(pb.project_name, `Proyek-${pb.project_id}`);
  const date = jakartaDate(pb.submitted_at ?? pb.created_at);
  return `${number}-${type}-${project}-${date}.pdf`;
}

export function PBExportButton({ pbId, pbNumber, className }: { pbId: string; pbNumber?: string | null; className?: string }) {
  const [exporting, setExporting] = useState(false);

  async function exportPDF() {
    if (exporting) return;
    setExporting(true);
    try {
      const [pb, logoUrl, renderer, pdfModule] = await Promise.all([
        projectStockApi.getPB(pbId),
        getLogoBase64(),
        import("@react-pdf/renderer"),
        import("@/components/pb-pdf"),
      ]);
      const blob = await renderer.pdf(<pdfModule.PBPDF data={pb} logoUrl={logoUrl} />).toBlob();
      saveAs(blob, pbFilename(pb));
      toast.success(`PDF ${pb.nomor_pb || pbNumber || "PB"} berhasil dibuat`);
    } catch (error: any) {
      console.error("PB PDF export failed", error);
      toast.error(error?.response?.data?.detail || error?.message || "PDF PB gagal dibuat");
    } finally {
      setExporting(false);
    }
  }

  return <Button
    type="button"
    variant="outline"
    size="sm"
    className={`min-h-11 gap-1.5 ${className ?? ""}`}
    disabled={exporting}
    aria-busy={exporting}
    aria-label={`Ekspor PDF ${pbNumber || "PB"}`}
    onClick={exportPDF}
  >
    {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <FileDown className="h-3.5 w-3.5" aria-hidden="true" />}
    {exporting ? "Membuat PDF..." : "PDF"}
  </Button>;
}
