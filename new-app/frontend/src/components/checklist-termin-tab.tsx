"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ImageIcon, Loader2, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { storageUrl } from "@/lib/storage-url";

type ChecklistItem = {
  id: string;
  task_id: string;
  termin_id: string;
  termin_nama: string;
  nama_pekerjaan: string;
  item_jenis: "RAB_AWAL" | "TAMBAHAN" | string;
  dokumentasi_paths: string[];
  pic_paraf: boolean;
  client_paraf: boolean;
  status: string | null;
};

type ChecklistData = {
  items: ChecklistItem[];
  signatories: { ro: string | null; pic_project: string | null; client: string | null };
};

type ChecklistApi = {
  getChecklist: (projectId: string) => Promise<ChecklistData>;
  updateChecklistParaf: (id: string, party: "pic" | "client", value: boolean) => Promise<unknown>;
};

function ParafButton({ value, label, onClick, disabled }: { value: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={value ? "default" : "outline"}
      className={value ? "bg-emerald-600 hover:bg-emerald-700" : "min-w-[92px]"}
      onClick={onClick}
      disabled={disabled}
      title={value ? `Batalkan paraf ${label}` : `Paraf ${label}`}
    >
      {value ? <Check className="mr-1 h-3.5 w-3.5" /> : <PenLine className="mr-1 h-3.5 w-3.5" />}
      {value ? "Sudah" : "Paraf"}
    </Button>
  );
}

export function ChecklistTerminTab({ projectId, api }: { projectId: string; api: ChecklistApi }) {
  const qc = useQueryClient();
  const queryKey = ["checklist-termin", projectId];
  const { data, isLoading, isError } = useQuery({ queryKey, queryFn: () => api.getChecklist(projectId) });
  const parafMutation = useMutation({
    mutationFn: ({ id, party, value }: { id: string; party: "pic" | "client"; value: boolean }) => api.updateChecklistParaf(id, party, value),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (error: any) => toast.error(error?.response?.data?.detail ?? "Paraf gagal disimpan"),
  });

  const items = data?.items ?? [];
  const groups = useMemo(() => {
    const grouped = new Map<string, { name: string; items: ChecklistItem[] }>();
    for (const item of items) {
      const current = grouped.get(item.termin_id) ?? { name: item.termin_nama, items: [] };
      current.items.push(item);
      grouped.set(item.termin_id, current);
    }
    return [...grouped.values()];
  }, [items]);

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat checklist dari task termin...</div>;
  if (isError) return <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Checklist gagal dimuat. Coba muat ulang halaman.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Checklist pekerjaan per termin</h3>
          <p className="mt-1 text-sm text-muted-foreground">Item dan dokumentasi mengikuti task serta laporan PIC. Paraf dilakukan manual pada tiap item.</p>
        </div>
        <Badge variant="outline">{items.length} item pekerjaan</Badge>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">Belum ada task pekerjaan di termin proyek.</div>
      ) : groups.map((group) => (
        <section key={group.name} className="overflow-hidden rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
            <h4 className="font-semibold">{group.name}</h4>
            <span className="text-xs text-muted-foreground">{group.items.length} pekerjaan</span>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">No</TableHead>
                  <TableHead className="min-w-[260px]">Item Pekerjaan</TableHead>
                  <TableHead className="w-28">Jenis</TableHead>
                  <TableHead className="min-w-[220px]">Dokumentasi</TableHead>
                  <TableHead className="w-32 text-center">Paraf PIC</TableHead>
                  <TableHead className="w-32 text-center">Paraf Client</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.nama_pekerjaan}</TableCell>
                    <TableCell>
                      <Badge variant={item.item_jenis === "TAMBAHAN" ? "secondary" : "outline"} className={item.item_jenis === "TAMBAHAN" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : ""}>
                        {item.item_jenis === "TAMBAHAN" ? "Tambahan" : "RAB Awal"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.dokumentasi_paths.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="h-4 w-4" />Belum ada laporan PIC</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {item.dokumentasi_paths.map((path, imageIndex) => (
                            <a key={`${path}-${imageIndex}`} href={storageUrl(path)} target="_blank" rel="noreferrer" title="Buka dokumentasi">
                              <img src={storageUrl(path)} alt={`Dokumentasi ${item.nama_pekerjaan} ${imageIndex + 1}`} className="h-12 w-12 rounded border object-cover hover:opacity-80" />
                            </a>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <ParafButton value={item.pic_paraf} label="PIC" disabled={parafMutation.isPending} onClick={() => parafMutation.mutate({ id: item.id, party: "pic", value: !item.pic_paraf })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ParafButton value={item.client_paraf} label="Client" disabled={parafMutation.isPending} onClick={() => parafMutation.mutate({ id: item.id, party: "client", value: !item.client_paraf })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}

      <section className="rounded-lg border p-5">
        <h4 className="mb-5 text-center text-sm font-semibold">Mengetahui</h4>
        <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
          {[
            ["RO", data?.signatories.ro],
            ["PIC Project", data?.signatories.pic_project],
            ["Client", data?.signatories.client],
          ].map(([label, name]) => (
            <div key={label} className="min-h-24">
              <div className="flex min-h-16 items-end justify-center border-b border-dashed border-foreground/50 pb-2 text-sm text-muted-foreground">Tanda tangan</div>
              <p className="mt-2 text-sm font-medium">{name || "Belum diinput"}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
