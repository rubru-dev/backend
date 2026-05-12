"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Eye } from "lucide-react";

const PACKAGES = {
  "Paket Desain Basic": {
    timeline: "3 Hari",
    price: 2500000,
    details: ["Layout 2D - 2 View", "Desain 3D - 1 View", "RAB"],
  },
  "Paket Desain Standart": {
    timeline: "7 - 14 Hari",
    price: 6800000,
    details: ["Layout 2D - 2 View", "Desain 3D - 7 View", "Gambar Kerja 2D - 11 View", "RAB"],
  },
  "Paket Desain Premium": {
    timeline: "14 - 21 Hari",
    price: 8500000,
    details: ["Layout 2D - 2 View", "Desain 3D - 16 View", "Gambar Kerja 2D - 21 View", "RAB"],
  },
  "Paket Desain Deluxe": {
    timeline: "18 - 26 Hari",
    price: 15800000,
    details: ["Layout 2D - 2 View", "Desain 3D - 18 View", "Gambar Kerja 2D - 30 View", "RAB"],
  },
} as const;

const IDR = (n: number) => `Rp. ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;

function rawClientName(c: any) {
  const raw = String(c?.nama ?? "").trim();
  return raw.replace(/^(Mr|Mrs)\.?\s+/i, "").trim();
}

function formatDateID(date: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function PenawaranDesainPage() {
  const [clientId, setClientId] = useState("");
  const [salutation, setSalutation] = useState<"Mr" | "Mrs">("Mr");
  const [roId, setRoId] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [paketName, setPaketName] = useState<keyof typeof PACKAGES>("Paket Desain Basic");
  const [showPreview, setShowPreview] = useState(true);

  const { data } = useQuery({
    queryKey: ["penawaran-desain-clients"],
    queryFn: () => apiClient.get("/bd/sales-admin/leads", { params: { limit: 10000 } }).then((r) => r.data),
  });
  const { data: employees = [] } = useQuery<{ id: string; nama: string }[]>({
    queryKey: ["penawaran-desain-employees"],
    queryFn: () => apiClient.get("/desain/employees").then((r) => r.data),
  });

  const clients = [...(Array.isArray(data) ? data : data?.items ?? [])].sort((a: any, b: any) =>
    (rawClientName(a) || String(a?.nama ?? "")).localeCompare(rawClientName(b) || String(b?.nama ?? ""), "id", {
      sensitivity: "base",
    })
  );
  const client = clients.find((c: any) => String(c.id) === clientId) ?? clients[0];
  const selectedRo = employees.find((e) => String(e.id) === roId);
  const pkg = PACKAGES[paketName];
  const namaAsli = client ? rawClientName(client) : "[Nama Client]";
  const name = client ? `${salutation} ${namaAsli}` : "Mr/Mrs [Nama Client]";

  const detailRows = useMemo(() => pkg.details.map((d) => <li key={d}>{d}</li>), [pkg]);

  function downloadPdf() {
    setShowPreview(true);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  return (
    <div className="p-6 space-y-5">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 18mm; }
          aside, header, .print\\:hidden { display: none !important; }
          body { background: #fff !important; }
          .offer-page { box-shadow: none !important; border: 0 !important; margin: 0 !important; width: 100% !important; }
        }
      `}</style>

      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Penawaran Desain</h1>
          <p className="text-sm text-muted-foreground">Pilih client, tanggal, dan paket desain untuk membuat lampiran PDF.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview((v) => !v)}><Eye className="h-4 w-4 mr-2" /> Preview</Button>
          <Button onClick={downloadPdf}><Download className="h-4 w-4 mr-2" /> Download PDF</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-3 rounded-lg border bg-white p-4 print:hidden">
        <div>
          <Label>Nama Client</Label>
          <Select value={clientId || String(client?.id ?? "")} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Pilih client" /></SelectTrigger>
            <SelectContent>
              {clients.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{rawClientName(c) || c.nama}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={namaAsli} readOnly className="mt-2 bg-slate-50" aria-label="Nama asli client" />
        </div>
        <div>
          <Label>Salutation</Label>
          <Select value={salutation} onValueChange={(v) => setSalutation(v as "Mr" | "Mrs")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Mr">Mr</SelectItem>
              <SelectItem value="Mrs">Mrs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tanggal/Bulan/Tahun</Label>
          <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div>
          <Label>Nama RO</Label>
          <Select value={roId || "__none__"} onValueChange={(v) => setRoId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Pilih RO" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Pilih RO</SelectItem>
              {employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nama Paket Desain</Label>
          <Select value={paketName} onValueChange={(v) => setPaketName(v as keyof typeof PACKAGES)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(PACKAGES).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showPreview && (
        <div className="offer-page mx-auto max-w-[794px] min-h-[1123px] border bg-white p-10 shadow-sm font-serif text-[15px] leading-7 text-black">
          <div className="mb-8 border-b-2 border-black pb-4 font-sans">
            <div className="flex items-start gap-4">
              <img src="/images/logo.png" alt="Rubah Rumah" className="h-20 w-20 object-contain" />
              <div className="pt-1">
                <p className="text-xl font-bold leading-tight">PT. Rubah Rumah</p>
                <p className="text-xl font-bold leading-tight">Inovasi Pemuda</p>
                <p className="mt-2 text-[12px] leading-5">Jl. Pandu II No. 420, Kel. Sepanjang Jaya, Kec. Rawalumbu, Kota Bekasi, Jawa Barat</p>
                <p className="text-[12px] leading-5">Telp: +62 813-7640-5550</p>
                <p className="text-[12px] leading-5">Website: rubahrumah.com</p>
              </div>
            </div>
          </div>

          <h2 className="text-center font-bold text-lg mb-5">FORM PENAWARAN JASA DESAIN</h2>
          <p>Lampiran :</p>
          <p className="ml-8 mb-5">Denah Eksisting dan Perubahan</p>

          <div className="mb-5">
            <p>Kepada Yth.</p>
            <p>{name}</p>
            <p>Di tempat</p>
          </div>

          <p>Dengan Hormat,</p>
          <p className="text-justify">
            Berdasarkan hasil survey lokasi yang telah dilakukan oleh tim PT. Rubah Rumah Inovasi Pemuda dengan maksimal 1x Revisi, bersama ini kami menyampaikan penawaran jasa desain untuk kebutuhan Renovasi Rumah milik {name}.
          </p>
          <p className="text-justify mt-3">
            Penawaran ini dibuat sebagai tahap awal perencanaan agar desain yang dihasilkan sesuai dengan kondisi lapangan, kebutuhan ruang, serta estimasi pekerjaan yang akan dilakukan.
          </p>
          <p className="mt-3">Adapun rincian penawaran jasa desain adalah sebagai berikut:</p>

          <table className="my-4 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-black p-2 text-left">Keterangan</th>
                <th className="border border-black p-2 text-left">Estimasi Pengerjaan</th>
                <th className="border border-black p-2 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2">Jasa Desain {paketName}</td>
                <td className="border border-black p-2">{pkg.timeline}</td>
                <td className="border border-black p-2 text-right">{IDR(pkg.price)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold" colSpan={2}>Total</td>
                <td className="border border-black p-2 text-right font-bold">{IDR(pkg.price)}</td>
              </tr>
            </tbody>
          </table>

          <p>Keterangan Paket Desain {paketName} :</p>
          <ul className="ml-8 list-disc">{detailRows}</ul>

          <p className="mt-5 text-justify">
            Demikian form penawaran ini kami sampaikan. Besar harapan kami dapat membantu {name} dalam mewujudkan desain hunian yang nyaman, fungsional, dan sesuai kebutuhan.
          </p>
          <p>Atas perhatian dan kepercayaannya, kami ucapkan terima kasih.</p>
          <p className="mt-4">Bekasi, {formatDateID(tanggal)}</p>

          <div className="mt-6 w-1/2">
            <p className="font-bold">Hormat Kami,</p>
            <p className="font-bold">PT. RUBAH RUMAH INOVASI PEMUDA</p>
            <div className="h-28" />
            <p className="font-bold">{selectedRo?.nama || "[Nama RO]"}</p>
          </div>
          <div className="mt-10 border-t pt-2 text-center text-xs font-sans">
            PT. Rubah Rumah Inovasi Pemuda
          </div>
        </div>
      )}
    </div>
  );
}
