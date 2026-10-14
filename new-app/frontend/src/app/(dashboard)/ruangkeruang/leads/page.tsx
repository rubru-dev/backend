"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ruangkeruangApi } from "@/lib/api/website";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const statuses = ["baru", "dihubungi", "survey", "selesai", "arsip"];
export default function RuangkeruangLeadsPage() {
  const qc = useQueryClient(); const [status, setStatus] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["ruangkeruang-leads", status], queryFn: () => ruangkeruangApi.listLeads(status || undefined) });
  const update = useMutation({ mutationFn: ({ id, value }: { id: string; value: string }) => ruangkeruangApi.updateLead(id, value), onSuccess: () => { toast.success("Status lead diperbarui"); qc.invalidateQueries({ queryKey: ["ruangkeruang-leads"] }); }, onError: () => toast.error("Status lead gagal diperbarui") });
  return <div className="space-y-6 p-6"><div><h1 className="text-2xl font-bold">Leads Ruangkeruang</h1><p className="mt-1 text-sm text-muted-foreground">Permintaan konsultasi dari form website publik.</p></div><div className="max-w-xs space-y-1"><Label>Filter status</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Semua status</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[820px] text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Nama</th><th className="p-3 text-left">WhatsApp</th><th className="p-3 text-left">Kebutuhan</th><th className="p-3 text-left">Lokasi</th><th className="p-3 text-left">Status</th></tr></thead><tbody>{isLoading ? <tr><td colSpan={6} className="p-10 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr> : data.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Belum ada lead.</td></tr> : data.map((item: any) => <tr className="border-t" key={item.id}><td className="p-3 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString("id-ID")}</td><td className="p-3 font-medium">{item.name}</td><td className="p-3"><a className="text-orange-700 underline" href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{item.whatsapp}</a></td><td className="p-3">{item.service_type || "-"}</td><td className="p-3">{item.location || "-"}</td><td className="p-3"><div className="flex items-center gap-2"><Badge variant="outline">{item.status}</Badge><select aria-label={`Status ${item.name}`} className="h-9 rounded-md border bg-background px-2 text-xs" value={item.status} onChange={(e) => update.mutate({ id: item.id, value: e.target.value })}>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></div></td></tr>)}</tbody></table></div></div>;
}
