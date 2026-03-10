"use client";

import React, { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { sipilApi, type RappApi } from "@/lib/api/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Save, X, FileDown, Upload, Loader2, Info } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type MaterialItem = {
  id: string;
  material: string;
  vol: number;
  sat: string | null;
  harga_satuan: number;
  jumlah: number;
  urutan: number;
};

type MaterialKategori = {
  id: string;
  kode: string | null;
  nama: string;
  urutan: number;
  items: MaterialItem[];
};

type SipilItem = {
  id: string;
  nama: string;
  vol: number | null;
  sat: string | null;
  harga_satuan: number | null;
  keterangan: string | null;
  jumlah: number;
  urutan: number;
};

type VendorItem = {
  id: string;
  nama: string;
  vol: number;
  sat: string | null;
  harga_satuan: number;
  jumlah: number;
  urutan: number;
};

type VendorKategori = {
  id: string;
  nama: string;
  urutan: number;
  items: VendorItem[];
};

type RappData = {
  id: string;
  rab: number;
  material_kategoris: MaterialKategori[];
  sipil_items: SipilItem[];
  vendor_kategoris: VendorKategori[];
};

type TerminInfo = { id: string; urutan: number; nama: string | null };

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID", { minimumFractionDigits: 0 });
}

function fmtNum(n: number) {
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("id-ID", { maximumFractionDigits: 4 });
}

// ── Inline edit row for material/vendor items ─────────────────────────────────
function MaterialItemRow({
  item,
  no,
  onUpdate,
  onDelete,
}: {
  item: MaterialItem | VendorItem;
  no: number;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    material: (item as MaterialItem).material ?? (item as VendorItem).nama ?? "",
    vol: String(item.vol),
    sat: item.sat ?? "",
    harga_satuan: String(item.harga_satuan),
  });
  const [saving, setSaving] = useState(false);

  const nama = (item as MaterialItem).material ?? (item as VendorItem).nama;

  async function save() {
    setSaving(true);
    try {
      await onUpdate(item.id, {
        material: form.material,
        nama: form.material,
        vol: form.vol,
        sat: form.sat || null,
        harga_satuan: form.harga_satuan,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    const vol = parseFloat(form.vol) || 0;
    const harga = parseFloat(form.harga_satuan) || 0;
    const jumlah = vol * harga;
    return (
      <TableRow className="bg-yellow-50">
        <TableCell className="pl-6 text-muted-foreground text-sm">{no}</TableCell>
        <TableCell>
          <Input className="h-7 text-sm" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} autoFocus />
        </TableCell>
        <TableCell>
          <Input className="h-7 text-sm w-20" type="number" value={form.vol} onChange={(e) => setForm({ ...form, vol: e.target.value })} />
        </TableCell>
        <TableCell>
          <Input className="h-7 text-sm w-20" value={form.sat} onChange={(e) => setForm({ ...form, sat: e.target.value })} />
        </TableCell>
        <TableCell>
          <Input className="h-7 text-sm w-32" type="number" value={form.harga_satuan} onChange={(e) => setForm({ ...form, harga_satuan: e.target.value })} />
        </TableCell>
        <TableCell className="text-right font-medium">{fmtRp(jumlah)}</TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" disabled={saving} onClick={save}><Save className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="pl-6 text-muted-foreground text-sm">{no}</TableCell>
      <TableCell>{nama}</TableCell>
      <TableCell>{fmtNum(item.vol)}</TableCell>
      <TableCell>{item.sat ?? "—"}</TableCell>
      <TableCell>{fmtRp(item.harga_satuan)}</TableCell>
      <TableCell className="text-right font-medium">{fmtRp(item.jumlah)}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setForm({ material: nama, vol: String(item.vol), sat: item.sat ?? "", harga_satuan: String(item.harga_satuan) }); setEditing(true); }}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Inline edit row for sipil items ──────────────────────────────────────────
function SipilItemRow({
  item,
  no,
  onUpdate,
  onDelete,
}: {
  item: SipilItem;
  no: number;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nama: item.nama,
    vol: item.vol !== null ? String(item.vol) : "",
    sat: item.sat ?? "",
    harga_satuan: item.harga_satuan !== null ? String(item.harga_satuan) : "",
    keterangan: item.keterangan ?? "",
    jumlah: String(item.jumlah),
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const vol = form.vol ? parseFloat(form.vol) : null;
      const harga = form.harga_satuan ? parseFloat(form.harga_satuan) : null;
      const jumlah = form.jumlah ? parseFloat(form.jumlah) : (vol !== null && harga !== null ? vol * harga : 0);
      await onUpdate(item.id, {
        nama: form.nama,
        vol,
        sat: form.sat || null,
        harga_satuan: harga,
        keterangan: form.keterangan || null,
        jumlah,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    const vol = form.vol ? parseFloat(form.vol) : null;
    const harga = form.harga_satuan ? parseFloat(form.harga_satuan) : null;
    const autoJumlah = vol !== null && harga !== null ? vol * harga : null;
    return (
      <TableRow className="bg-yellow-50">
        <TableCell className="pl-4 text-muted-foreground font-medium text-sm">{no}</TableCell>
        <TableCell>
          <Input className="h-7 text-sm" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} autoFocus />
        </TableCell>
        <TableCell>
          <Input className="h-7 text-sm w-20" type="number" value={form.vol} placeholder="—" onChange={(e) => setForm({ ...form, vol: e.target.value })} />
        </TableCell>
        <TableCell>
          <Input className="h-7 text-sm w-20" value={form.sat} placeholder="—" onChange={(e) => setForm({ ...form, sat: e.target.value })} />
        </TableCell>
        <TableCell>
          <Input className="h-7 text-sm w-32" type="number" value={form.harga_satuan} placeholder="—" onChange={(e) => setForm({ ...form, harga_satuan: e.target.value })} />
        </TableCell>
        <TableCell>
          <Input className="h-7 text-sm w-40" value={form.keterangan} placeholder="Keterangan (opsional)" onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
        </TableCell>
        <TableCell>
          <Input
            className="h-7 text-sm w-32"
            type="number"
            value={autoJumlah !== null ? String(autoJumlah) : form.jumlah}
            placeholder="Jumlah"
            onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
          />
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" disabled={saving} onClick={save}><Save className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="pl-4 text-muted-foreground font-medium text-sm">{no}</TableCell>
      <TableCell className="font-medium">{item.nama}</TableCell>
      <TableCell>{item.vol !== null ? fmtNum(item.vol) : "—"}</TableCell>
      <TableCell>{item.sat ?? "—"}</TableCell>
      <TableCell>{item.harga_satuan !== null ? fmtRp(item.harga_satuan) : "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{item.keterangan ?? "—"}</TableCell>
      <TableCell className="text-right font-semibold">{fmtRp(item.jumlah)}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
            setForm({ nama: item.nama, vol: item.vol !== null ? String(item.vol) : "", sat: item.sat ?? "", harga_satuan: item.harga_satuan !== null ? String(item.harga_satuan) : "", keterangan: item.keterangan ?? "", jumlah: String(item.jumlah) });
            setEditing(true);
          }}><Pencil className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Add Item Dialog ───────────────────────────────────────────────────────────
type FormRow = { nama: string; vol: string; sat: string; harga_satuan: string; keterangan: string; jumlah: string };
const emptyRow = (): FormRow => ({ nama: "", vol: "", sat: "", harga_satuan: "", keterangan: "", jumlah: "" });

function AddItemDialog({
  open,
  onClose,
  onAdd,
  type,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (items: any[]) => Promise<void>;
  type: "material" | "vendor" | "sipil";
}) {
  const [rows, setRows] = useState<FormRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) setRows([emptyRow()]);
  }, [open]);

  function updateRow(idx: number, field: keyof FormRow, value: string) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function addRow() { setRows((prev) => [...prev, emptyRow()]); }
  function removeRow(idx: number) { setRows((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleAdd() {
    const validRows = rows.filter((r) => r.nama.trim());
    if (!validRows.length) return;
    setSaving(true);
    try {
      const items = validRows.map((row) => {
        if (type === "sipil") {
          const volN = row.vol ? parseFloat(row.vol) : null;
          const hargaN = row.harga_satuan ? parseFloat(row.harga_satuan) : null;
          const autoJ = volN !== null && hargaN !== null ? volN * hargaN : 0;
          const jumlahN = row.jumlah ? parseFloat(row.jumlah) : autoJ;
          return { nama: row.nama, vol: volN, sat: row.sat || null, harga_satuan: hargaN, keterangan: row.keterangan || null, jumlah: jumlahN };
        } else {
          return { material: row.nama, nama: row.nama, vol: row.vol, sat: row.sat || null, harga_satuan: row.harga_satuan };
        }
      });
      await onAdd(items);
    } finally {
      setSaving(false);
    }
  }

  const isSipil = type === "sipil";
  const validCount = rows.filter((r) => r.nama.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={isSipil ? "max-w-4xl" : "max-w-3xl"}>
        <DialogHeader>
          <DialogTitle>{isSipil ? "Tambah Item RAPP Sipil" : "Tambah Material"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 pr-2 font-medium text-muted-foreground">{isSipil ? "Nama Item" : "Nama Material"} *</th>
                  <th className="text-left pb-2 pr-2 font-medium text-muted-foreground w-20">Vol</th>
                  <th className="text-left pb-2 pr-2 font-medium text-muted-foreground w-20">Satuan</th>
                  <th className="text-left pb-2 pr-2 font-medium text-muted-foreground w-32">Harga Satuan</th>
                  {isSipil && <th className="text-left pb-2 pr-2 font-medium text-muted-foreground w-32">Keterangan</th>}
                  {isSipil && <th className="text-left pb-2 pr-2 font-medium text-muted-foreground w-28">Jumlah (Rp)</th>}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const vol = parseFloat(row.vol) || 0;
                  const harga = parseFloat(row.harga_satuan) || 0;
                  const autoJumlah = vol * harga;
                  return (
                    <tr key={idx} className="border-b border-dashed last:border-0">
                      <td className="py-1 pr-2">
                        <Input
                          className="h-7 text-sm"
                          value={row.nama}
                          onChange={(e) => updateRow(idx, "nama", e.target.value)}
                          placeholder={isSipil ? "e.g. Buang Puing" : "e.g. Besi 10 Polos"}
                          autoFocus={idx === 0}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <Input className="h-7 text-sm" type="number" value={row.vol} onChange={(e) => updateRow(idx, "vol", e.target.value)} placeholder="0" />
                      </td>
                      <td className="py-1 pr-2">
                        <Input className="h-7 text-sm" value={row.sat} onChange={(e) => updateRow(idx, "sat", e.target.value)} placeholder="bh/m2..." />
                      </td>
                      <td className="py-1 pr-2">
                        <Input className="h-7 text-sm" type="number" value={row.harga_satuan} onChange={(e) => updateRow(idx, "harga_satuan", e.target.value)} placeholder="0" />
                      </td>
                      {isSipil && (
                        <td className="py-1 pr-2">
                          <Input className="h-7 text-sm" value={row.keterangan} onChange={(e) => updateRow(idx, "keterangan", e.target.value)} placeholder="opsional" />
                        </td>
                      )}
                      {isSipil && (
                        <td className="py-1 pr-2">
                          <Input
                            className="h-7 text-sm"
                            type="number"
                            value={autoJumlah > 0 ? String(autoJumlah) : row.jumlah}
                            onChange={(e) => updateRow(idx, "jumlah", e.target.value)}
                            placeholder="vol × harga"
                          />
                        </td>
                      )}
                      <td className="py-1">
                        {rows.length > 1 && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeRow(idx)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Tambah Baris
          </Button>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handleAdd} disabled={validCount === 0 || saving}>
              {saving ? "Menyimpan..." : validCount > 1 ? `Simpan (${validCount} item)` : "Simpan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Excel helpers ─────────────────────────────────────────────────────────────
// Template layout mirrors the PDF: NO | MATERIAL | VOL | SAT | HARGA SATUAN
// - Category rows : NO = huruf kapital (A, B, K, …), kolom lain kosong
// - Item rows     : NO = angka, isi lengkap
function buildExcelTemplate(): Blob {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Material ──────────────────────────────────────────────────────
  const matData: (string | number)[][] = [
    ["NO", "MATERIAL", "VOL", "SAT", "HARGA SATUAN"],
    // Category row → NO berupa huruf kapital, kolom lain kosong
    ["A", "PEKERJAAN STRUKTUR", "", "", ""],
    [1, "Cakar Ayam 80x80", 10, "bh", 380000],
    [2, "Besi 8 Polos", 88.82, "btg", 110000],
    [3, "Semen Gresik", 134, "zak", 65000],
    [4, "Pasir Cor", 9, "m3", 550000],
    // Category row berikutnya
    ["K", "ALAT PENUNJANG PEKERJAAN", "", "", ""],
    [1, "Terpal", 2, "lembar", 130000],
    [2, "Benang", 10, "roll", 10000],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matData), "Material");

  // ── Sheet 2: RAPP Sipil ────────────────────────────────────────────────────
  // Kolom KETERANGAN diisi untuk baris deskriptif (mis. RAPP BORONG TENAGA)
  const sipilData: (string | number)[][] = [
    ["NO", "NAMA", "VOL", "SAT", "HARGA SATUAN", "KETERANGAN"],
    [1, "Buang Puing Bangunan", 5, "rit", 350000, ""],
    [2, "Mobilisasi dan Demobilisasi Alat", 1, "ls", 3000000, ""],
    [3, "Material Cadangan", 1, "ls", 2000000, ""],
    [4, "rapp tenaga pic", 45, "Hari", 130000, ""],
    [5, "RAPP BORONG TENAGA", 45, "Hari", 800000, "3 Tukang 2 Kenek"],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sipilData), "RAPP Sipil");

  // ── Sheet 3: Vendor ────────────────────────────────────────────────────────
  const vendorData: (string | number)[][] = [
    ["KATEGORI", "NAMA", "VOL", "SAT", "HARGA SATUAN"],
    ["PEKERJAAN PINTU", "Pintu kayu 80x200", 3, "unit", 2500000],
    ["PEKERJAAN JENDELA", "Jendela aluminum 60x120", 5, "unit", 1800000],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vendorData), "Vendor");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function parseExcelFile(buf: ArrayBuffer): {
  materialGroups: Array<{ kode: string | null; nama: string; items: Array<{ material: string; vol: number; sat: string | null; harga_satuan: number }> }>;
  sipilRows: Array<{ nama: string; vol: number | null; sat: string | null; harga_satuan: number | null; keterangan: string | null }>;
  vendorGroups: Array<{ nama: string; items: Array<{ nama: string; vol: number; sat: string | null; harga_satuan: number }> }>;
} {
  const wb = XLSX.read(buf, { type: "array" });

  type MatGroup = { kode: string | null; nama: string; items: Array<{ material: string; vol: number; sat: string | null; harga_satuan: number }> };
  type VenGroup = { nama: string; items: Array<{ nama: string; vol: number; sat: string | null; harga_satuan: number }> };

  const materialGroups: MatGroup[] = [];
  const sipilRows: Array<{ nama: string; vol: number | null; sat: string | null; harga_satuan: number | null; keterangan: string | null }> = [];
  const vendorGroups: VenGroup[] = [];
  const venGroupKeys: string[] = [];

  const str = (v: unknown) => (v !== undefined && v !== null ? String(v).trim() : "");
  const num = (v: unknown) => { const n = parseFloat(str(v).replace(/,/g, ".")); return isNaN(n) ? null : n; };

  // ── Sheet "Material": NO | MATERIAL | VOL | SAT | HARGA SATUAN ─────────────
  // Category row: NO = single/double uppercase letter (A, B, K, AA…), VOL & HARGA empty
  // Item row    : NO = angka, MATERIAL = nama item
  const matSheet = wb.Sheets["Material"] ?? wb.Sheets[wb.SheetNames[0]];
  if (matSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(matSheet, { header: 1, defval: "" });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const no   = str(r[0]);
      const col1 = str(r[1]);
      if (!no && !col1) continue; // skip empty rows

      // Category row: NO berupa huruf kapital (A, B, K, A., K. dll), tanpa angka vol/harga
      const isCat = /^[A-Z]{1,3}\.?$/i.test(no) && !num(r[2]) && !num(r[4]);
      if (isCat) {
        materialGroups.push({
          kode: no.replace(/\./g, "").toUpperCase(),
          nama: col1 || "Kategori Material",
          items: [],
        });
      } else if (col1 && materialGroups.length > 0) {
        // Item row — tambahkan ke kategori terakhir
        materialGroups[materialGroups.length - 1].items.push({
          material: col1,
          vol: num(r[2]) ?? 0,
          sat: str(r[3]) || null,
          harga_satuan: num(r[4]) ?? 0,
        });
      }
    }
  }

  // ── Sheet "RAPP Sipil": NO | NAMA | VOL | SAT | HARGA SATUAN | KETERANGAN ──
  const sipilSheet = wb.Sheets["RAPP Sipil"] ?? wb.Sheets[wb.SheetNames[1]];
  if (sipilSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(sipilSheet, { header: 1, defval: "" });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const nama = str(r[1]); // col B = NAMA (col A = NO)
      if (!nama) continue;
      sipilRows.push({
        nama,
        vol: num(r[2]),
        sat: str(r[3]) || null,
        harga_satuan: num(r[4]),
        keterangan: str(r[5]) || null,
      });
    }
  }

  // ── Sheet "Vendor": KATEGORI | NAMA | VOL | SAT | HARGA SATUAN ────────────
  const venSheet = wb.Sheets["Vendor"] ?? wb.Sheets[wb.SheetNames[2]];
  if (venSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(venSheet, { header: 1, defval: "" });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const kategori = str(r[0]) || "Pekerjaan Vendor";
      const nama = str(r[1]);
      if (!nama) continue;
      let idx = venGroupKeys.indexOf(kategori);
      if (idx === -1) { venGroupKeys.push(kategori); vendorGroups.push({ nama: kategori, items: [] }); idx = vendorGroups.length - 1; }
      vendorGroups[idx].items.push({ nama, vol: num(r[2]) ?? 0, sat: str(r[3]) || null, harga_satuan: num(r[4]) ?? 0 });
    }
  }

  return { materialGroups, sipilRows, vendorGroups };
}

// ── PDF import helper ─────────────────────────────────────────────────────────
// Parses a RAPP template PDF (Termin 1/2/3 Template.pdf format).
//
// Structure of each PDF:
//   1. Material table  : header (NO|MATERIAL|VOL|SAT|HARGA SATUAN|JUMLAH)
//                         → skip "TERMIN X" span row
//                         → category rows (A. PEKERJAAN …) + item rows
//                         → ends at "TOTAL BIAYA MATRIAL BANGUNAN"
//   2. RAPP Sipil       : numbered items after TOTAL BIAYA MATRIAL
//                         → Persiapan: Buang Puing / Mobilisasi / Material Cadangan
//                         → Tenaga   : rapp tenaga pic (has explicit harga/hari)
//                                      RAPP BORONG TENAGA → expanded to Tukang+Kenek rows
//                         → ends at "TOTAL RAPP SIPIL"
//   3. Vendor (opt.)    : new header (NO|PEKERJAAN VENDOR|VOL|SAT|HARGA SATUAN|JUMLAH)
//                         → category rows + item rows + "Jumlah" subtotals (skipped)
//                         → ends at "TOTAL RAPP VENDOR"
async function parsePdfFile(buf: ArrayBuffer): Promise<{
  materialGroups: Array<{ kode: string | null; nama: string; items: Array<{ material: string; vol: number; sat: string | null; harga_satuan: number }> }>;
  sipilRows: Array<{ nama: string; vol: number | null; sat: string | null; harga_satuan: number | null; keterangan: string | null; jumlah?: number }>;
  vendorGroups: Array<{ nama: string; items: Array<{ nama: string; vol: number; sat: string | null; harga_satuan: number }> }>;
}> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;

  // ── Collect all text items (x, y) across all pages ────────────────────────
  const rawItems: { x: number; y: number; text: string }[] = [];
  let yOffset = 0;
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const vp   = page.getViewport({ scale: 1 });
    const ct   = await page.getTextContent();
    for (const item of ct.items) {
      if ("str" in item && item.str.trim()) {
        rawItems.push({
          x: item.transform[4],
          y: yOffset + vp.height - item.transform[5],
          text: item.str.trim(),
        });
      }
    }
    yOffset += vp.height;
  }

  // Sort top→bottom then left→right
  rawItems.sort((a, b) => {
    const dy = a.y - b.y;
    return Math.abs(dy) < 1 ? a.x - b.x : dy;
  });

  // Group into visual rows (±8 pt tolerance)
  type Row = { y: number; items: { x: number; text: string }[] };
  const rows: Row[] = [];
  for (const item of rawItems) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - item.y) <= 8) {
      last.items.push({ x: item.x, text: item.text });
    } else {
      rows.push({ y: item.y, items: [{ x: item.x, text: item.text }] });
    }
  }

  // ── Parse number: "Rp380.000,00" / "88,82" / "1.750.000" ────────────────
  const parseNum = (s: string): number | null => {
    if (!s) return null;
    const clean = s
      .replace(/[Rp\s\u2212\-]/g, "")  // strip Rp, spaces, minus
      .replace(/\./g, "")               // remove thousand-separator dots
      .replace(",", ".");               // decimal comma → dot
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  };

  // ── Detect a header row; returns column x-positions or null ───────────────
  // NOTE: The "MATERIAL" header is centered inside its wide column, so its x-position
  // is NOT the left edge of that column. We track noX separately and use noX+20 as the
  // actual NO/MATERIAL boundary in makeColOf.
  type ColBounds = { noX: number; matX: number; volX: number; satX: number; hargaX: number; jumlahX: number };
  function detectHeader(rows: Row[], startIdx = 0): { idx: number; bounds: ColBounds } | null {
    for (let i = startIdx; i < rows.length; i++) {
      const texts = rows[i].items.map(it => it.text.toUpperCase());
      const joined = texts.join(" ");
      // Require VOL and either MATERIAL or VENDOR in the same row
      if (!joined.includes("VOL")) continue;
      if (!joined.includes("MATERIAL") && !joined.includes("VENDOR")) continue;

      const its       = rows[i].items;
      const noItem    = its.find(it => /^NO\.?$/i.test(it.text));
      const nameItem  = its.find(it => /MATERIAL|VENDOR/i.test(it.text));
      const volItem   = its.find(it => /^VOL$/i.test(it.text));
      const satItem   = its.find(it => /^SAT$/i.test(it.text));
      const hargaItem = its.find(it => /HARGA/i.test(it.text));
      const jumlahItem= its.find(it => /JUMLAH/i.test(it.text));

      if (!nameItem || !volItem) continue;

      const noX     = noItem?.x ?? 20;          // x of the "NO" header cell
      const matX    = nameItem.x;               // x of "MATERIAL"/"PEKERJAAN VENDOR" (centered!)
      const volX    = volItem.x;
      const satX    = satItem?.x    ?? volX + 45;
      const hargaX  = hargaItem?.x  ?? satX  + 50;
      const jumlahX = jumlahItem?.x ?? hargaX + 75;
      return { idx: i, bounds: { noX, matX, volX, satX, hargaX, jumlahX } };
    }
    return null;
  }

  // ── Column resolver ───────────────────────────────────────────────────────
  // Key insight: the MATERIAL column header is CENTERED in its wide column (x≈134),
  // but cell content is LEFT-ALIGNED starting at x≈56. So we use noX+20 as the
  // NO/MATERIAL boundary (right after the narrow NO numbers "1","A."…) rather than
  // matX-5 (which would be 129 and wrongly pull material names into the NO column).
  function makeColOf(b: ColBounds) {
    const noMatBound = b.noX + 20;   // just past "1","2","A.","K." item numbers/codes
    return (x: number): "no" | "material" | "vol" | "sat" | "harga" | "jumlah" => {
      if (x <= noMatBound)    return "no";
      if (x < b.volX   - 5)  return "material";
      if (x < b.satX   - 5)  return "vol";
      if (x < b.hargaX - 5)  return "sat";
      if (x < b.jumlahX - 5) return "harga";
      return "jumlah";
    };
  }

  // ── Find the primary (Material) header ───────────────────────────────────
  const matHeader = detectHeader(rows, 0);
  if (!matHeader) {
    throw new Error(
      "Tidak ditemukan header tabel (NO | MATERIAL | VOL | SAT | HARGA SATUAN | JUMLAH). " +
      "Pastikan format PDF sesuai template RAPP."
    );
  }
  let colOf = makeColOf(matHeader.bounds);

  // ── Main parse loop ───────────────────────────────────────────────────────
  type MatGroup = { kode: string | null; nama: string; items: Array<{ material: string; vol: number; sat: string | null; harga_satuan: number }> };
  type VenGroup = { nama: string; items: Array<{ nama: string; vol: number; sat: string | null; harga_satuan: number }> };
  type SipilRow = { nama: string; vol: number | null; sat: string | null; harga_satuan: number | null; keterangan: string | null; jumlah?: number };

  const materialGroups: MatGroup[] = [];
  const sipilRows: SipilRow[] = [];
  const vendorGroups: VenGroup[] = [];

  type State = "material" | "sipil" | "vendor" | "done";
  let state: State = "material";

  for (let i = matHeader.idx + 1; i < rows.length; i++) {
    const row = rows[i];
    const cols: Record<string, string[]> = { no: [], material: [], vol: [], sat: [], harga: [], jumlah: [] };
    for (const ri of row.items) cols[colOf(ri.x)].push(ri.text);

    const no        = cols.no.join("").trim();
    const material  = cols.material.join(" ").trim();
    const volStr    = cols.vol.join("").trim();
    const sat       = cols.sat.join(" ").trim();
    const hargaStr  = cols.harga.join(" ").trim();
    const jumlahStr = cols.jumlah.join(" ").trim();
    const rowText   = row.items.map(it => it.text).join(" ");
    const fullLine  = `${no} ${material}`.trim();

    if (!rowText.trim()) continue;

    // ── MATERIAL state ──────────────────────────────────────────────────────
    if (state === "material") {
      // Transition to sipil
      if (/TOTAL.*BIAYA/i.test(rowText) || /TOTAL.*MATRI/i.test(rowText)) {
        state = "sipil";
        continue;
      }
      // Skip: TERMIN X span, column header re-prints
      if (/^TERMIN\s+\d+/i.test(fullLine)) continue;
      if (/\bNO\b.*\b(MATERIAL|VOL)\b/i.test(rowText) && !material.match(/^\d/)) continue;

      // Category row: NO = single letter(s) like "A" or "A.", no vol/harga
      if (/^[A-Z]{1,3}\.?$/.test(no) && material && !volStr && !hargaStr) {
        materialGroups.push({ kode: no.replace(/\./g, ""), nama: material, items: [] });

      // Fallback: category encoded as "A. NAMA KATEGORI" all in material column
      } else if (!no && /^[A-Z]{1,3}[.\s]/.test(material) && !volStr && !hargaStr) {
        const m = material.match(/^([A-Z]{1,3})\.?\s+(.+)$/);
        if (m) materialGroups.push({ kode: m[1], nama: m[2].trim(), items: [] });

      // Item row: NO = integer, belongs to last category
      } else if (/^\d+$/.test(no) && material && materialGroups.length > 0) {
        materialGroups[materialGroups.length - 1].items.push({
          material,
          vol:          parseNum(volStr)   ?? 0,
          sat:          sat || null,
          harga_satuan: parseNum(hargaStr) ?? 0,
        });
      }

    // ── SIPIL state ─────────────────────────────────────────────────────────
    } else if (state === "sipil") {
      if (/TOTAL.*RAPP.*SIPIL/i.test(rowText)) { state = "vendor"; continue; }
      if (/^(RAB|Selisih|Margin)\b/i.test(rowText)) { state = "done"; break; }

      if (/^\d+$/.test(no) && material) {
        const hari      = parseNum(volStr);
        const hargaNum  = parseNum(hargaStr);
        const jumlahNum = parseNum(jumlahStr);

        // ── RAPP BORONG TENAGA → expand into individual Tukang + Kenek rows ──
        if (/BORONG\s*TENAGA/i.test(material)) {
          const workerMatch = hargaStr.match(/(\d+)\s*tukang\s*(\d+)\s*kenek/i);
          if (workerMatch) {
            const nTukang = parseInt(workerMatch[1], 10);
            const nKenek  = parseInt(workerMatch[2], 10);
            for (let t = 0; t < nTukang; t++) {
              sipilRows.push({ nama: "Tukang", vol: hari, sat: sat || "Hari", harga_satuan: null, keterangan: null });
            }
            for (let k = 0; k < nKenek; k++) {
              sipilRows.push({ nama: "Kenek", vol: hari, sat: sat || "Hari", harga_satuan: null, keterangan: null });
            }
          } else {
            // Fallback: keep as single item
            sipilRows.push({ nama: material, vol: hari, sat: sat || null, harga_satuan: null, keterangan: hargaStr || null, jumlah: jumlahNum ?? undefined });
          }

        // ── Regular sipil item (Buang Puing / Mobilisasi / Material Cadangan / Tenaga PIC) ──
        } else {
          const hargaIsText = hargaNum === null && hargaStr.length > 0;
          sipilRows.push({
            nama:         material,
            vol:          hari,
            sat:          sat || null,
            harga_satuan: hargaIsText ? null : hargaNum,
            keterangan:   hargaIsText ? hargaStr : null,
            jumlah:       jumlahNum ?? undefined,
          });
        }
      }

    // ── VENDOR state ─────────────────────────────────────────────────────────
    } else if (state === "vendor") {
      // Look for vendor header row first (after TOTAL RAPP SIPIL)
      if (vendorGroups.length === 0 && /VENDOR/i.test(rowText) && /VOL/i.test(rowText)) {
        // Re-detect column bounds from this header
        const venHeader = detectHeader(rows, i);
        if (venHeader && venHeader.idx === i) {
          colOf = makeColOf(venHeader.bounds);
          continue;
        }
      }

      if (/TOTAL.*RAPP.*VENDOR/i.test(rowText)) { state = "done"; break; }
      if (/^(TOTAL|RAB|Selisih|Margin)\b/i.test(rowText)) { state = "done"; break; }

      // Skip subtotal "Jumlah" rows (they can appear in any column depending on layout)
      if (/\bJumlah\b/i.test(rowText) && !/^\d+$/.test(no)) continue;

      // Category row: NO = letter code
      if (/^[A-Z]{1,3}\.?$/.test(no) && material && !volStr && !hargaStr) {
        vendorGroups.push({ nama: material, items: [] });

      } else if (!no && /^[A-Z]{1,3}[.\s]/.test(material) && !volStr && !hargaStr) {
        const m = material.match(/^([A-Z]{1,3})\.?\s+(.+)$/);
        if (m) vendorGroups.push({ nama: m[2].trim(), items: [] });

      // Item row
      } else if (/^\d+$/.test(no) && material && vendorGroups.length > 0) {
        vendorGroups[vendorGroups.length - 1].items.push({
          nama:         material,
          vol:          parseNum(volStr)   ?? 0,
          sat:          sat || null,
          harga_satuan: parseNum(hargaStr) ?? 0,
        });
      }
    } else {
      break;
    }
  }

  if (materialGroups.length === 0 && sipilRows.length === 0) {
    throw new Error(
      "Tidak ada data yang berhasil dibaca dari PDF. " +
      "Pastikan format PDF sesuai template RAPP (header NO | MATERIAL | VOL | SAT | HARGA SATUAN | JUMLAH harus ada)."
    );
  }

  return { materialGroups, sipilRows, vendorGroups };
}

// ── Main RAPP View ────────────────────────────────────────────────────────────
export function RappSipilView({
  termins,
  projekNama,
  projekLokasi,
  api = sipilApi,
}: {
  termins: TerminInfo[];
  projekNama: string | null;
  projekLokasi: string | null;
  api?: RappApi;
}) {
  const qc = useQueryClient();
  const [selectedTerminId, setSelectedTerminId] = useState<string>(termins[0]?.id ?? "");
  const [collapsedKategoris, setCollapsedKategoris] = useState<Record<string, boolean>>({});

  // Dialogs
  const [addKategoriDialog, setAddKategoriDialog] = useState<"material" | "vendor" | null>(null);
  const [addKategoriNama, setAddKategoriNama] = useState("");
  const [addKategoriKode, setAddKategoriKode] = useState("");
  const [editKategoriId, setEditKategoriId] = useState<string | null>(null);
  const [editKategoriNama, setEditKategoriNama] = useState("");
  const [editKategoriKode, setEditKategoriKode] = useState("");

  const [addItemDialog, setAddItemDialog] = useState<{ type: "material" | "vendor" | "sipil"; targetId: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; label: string } | null>(null);

  // RAB inline edit
  const [editingRab, setEditingRab] = useState(false);
  const [rabInput, setRabInput] = useState("");

  // PDF export + Excel/PDF import
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [pdfImportLoading, setPdfImportLoading] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const pdfImportRef = useRef<HTMLInputElement>(null);

  const rKey = ["sipil-rapp", selectedTerminId];

  const { data: rapp, isLoading } = useQuery<RappData>({
    queryKey: rKey,
    queryFn: () => api.getRapp(selectedTerminId),
    enabled: !!selectedTerminId,
    retry: false,
  });

  function inv() { qc.invalidateQueries({ queryKey: rKey }); }

  // ── Mutations ──
  const updTerminRab = useMutation({
    mutationFn: ({ terminId, rab }: { terminId: string; rab: number }) => api.updateTermin(terminId, { rab }),
    onSuccess: () => { inv(); setEditingRab(false); toast.success("RAB diupdate"); },
    onError: () => toast.error("Gagal update RAB"),
  });

  const addMatKat = useMutation({
    mutationFn: (data: any) => api.addMaterialKategori(selectedTerminId, data),
    onSuccess: () => { inv(); setAddKategoriDialog(null); setAddKategoriNama(""); setAddKategoriKode(""); toast.success("Kategori ditambahkan"); },
    onError: () => toast.error("Gagal"),
  });
  const updMatKat = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateMaterialKategori(id, data),
    onSuccess: () => { inv(); setEditKategoriId(null); },
    onError: () => toast.error("Gagal"),
  });
  const delMatKat = useMutation({
    mutationFn: (id: string) => api.deleteMaterialKategori(id),
    onSuccess: () => { inv(); setDeleteConfirm(null); toast.success("Kategori dihapus"); },
    onError: () => toast.error("Gagal"),
  });

  const addMatItem = useMutation({
    mutationFn: ({ kategoriId, data }: { kategoriId: string; data: any }) => api.addMaterialItem(kategoriId, data),
    onSuccess: () => { inv(); setAddItemDialog(null); toast.success("Item ditambahkan"); },
    onError: () => toast.error("Gagal"),
  });
  const updMatItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateMaterialItem(id, data),
    onSuccess: () => inv(),
    onError: () => toast.error("Gagal"),
  });
  const delMatItem = useMutation({
    mutationFn: (id: string) => api.deleteMaterialItem(id),
    onSuccess: () => { inv(); setDeleteConfirm(null); toast.success("Item dihapus"); },
    onError: () => toast.error("Gagal"),
  });

  const addSipilItem = useMutation({
    mutationFn: (data: any) => api.addSipilItem(selectedTerminId, data),
    onSuccess: () => { inv(); setAddItemDialog(null); toast.success("Item ditambahkan"); },
    onError: () => toast.error("Gagal"),
  });
  const updSipilItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateSipilItem(id, data),
    onSuccess: () => inv(),
    onError: () => toast.error("Gagal"),
  });
  const delSipilItem = useMutation({
    mutationFn: (id: string) => api.deleteSipilItem(id),
    onSuccess: () => { inv(); setDeleteConfirm(null); toast.success("Item dihapus"); },
    onError: () => toast.error("Gagal"),
  });

  const addVenKat = useMutation({
    mutationFn: (data: any) => api.addVendorKategori(selectedTerminId, data),
    onSuccess: () => { inv(); setAddKategoriDialog(null); setAddKategoriNama(""); toast.success("Kategori vendor ditambahkan"); },
    onError: () => toast.error("Gagal"),
  });
  const updVenKat = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateVendorKategori(id, data),
    onSuccess: () => { inv(); setEditKategoriId(null); },
    onError: () => toast.error("Gagal"),
  });
  const delVenKat = useMutation({
    mutationFn: (id: string) => api.deleteVendorKategori(id),
    onSuccess: () => { inv(); setDeleteConfirm(null); toast.success("Kategori dihapus"); },
    onError: () => toast.error("Gagal"),
  });
  const addVenItem = useMutation({
    mutationFn: ({ kategoriId, data }: { kategoriId: string; data: any }) => api.addVendorItem(kategoriId, data),
    onSuccess: () => { inv(); setAddItemDialog(null); toast.success("Item ditambahkan"); },
    onError: () => toast.error("Gagal"),
  });
  const updVenItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateVendorItem(id, data),
    onSuccess: () => inv(),
    onError: () => toast.error("Gagal"),
  });
  const delVenItem = useMutation({
    mutationFn: (id: string) => api.deleteVendorItem(id),
    onSuccess: () => { inv(); setDeleteConfirm(null); toast.success("Item dihapus"); },
    onError: () => toast.error("Gagal"),
  });

  // ── Computed totals ──
  const totalMaterial = rapp?.material_kategoris.reduce(
    (sum, k) => sum + k.items.reduce((s, i) => s + i.jumlah, 0), 0
  ) ?? 0;
  const totalSipil = (totalMaterial) + (rapp?.sipil_items.reduce((s, i) => s + i.jumlah, 0) ?? 0);
  const totalVendor = rapp?.vendor_kategoris.reduce(
    (sum, k) => sum + k.items.reduce((s, i) => s + i.jumlah, 0), 0
  ) ?? 0;
  const totalRapp = totalSipil + totalVendor;
  const rab = rapp?.rab ?? 0;
  const selisih = rab - totalRapp;
  const margin = rab > 0 ? (selisih / rab) * 100 : 0;

  const selectedTermin = termins.find((t) => t.id === selectedTerminId);

  const toggleKat = (id: string) => setCollapsedKategoris((p) => ({ ...p, [id]: !p[id] }));

  // ── PDF download ──────────────────────────────────────────────────────────
  async function handleDownloadPdf() {
    if (!rapp) return;
    setPdfLoading(true);
    try {
      const totalMat = rapp.material_kategoris.reduce(
        (s, k) => s + k.items.reduce((ss, i) => ss + i.jumlah, 0), 0
      );
      const sipilExtra = rapp.sipil_items.reduce((s, i) => s + i.jumlah, 0);
      const totalSipilRapp = totalMat + sipilExtra;
      const totalVendor = rapp.vendor_kategoris.reduce(
        (s, k) => s + k.items.reduce((ss, i) => ss + i.jumlah, 0), 0
      );
      const totalRapp = totalSipilRapp + totalVendor;
      const rabVal = rapp.rab ?? 0;
      const selisih = rabVal - totalRapp;
      const margin = rabVal > 0 ? (selisih / rabVal) * 100 : 0;

      const pdfData = {
        nama_proyek: projekNama ?? "Proyek",
        lokasi: projekLokasi,
        termins: [{
          nama: selectedTermin?.nama ?? `Termin ${selectedTermin?.urutan}`,
          material_kategoris: rapp.material_kategoris,
          sipil_items: rapp.sipil_items,
          vendor_kategoris: rapp.vendor_kategoris,
          rab: rabVal,
          total_material: totalMat,
          total_sipil_rapp: totalSipilRapp,
          total_vendor: totalVendor,
          total_rapp: totalRapp,
          selisih,
          margin,
        }],
        logoUrl: typeof window !== "undefined" ? `${window.location.origin}/images/logo.png` : undefined,
      };

      const { RappPDF } = await import("./rapp-pdf");
      const blob = await pdf(<RappPDF data={pdfData} />).toBlob();
      const terminNama = (selectedTermin?.nama ?? `termin-${selectedTermin?.urutan}`)
        .replace(/\s+/g, "-").toLowerCase();
      const proyekNamaSlug = (projekNama ?? "proyek").replace(/\s+/g, "-").toLowerCase();
      saveAs(blob, `rapp-${proyekNamaSlug}-${terminNama}.pdf`);
    } catch (e) {
      console.error("PDF error:", e);
      toast.error("Gagal generate PDF RAPP");
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Excel upload ──────────────────────────────────────────────────────────
  async function handleExcelFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setCsvUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const { materialGroups, sipilRows, vendorGroups } = parseExcelFile(buf);

      for (const group of materialGroups) {
        const resp = await api.addMaterialKategori(selectedTerminId, { kode: group.kode, nama: group.nama });
        for (const item of group.items) {
          await api.addMaterialItem(resp.id, item);
        }
      }
      for (const item of sipilRows) {
        await api.addSipilItem(selectedTerminId, item);
      }
      for (const group of vendorGroups) {
        const resp = await api.addVendorKategori(selectedTerminId, { nama: group.nama });
        for (const item of group.items) {
          await api.addVendorItem(resp.id, item);
        }
      }

      inv();
      const parts = [];
      if (materialGroups.length) parts.push(`${materialGroups.length} kategori material`);
      if (sipilRows.length) parts.push(`${sipilRows.length} sipil item`);
      if (vendorGroups.length) parts.push(`${vendorGroups.length} kategori vendor`);
      toast.success(`Excel berhasil diimport: ${parts.join(", ")}`);
    } catch (e) {
      console.error("Excel upload error:", e);
      toast.error("Gagal import Excel. Periksa format file.");
    } finally {
      setCsvUploading(false);
    }
  }

  function downloadExcelTemplate() {
    const blob = buildExcelTemplate();
    saveAs(blob, "template-rapp-sipil.xlsx");
  }

  // ── PDF file upload ────────────────────────────────────────────────────────
  async function handlePdfFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setPdfImportLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const { materialGroups, sipilRows, vendorGroups } = await parsePdfFile(buf);

      for (const group of materialGroups) {
        const resp = await api.addMaterialKategori(selectedTerminId, { kode: group.kode, nama: group.nama });
        for (const item of group.items) {
          await api.addMaterialItem(resp.id, item);
        }
      }
      for (const item of sipilRows) {
        await api.addSipilItem(selectedTerminId, item);
      }
      for (const group of vendorGroups) {
        const resp = await api.addVendorKategori(selectedTerminId, { nama: group.nama });
        for (const item of group.items) {
          await api.addVendorItem(resp.id, item);
        }
      }

      inv();
      const parts: string[] = [];
      if (materialGroups.length) parts.push(`${materialGroups.length} kategori material`);
      if (sipilRows.length) parts.push(`${sipilRows.length} sipil item`);
      if (vendorGroups.length) parts.push(`${vendorGroups.length} kategori vendor`);
      toast.success(`PDF berhasil diimport: ${parts.join(", ")}`);
    } catch (err: any) {
      console.error("PDF import error:", err);
      toast.error(err?.message ?? "Gagal import PDF. Pastikan format sesuai template RAPP.");
    } finally {
      setPdfImportLoading(false);
    }
  }

  const handleMatItemUpdate = useCallback(
    async (id: string, data: any) => {
      await updMatItem.mutateAsync({ id, data });
    },
    [updMatItem]
  );
  const handleVenItemUpdate = useCallback(
    async (id: string, data: any) => {
      await updVenItem.mutateAsync({ id, data });
    },
    [updVenItem]
  );
  const handleSipilItemUpdate = useCallback(
    async (id: string, data: any) => {
      await updSipilItem.mutateAsync({ id, data });
    },
    [updSipilItem]
  );

  if (termins.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Belum ada termin. Tambah termin terlebih dahulu untuk mengisi RAPP.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Termin selector + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground shrink-0">Pilih Termin:</span>
        <div className="flex gap-2 flex-wrap flex-1">
          {termins.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTerminId(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedTerminId === t.id ? "bg-teal-600 text-white shadow-sm" : "bg-muted hover:bg-muted/80 text-foreground"}`}
            >
              {t.nama ?? `Termin ${t.urutan}`}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Hidden file inputs */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleExcelFileChange}
          />
          <input
            ref={pdfImportRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handlePdfFileChange}
          />

          {/* Excel template download hint */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={downloadExcelTemplate}>
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <p className="font-semibold mb-1">Format Excel RAPP (3 sheet):</p>
                <p className="text-xs"><b>Sheet "Material"</b>: NO | MATERIAL | VOL | SAT | HARGA SATUAN</p>
                <p className="text-xs text-muted-foreground">→ Baris kategori: NO = huruf (A, B, K…), kolom lain kosong</p>
                <p className="text-xs text-muted-foreground">→ Baris item: NO = angka, isi lengkap</p>
                <p className="text-xs mt-1"><b>Sheet "RAPP Sipil"</b>: NO | NAMA | VOL | SAT | HARGA SATUAN | KETERANGAN</p>
                <p className="text-xs"><b>Sheet "Vendor"</b>: KATEGORI | NAMA | VOL | SAT | HARGA SATUAN</p>
                <p className="text-xs text-muted-foreground mt-1">Klik untuk download template .xlsx</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => csvInputRef.current?.click()}
            disabled={csvUploading || !selectedTerminId}
          >
            {csvUploading
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            {csvUploading ? "Mengimport..." : "Import Excel"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => pdfImportRef.current?.click()}
            disabled={pdfImportLoading || !selectedTerminId}
          >
            {pdfImportLoading
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            {pdfImportLoading ? "Membaca PDF..." : "Import PDF"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={handleDownloadPdf}
            disabled={!rapp || pdfLoading}
          >
            {pdfLoading
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
            {pdfLoading ? "Generating..." : "PDF RAPP"}
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground py-4">Memuat RAPP...</div>}

      {rapp && (
        <>
          {/* Header info */}
          <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm space-y-0.5">
            <div><span className="text-muted-foreground w-32 inline-block">Nama Project</span>: <b>{projekNama ?? "—"}</b></div>
            <div><span className="text-muted-foreground w-32 inline-block">Judul</span>: <b>{selectedTermin?.nama ?? `Termin ${selectedTermin?.urutan}`}</b></div>
            {projekLokasi && <div><span className="text-muted-foreground w-32 inline-block">Lokasi</span>: <b>{projekLokasi}</b></div>}
          </div>

          {/* ── SECTION 1: Material ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Biaya Material Bangunan</h3>
              <Button size="sm" variant="outline" onClick={() => { setAddKategoriDialog("material"); setAddKategoriNama(""); setAddKategoriKode(""); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Kategori
              </Button>
            </div>

            {rapp.material_kategoris.length === 0 && (
              <div className="border rounded-lg py-8 text-center text-sm text-muted-foreground">
                Belum ada kategori material.{" "}
                <button className="text-primary underline" onClick={() => { setAddKategoriDialog("material"); setAddKategoriNama(""); setAddKategoriKode(""); }}>
                  Tambah kategori
                </button>
              </div>
            )}

            {rapp.material_kategoris.map((kat) => {
              const katTotal = kat.items.reduce((s, i) => s + i.jumlah, 0);
              const collapsed = collapsedKategoris[kat.id];
              return (
                <div key={kat.id} className="border rounded-lg overflow-hidden">
                  {/* Kategori header */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border-b">
                    <button onClick={() => toggleKat(kat.id)} className="flex items-center gap-1.5 flex-1 text-left">
                      {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      {editKategoriId === kat.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input className="h-6 w-16 text-sm" value={editKategoriKode} onChange={(e) => setEditKategoriKode(e.target.value)} placeholder="A" />
                          <Input className="h-6 text-sm" value={editKategoriNama} onChange={(e) => setEditKategoriNama(e.target.value)} autoFocus />
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={() => updMatKat.mutate({ id: kat.id, data: { kode: editKategoriKode || null, nama: editKategoriNama } })}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditKategoriId(null)}><X className="h-3 w-3" /></Button>
                        </div>
                      ) : (
                        <span className="font-semibold text-sm text-orange-800">
                          {kat.kode && <span className="mr-1">{kat.kode}.</span>}{kat.nama}
                        </span>
                      )}
                    </button>
                    {editKategoriId !== kat.id && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-2">{fmtRp(katTotal)}</span>
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setAddItemDialog({ type: "material", targetId: kat.id })}>
                          <Plus className="h-3 w-3 mr-1" /> Item
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditKategoriId(kat.id); setEditKategoriNama(kat.nama); setEditKategoriKode(kat.kode ?? ""); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteConfirm({ type: "material-kategori", id: kat.id, label: kat.nama })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {!collapsed && (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-8 pl-6">No</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead className="w-20">Vol</TableHead>
                          <TableHead className="w-20">Sat</TableHead>
                          <TableHead className="w-36">Harga Satuan</TableHead>
                          <TableHead className="text-right w-36">Jumlah</TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kat.items.map((item, idx) => (
                          <MaterialItemRow
                            key={item.id}
                            item={item}
                            no={idx + 1}
                            onUpdate={handleMatItemUpdate}
                            onDelete={(id) => setDeleteConfirm({ type: "material-item", id, label: item.material })}
                          />
                        ))}
                        {kat.items.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4 text-sm text-muted-foreground">
                              Belum ada item.{" "}
                              <button className="text-primary underline" onClick={() => setAddItemDialog({ type: "material", targetId: kat.id })}>Tambah item</button>
                            </TableCell>
                          </TableRow>
                        )}
                        {kat.items.length > 0 && (
                          <TableRow className="bg-orange-50/50">
                            <TableCell colSpan={5} className="text-right text-sm font-semibold pr-4 text-orange-800">Subtotal {kat.kode ? `${kat.kode}.` : ""}{kat.nama}</TableCell>
                            <TableCell className="text-right font-bold text-orange-800">{fmtRp(katTotal)}</TableCell>
                            <TableCell />
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })}

            {/* Total Material */}
            {rapp.material_kategoris.length > 0 && (
              <div className="rounded-lg border bg-orange-100 px-4 py-2.5 flex items-center justify-between">
                <span className="font-bold text-orange-900">TOTAL BIAYA MATERIAL BANGUNAN</span>
                <span className="font-bold text-orange-900 text-lg">{fmtRp(totalMaterial)}</span>
              </div>
            )}
          </div>

          {/* ── SECTION 2: RAPP Sipil Items ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Biaya Tambahan (RAPP Sipil)</h3>
              <Button size="sm" variant="outline" onClick={() => setAddItemDialog({ type: "sipil", targetId: selectedTerminId })}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-8 pl-4">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="w-20">Vol</TableHead>
                    <TableHead className="w-20">Sat</TableHead>
                    <TableHead className="w-36">Harga Satuan</TableHead>
                    <TableHead className="w-48">Keterangan</TableHead>
                    <TableHead className="text-right w-36">Jumlah</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rapp.sipil_items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-sm text-muted-foreground">
                        Belum ada item.{" "}
                        <button className="text-primary underline" onClick={() => setAddItemDialog({ type: "sipil", targetId: selectedTerminId })}>Tambah item</button>
                      </TableCell>
                    </TableRow>
                  )}
                  {(() => {
                    // Group sipil items into Persiapan / Tenaga/Tukang sections visually
                    const getSec = (nama: string) =>
                      /tukang|kenek|tenaga|borong/i.test(nama) ? "Tenaga/Tukang" : "Persiapan";
                    let lastSec = "";
                    const sectionNo: Record<string, number> = {};
                    const rows: React.ReactNode[] = [];
                    rapp.sipil_items.forEach((item) => {
                      const sec = getSec(item.nama);
                      if (sec !== lastSec) {
                        lastSec = sec;
                        rows.push(
                          <TableRow key={`sec-${sec}-${item.id}`} className={sec === "Tenaga/Tukang" ? "bg-teal-50" : "bg-slate-50"}>
                            <TableCell
                              colSpan={8}
                              className={`py-1.5 px-4 text-xs font-bold uppercase tracking-wide ${sec === "Tenaga/Tukang" ? "text-teal-700" : "text-slate-600"}`}
                            >
                              {sec}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      sectionNo[sec] = (sectionNo[sec] ?? 0) + 1;
                      rows.push(
                        <SipilItemRow
                          key={item.id}
                          item={item}
                          no={sectionNo[sec]}
                          onUpdate={handleSipilItemUpdate}
                          onDelete={(id) => setDeleteConfirm({ type: "sipil-item", id, label: item.nama })}
                        />
                      );
                    });
                    return rows;
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* ── SECTION 3: RAPP Vendor ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Pekerjaan Vendor (Opsional)</h3>
              <Button size="sm" variant="outline" onClick={() => { setAddKategoriDialog("vendor"); setAddKategoriNama(""); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Kategori Vendor
              </Button>
            </div>

            {rapp.vendor_kategoris.map((kat) => {
              const katTotal = kat.items.reduce((s, i) => s + i.jumlah, 0);
              const collapsed = collapsedKategoris[`v-${kat.id}`];
              return (
                <div key={kat.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b">
                    <button onClick={() => toggleKat(`v-${kat.id}`)} className="flex items-center gap-1.5 flex-1 text-left">
                      {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      {editKategoriId === `v-${kat.id}` ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input className="h-6 text-sm" value={editKategoriNama} onChange={(e) => setEditKategoriNama(e.target.value)} autoFocus />
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={() => updVenKat.mutate({ id: kat.id, data: { nama: editKategoriNama } })}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditKategoriId(null)}><X className="h-3 w-3" /></Button>
                        </div>
                      ) : (
                        <span className="font-semibold text-sm text-blue-800">{kat.nama}</span>
                      )}
                    </button>
                    {editKategoriId !== `v-${kat.id}` && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-2">{fmtRp(katTotal)}</span>
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setAddItemDialog({ type: "vendor", targetId: kat.id })}>
                          <Plus className="h-3 w-3 mr-1" /> Item
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditKategoriId(`v-${kat.id}`); setEditKategoriNama(kat.nama); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteConfirm({ type: "vendor-kategori", id: kat.id, label: kat.nama })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {!collapsed && (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-8 pl-6">No</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead className="w-20">Vol</TableHead>
                          <TableHead className="w-20">Sat</TableHead>
                          <TableHead className="w-36">Harga Satuan</TableHead>
                          <TableHead className="text-right w-36">Jumlah</TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kat.items.map((item, idx) => (
                          <MaterialItemRow
                            key={item.id}
                            item={item}
                            no={idx + 1}
                            onUpdate={handleVenItemUpdate}
                            onDelete={(id) => setDeleteConfirm({ type: "vendor-item", id, label: item.nama })}
                          />
                        ))}
                        {kat.items.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4 text-sm text-muted-foreground">
                              Belum ada item.{" "}
                              <button className="text-primary underline" onClick={() => setAddItemDialog({ type: "vendor", targetId: kat.id })}>Tambah item</button>
                            </TableCell>
                          </TableRow>
                        )}
                        {kat.items.length > 0 && (
                          <TableRow className="bg-blue-50/50">
                            <TableCell colSpan={5} className="text-right text-sm font-semibold pr-4 text-blue-800">Subtotal {kat.nama}</TableCell>
                            <TableCell className="text-right font-bold text-blue-800">{fmtRp(katTotal)}</TableCell>
                            <TableCell />
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── SECTION 4: Summary ── */}
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2.5 font-bold text-sm">Ringkasan RAPP</div>
            <div className="divide-y text-sm">
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Total Biaya Material Bangunan</span>
                <span className="font-medium">{fmtRp(totalMaterial)}</span>
              </div>
              {rapp.sipil_items.map((item) => (
                <div key={item.id} className="flex justify-between px-4 py-1.5">
                  <span className="text-muted-foreground pl-4">{item.nama}{item.keterangan && <span className="ml-1 text-xs italic">({item.keterangan})</span>}</span>
                  <span>{fmtRp(item.jumlah)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 bg-orange-50">
                <span className="font-bold text-orange-900">Total RAPP Sipil</span>
                <span className="font-bold text-orange-900">{fmtRp(totalSipil)}</span>
              </div>
              {totalVendor > 0 && (
                <>
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-muted-foreground">Total RAPP Vendor</span>
                    <span className="font-medium">{fmtRp(totalVendor)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between px-4 py-2.5 bg-yellow-50">
                <span className="font-bold text-yellow-900">Total RAPP {selectedTermin?.nama ?? ""}</span>
                <span className="font-bold text-yellow-900">{fmtRp(totalRapp)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5 bg-blue-50">
                <span className="font-medium text-blue-900">RAB</span>
                {editingRab ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-7 w-40 text-right"
                      value={rabInput}
                      onChange={(e) => setRabInput(e.target.value)}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => updTerminRab.mutate({ terminId: selectedTerminId, rab: parseFloat(rabInput) || 0 })}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingRab(false)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-900">{fmtRp(rab)}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setRabInput(String(rab)); setEditingRab(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">Selisih (RAB − RAPP)</span>
                <span className={`font-semibold ${selisih >= 0 ? "text-green-700" : "text-red-600"}`}>{fmtRp(selisih)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 bg-green-50">
                <span className="font-bold text-green-900">Margin</span>
                <span className={`font-bold text-lg ${margin >= 0 ? "text-green-700" : "text-red-600"}`}>{margin.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Add Kategori Dialog ── */}
      <Dialog open={!!addKategoriDialog} onOpenChange={() => setAddKategoriDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{addKategoriDialog === "vendor" ? "Tambah Kategori Vendor" : "Tambah Kategori Material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {addKategoriDialog === "material" && (
              <div>
                <Label>Kode (opsional)</Label>
                <Input value={addKategoriKode} onChange={(e) => setAddKategoriKode(e.target.value)} placeholder="A, B, K, dst." />
              </div>
            )}
            <div>
              <Label>Nama Kategori *</Label>
              <Input value={addKategoriNama} onChange={(e) => setAddKategoriNama(e.target.value)} placeholder={addKategoriDialog === "vendor" ? "e.g. Pekerjaan Pintu" : "e.g. PEKERJAAN STRUKTUR"} autoFocus />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setAddKategoriDialog(null)}>Batal</Button>
              <Button
                disabled={!addKategoriNama || addMatKat.isPending || addVenKat.isPending}
                onClick={() => {
                  if (addKategoriDialog === "material") addMatKat.mutate({ kode: addKategoriKode || null, nama: addKategoriNama });
                  else addVenKat.mutate({ nama: addKategoriNama });
                }}
              >
                Tambah
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Item Dialog ── */}
      {addItemDialog && (
        <AddItemDialog
          open={true}
          onClose={() => setAddItemDialog(null)}
          type={addItemDialog.type}
          onAdd={async (items) => {
            for (const data of items) {
              if (addItemDialog.type === "material") await api.addMaterialItem(addItemDialog.targetId, data);
              else if (addItemDialog.type === "vendor") await api.addVendorItem(addItemDialog.targetId, data);
              else await api.addSipilItem(selectedTerminId, data);
            }
            inv();
            setAddItemDialog(null);
            toast.success(items.length > 1 ? `${items.length} item ditambahkan` : "Item ditambahkan");
          }}
        />
      )}

      {/* ── Delete Confirm ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Item?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Yakin hapus <b>{deleteConfirm?.label}</b>? Tindakan ini tidak bisa dibatalkan.</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteConfirm) return;
                if (deleteConfirm.type === "material-kategori") delMatKat.mutate(deleteConfirm.id);
                else if (deleteConfirm.type === "material-item") delMatItem.mutate(deleteConfirm.id);
                else if (deleteConfirm.type === "sipil-item") delSipilItem.mutate(deleteConfirm.id);
                else if (deleteConfirm.type === "vendor-kategori") delVenKat.mutate(deleteConfirm.id);
                else if (deleteConfirm.type === "vendor-item") delVenItem.mutate(deleteConfirm.id);
              }}
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
