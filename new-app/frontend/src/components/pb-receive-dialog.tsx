"use client";

import { useEffect, useState } from "react";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ReceiptRow = { pb_item_id: string; qty: number };

export function PBReceiveDialog({ pb, pending, onClose, onSubmit }: {
  pb: any | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (tanggal: string, items: ReceiptRow[]) => void;
}) {
  const [tanggal, setTanggal] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!pb) return;
    setTanggal(new Date().toISOString().slice(0, 10));
    setQuantities(Object.fromEntries((pb.items ?? []).map((item: any) => [String(item.id), String(Math.max(0, Number(item.qty_remaining ?? item.qty) || 0))])));
  }, [pb]);

  const items = (pb?.items ?? []).map((item: any) => ({
    ...item,
    remaining: Math.max(0, Number(item.qty_remaining ?? item.qty) || 0),
    receive: Number(quantities[String(item.id)] ?? 0),
  }));
  const invalid = items.some((item: any) => !Number.isFinite(item.receive) || item.receive < 0 || item.receive > item.remaining);
  const hasReceipt = items.some((item: any) => item.receive > 0);

  return <Dialog open={Boolean(pb)} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Catat penerimaan {pb?.nomor_pb}</DialogTitle>
        <DialogDescription>Isi qty yang benar-benar tiba. Sisa item tetap berstatus Sebagian Diterima dan dapat dicatat lagi nanti.</DialogDescription>
      </DialogHeader>
      <label className="space-y-1 text-sm font-medium">Tanggal penerimaan
        <input type="date" className="min-h-11 w-full rounded-md border bg-background px-3 font-normal" value={tanggal} onChange={(event) => setTanggal(event.target.value)} />
      </label>
      <div className="space-y-2">
        {items.map((item: any) => <div key={item.id} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-end">
          <div><div className="text-sm font-medium">{item.nama_item}</div><div className="text-xs text-muted-foreground">Sudah diterima {item.qty_received ?? 0} dari {item.qty} {item.satuan}. Sisa {item.remaining} {item.satuan}.</div></div>
          <label className="space-y-1 text-xs font-medium">Qty diterima
            <input aria-label={`Qty diterima ${item.nama_item}`} type="number" min="0" max={item.remaining} step="any" className="min-h-11 w-full rounded-md border bg-background px-3 text-right text-sm font-normal" value={quantities[String(item.id)] ?? ""} onChange={(event) => setQuantities((current) => ({ ...current, [String(item.id)]: event.target.value }))} />
          </label>
        </div>)}
      </div>
      {invalid && <p role="alert" className="text-sm text-destructive">Qty tidak boleh negatif atau melebihi sisa penerimaan.</p>}
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" disabled={pending || invalid || !hasReceipt || !tanggal} onClick={() => onSubmit(tanggal, items.filter((item: any) => item.receive > 0).map((item: any) => ({ pb_item_id: String(item.id), qty: item.receive })))}>
          <PackageCheck className="mr-1 h-4 w-4" />{pending ? "Menyimpan..." : "Catat Penerimaan"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
