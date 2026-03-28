"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { websiteApi } from "@/lib/api/website";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calculator, Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

interface KalkulatorItem {
  key: string;
  label: string;
  harga: number;
  satuan: string;
  kategori?: string;
}

function fmt(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function normalizeItems(data: any): KalkulatorItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Object.entries(data).map(([k, v]) => ({ key: k, label: k, harga: Number(v), satuan: "per m²" }));
}

const EMPTY_PAKET = { key: "", label: "", harga: "0", satuan: "per m²" };
const EMPTY_SURCHARGE = { key: "", label: "", harga: "0", satuan: "per m²", kategori: "" };

export default function WebsiteKalkulatorPage() {
  const qc = useQueryClient();
  const [synced, setSynced] = useState(false);
  const [paketItems, setPaketItems] = useState<KalkulatorItem[]>([]);
  const [surchargeItems, setSurchargeItems] = useState<KalkulatorItem[]>([]);

  // Paket edit/add
  const [editingPaket, setEditingPaket] = useState<string | null>(null);
  const [editPaket, setEditPaket] = useState({ label: "", harga: "0", satuan: "per m²" });
  const [addingPaket, setAddingPaket] = useState(false);
  const [newPaket, setNewPaket] = useState({ ...EMPTY_PAKET });

  // Surcharge edit/add
  const [editingSurcharge, setEditingSurcharge] = useState<string | null>(null);
  const [editSurcharge, setEditSurcharge] = useState({ label: "", harga: "0", satuan: "per m²", kategori: "" });
  const [addingSurcharge, setAddingSurcharge] = useState(false);
  const [newSurcharge, setNewSurcharge] = useState({ ...EMPTY_SURCHARGE });

  useQuery({
    queryKey: ["website-kalkulator"],
    queryFn: async () => {
      const data = await websiteApi.getKalkulator();
      setPaketItems(normalizeItems(data.base_prices));
      setSurchargeItems(normalizeItems(data.surcharges));
      setSynced(true);
      return data;
    },
  });

  // ── Paket mutations ────────────────────────────────────────────────────────
  const addPaketMut = useMutation({
    mutationFn: () =>
      websiteApi.addPaket({ key: newPaket.key, label: newPaket.label, harga: parseInt(newPaket.harga) || 0, satuan: newPaket.satuan }),
    onSuccess: (data) => {
      setPaketItems(normalizeItems(data.base_prices));
      setAddingPaket(false);
      setNewPaket({ ...EMPTY_PAKET });
      toast.success("Paket ditambahkan");
      qc.invalidateQueries({ queryKey: ["website-kalkulator"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menambahkan"),
  });

  const updatePaketMut = useMutation({
    mutationFn: (key: string) =>
      websiteApi.updatePaket(key, { label: editPaket.label, harga: parseInt(editPaket.harga) || 0, satuan: editPaket.satuan }),
    onSuccess: (data) => {
      setPaketItems(normalizeItems(data.base_prices));
      setEditingPaket(null);
      toast.success("Paket diperbarui");
      qc.invalidateQueries({ queryKey: ["website-kalkulator"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal memperbarui"),
  });

  const deletePaketMut = useMutation({
    mutationFn: (key: string) => websiteApi.deletePaket(key),
    onSuccess: (_, key) => {
      setPaketItems((p) => p.filter((i) => i.key !== key));
      toast.success("Paket dihapus");
      qc.invalidateQueries({ queryKey: ["website-kalkulator"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menghapus"),
  });

  // ── Surcharge mutations ────────────────────────────────────────────────────
  const addSurchargeMut = useMutation({
    mutationFn: () =>
      websiteApi.addSurcharge({
        key: newSurcharge.key,
        label: newSurcharge.label,
        harga: parseInt(newSurcharge.harga) || 0,
        satuan: newSurcharge.satuan,
        kategori: newSurcharge.kategori || undefined,
      }),
    onSuccess: (data) => {
      setSurchargeItems(normalizeItems(data.surcharges));
      setAddingSurcharge(false);
      setNewSurcharge({ ...EMPTY_SURCHARGE });
      toast.success("Surcharge ditambahkan");
      qc.invalidateQueries({ queryKey: ["website-kalkulator"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menambahkan"),
  });

  const updateSurchargeMut = useMutation({
    mutationFn: (key: string) =>
      websiteApi.updateSurcharge(key, {
        label: editSurcharge.label,
        harga: parseInt(editSurcharge.harga) || 0,
        satuan: editSurcharge.satuan,
        kategori: editSurcharge.kategori || undefined,
      }),
    onSuccess: (data) => {
      setSurchargeItems(normalizeItems(data.surcharges));
      setEditingSurcharge(null);
      toast.success("Surcharge diperbarui");
      qc.invalidateQueries({ queryKey: ["website-kalkulator"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal memperbarui"),
  });

  const deleteSurchargeMut = useMutation({
    mutationFn: (key: string) => websiteApi.deleteSurcharge(key),
    onSuccess: (_, key) => {
      setSurchargeItems((s) => s.filter((i) => i.key !== key));
      toast.success("Surcharge dihapus");
      qc.invalidateQueries({ queryKey: ["website-kalkulator"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menghapus"),
  });

  if (!synced) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="text-orange-500" size={24} />
          Konfigurasi Kalkulator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kelola paket harga dasar dan surcharge material untuk kalkulator estimasi website.
        </p>
      </div>

      {/* ── Paket Table ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Harga Dasar per m² (Paket)</CardTitle>
            <CardDescription className="text-xs mt-0.5">Contoh: MINIMALIS, LUXURY</CardDescription>
          </div>
          {!addingPaket && (
            <Button size="sm" variant="outline" onClick={() => setAddingPaket(true)}>
              <Plus size={14} className="mr-1" /> Tambah
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left pb-2 font-medium w-28">Key</th>
                <th className="text-left pb-2 font-medium">Label</th>
                <th className="text-right pb-2 font-medium w-32">Harga / m²</th>
                <th className="text-left pb-2 font-medium pl-3 w-24">Satuan</th>
                <th className="pb-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {paketItems.map((item) =>
                editingPaket === item.key ? (
                  <tr key={item.key} className="border-b">
                    <td className="py-1.5 pr-2 font-mono text-xs text-muted-foreground">{item.key}</td>
                    <td className="py-1.5 pr-2">
                      <Input value={editPaket.label} onChange={(e) => setEditPaket((f) => ({ ...f, label: e.target.value }))} className="h-7 text-sm" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input type="number" value={editPaket.harga} onChange={(e) => setEditPaket((f) => ({ ...f, harga: e.target.value }))} className="h-7 text-sm text-right" />
                    </td>
                    <td className="py-1.5 pl-3 pr-2">
                      <Input value={editPaket.satuan} onChange={(e) => setEditPaket((f) => ({ ...f, satuan: e.target.value }))} className="h-7 text-sm" />
                    </td>
                    <td className="py-1.5">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => updatePaketMut.mutate(item.key)} disabled={updatePaketMut.isPending} className="text-green-500 hover:text-green-700 disabled:opacity-50">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingPaket(null)} className="text-muted-foreground hover:text-foreground">
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.key} className="border-b hover:bg-muted/30">
                    <td className="py-2 pr-2 font-mono text-xs text-muted-foreground">{item.key}</td>
                    <td className="py-2 pr-2">{item.label}</td>
                    <td className="py-2 pr-2 text-right font-medium">{fmt(item.harga)}</td>
                    <td className="py-2 pl-3 pr-2 text-muted-foreground text-xs">{item.satuan}</td>
                    <td className="py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => { setEditingPaket(item.key); setEditPaket({ label: item.label, harga: String(item.harga), satuan: item.satuan }); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deletePaketMut.mutate(item.key)} disabled={deletePaketMut.isPending} className="text-red-400 hover:text-red-600 disabled:opacity-50">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {addingPaket && (
                <tr className="border-b bg-orange-50/50">
                  <td className="py-1.5 pr-2">
                    <Input
                      placeholder="KEY"
                      value={newPaket.key}
                      onChange={(e) => setNewPaket((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/\s/g, "_") }))}
                      className="h-7 text-sm font-mono"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input placeholder="Label tampilan" value={newPaket.label} onChange={(e) => setNewPaket((f) => ({ ...f, label: e.target.value }))} className="h-7 text-sm" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input type="number" value={newPaket.harga} onChange={(e) => setNewPaket((f) => ({ ...f, harga: e.target.value }))} className="h-7 text-sm text-right" />
                  </td>
                  <td className="py-1.5 pl-3 pr-2">
                    <Input value={newPaket.satuan} onChange={(e) => setNewPaket((f) => ({ ...f, satuan: e.target.value }))} className="h-7 text-sm" />
                  </td>
                  <td className="py-1.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => addPaketMut.mutate()} disabled={!newPaket.key || !newPaket.label || addPaketMut.isPending} className="text-green-500 hover:text-green-700 disabled:opacity-40">
                        <Check size={14} />
                      </button>
                      <button onClick={() => { setAddingPaket(false); setNewPaket({ ...EMPTY_PAKET }); }} className="text-muted-foreground hover:text-foreground">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {paketItems.length === 0 && !addingPaket && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground text-sm">
                    Belum ada paket. Klik Tambah untuk menambahkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Surcharge Table ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Surcharge Material (per m²)</CardTitle>
            <CardDescription className="text-xs mt-0.5">Biaya tambahan (+) atau pengurangan (-) per pilihan material</CardDescription>
          </div>
          {!addingSurcharge && (
            <Button size="sm" variant="outline" onClick={() => setAddingSurcharge(true)}>
              <Plus size={14} className="mr-1" /> Tambah
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left pb-2 font-medium w-28">Key</th>
                <th className="text-left pb-2 font-medium">Label</th>
                <th className="text-right pb-2 font-medium w-32">Harga / m²</th>
                <th className="text-left pb-2 font-medium pl-3 w-24">Satuan</th>
                <th className="text-left pb-2 font-medium pl-3 w-24">Kategori</th>
                <th className="pb-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {surchargeItems.map((item) =>
                editingSurcharge === item.key ? (
                  <tr key={item.key} className="border-b">
                    <td className="py-1.5 pr-2 font-mono text-xs text-muted-foreground">{item.key}</td>
                    <td className="py-1.5 pr-2">
                      <Input value={editSurcharge.label} onChange={(e) => setEditSurcharge((f) => ({ ...f, label: e.target.value }))} className="h-7 text-sm" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input type="number" value={editSurcharge.harga} onChange={(e) => setEditSurcharge((f) => ({ ...f, harga: e.target.value }))} className="h-7 text-sm text-right" />
                    </td>
                    <td className="py-1.5 pl-3 pr-2">
                      <Input value={editSurcharge.satuan} onChange={(e) => setEditSurcharge((f) => ({ ...f, satuan: e.target.value }))} className="h-7 text-sm" />
                    </td>
                    <td className="py-1.5 pl-3 pr-2">
                      <Input placeholder="dinding, lantai..." value={editSurcharge.kategori} onChange={(e) => setEditSurcharge((f) => ({ ...f, kategori: e.target.value }))} className="h-7 text-sm" />
                    </td>
                    <td className="py-1.5">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => updateSurchargeMut.mutate(item.key)} disabled={updateSurchargeMut.isPending} className="text-green-500 hover:text-green-700 disabled:opacity-50">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingSurcharge(null)} className="text-muted-foreground hover:text-foreground">
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.key} className="border-b hover:bg-muted/30">
                    <td className="py-2 pr-2 font-mono text-xs text-muted-foreground">{item.key}</td>
                    <td className="py-2 pr-2">{item.label}</td>
                    <td className={`py-2 pr-2 text-right font-medium ${item.harga < 0 ? "text-green-600" : "text-orange-600"}`}>
                      {item.harga >= 0 ? "+" : ""}{fmt(item.harga)}
                    </td>
                    <td className="py-2 pl-3 pr-2 text-muted-foreground text-xs">{item.satuan}</td>
                    <td className="py-2 pl-3 pr-2 text-muted-foreground text-xs">{item.kategori || "-"}</td>
                    <td className="py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => {
                            setEditingSurcharge(item.key);
                            setEditSurcharge({ label: item.label, harga: String(item.harga), satuan: item.satuan, kategori: item.kategori ?? "" });
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteSurchargeMut.mutate(item.key)} disabled={deleteSurchargeMut.isPending} className="text-red-400 hover:text-red-600 disabled:opacity-50">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {addingSurcharge && (
                <tr className="border-b bg-orange-50/50">
                  <td className="py-1.5 pr-2">
                    <Input
                      placeholder="KEY"
                      value={newSurcharge.key}
                      onChange={(e) => setNewSurcharge((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/\s/g, "_") }))}
                      className="h-7 text-sm font-mono"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input placeholder="Label tampilan" value={newSurcharge.label} onChange={(e) => setNewSurcharge((f) => ({ ...f, label: e.target.value }))} className="h-7 text-sm" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input type="number" placeholder="Negatif = diskon" value={newSurcharge.harga} onChange={(e) => setNewSurcharge((f) => ({ ...f, harga: e.target.value }))} className="h-7 text-sm text-right" />
                  </td>
                  <td className="py-1.5 pl-3 pr-2">
                    <Input value={newSurcharge.satuan} onChange={(e) => setNewSurcharge((f) => ({ ...f, satuan: e.target.value }))} className="h-7 text-sm" />
                  </td>
                  <td className="py-1.5 pl-3 pr-2">
                    <Input placeholder="dinding, lantai..." value={newSurcharge.kategori} onChange={(e) => setNewSurcharge((f) => ({ ...f, kategori: e.target.value }))} className="h-7 text-sm" />
                  </td>
                  <td className="py-1.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => addSurchargeMut.mutate()} disabled={!newSurcharge.key || !newSurcharge.label || addSurchargeMut.isPending} className="text-green-500 hover:text-green-700 disabled:opacity-40">
                        <Check size={14} />
                      </button>
                      <button onClick={() => { setAddingSurcharge(false); setNewSurcharge({ ...EMPTY_SURCHARGE }); }} className="text-muted-foreground hover:text-foreground">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {surchargeItems.length === 0 && !addingSurcharge && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground text-sm">
                    Belum ada surcharge. Klik Tambah untuk menambahkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-3">
            Nilai negatif = pengurangan biaya (diskon material). Contoh: PVC plafon = -50.000
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
