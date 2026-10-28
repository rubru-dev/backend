import { notFound } from "next/navigation";
import { BeritaAcaraEditor } from "@/components/berita-acara-penawaran";
import type { PenawaranType } from "@/lib/api/penawaran";

const VALID_TYPES = new Set<PenawaranType>(["rubru", "rkr"]);

export default function BeritaAcaraDetailPage({
  params,
  searchParams,
}: {
  params: { type: string; id: string };
  searchParams: { sourceOfferId?: string };
}) {
  if (!VALID_TYPES.has(params.type as PenawaranType)) notFound();

  return (
    <BeritaAcaraEditor
      type={params.type as PenawaranType}
      recordId={params.id}
      sourceOfferId={searchParams.sourceOfferId ?? ""}
    />
  );
}
