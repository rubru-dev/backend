import { BeritaAcaraPenawaran } from "@/components/berita-acara-penawaran";
import type { PenawaranType } from "@/lib/api/penawaran";

const UNITS: Array<{ type: PenawaranType; name: string; description: string }> = [
  { type: "rubru", name: "Rubah Rumah", description: "Berita Acara pekerjaan dan layanan Rubah Rumah." },
  { type: "rkr", name: "Ruangkeruang", description: "Berita Acara pekerjaan dan layanan Ruangkeruang." },
  { type: "desain", name: "Desain", description: "Berita Acara konsultasi dan paket desain." },
];

export default function BeritaAcaraPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Berita Acara</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buat dokumen mandiri atau kelola Berita Acara yang berasal dari penawaran.
        </p>
      </header>

      <section className="overflow-hidden rounded-lg border bg-background" aria-label="Kelompok Berita Acara">
        {UNITS.map((unit, index) => (
          <div
            key={unit.type}
            className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between ${index ? "border-t" : ""}`}
          >
            <div>
              <h2 className="font-semibold">{unit.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{unit.description}</p>
            </div>
            <BeritaAcaraPenawaran type={unit.type} showAll />
          </div>
        ))}
      </section>

      <p className="text-sm text-muted-foreground">
        Untuk menghubungkan dokumen dengan penawaran tertentu, gunakan tombol Berita Acara pada baris List Penawaran.
      </p>
    </div>
  );
}
