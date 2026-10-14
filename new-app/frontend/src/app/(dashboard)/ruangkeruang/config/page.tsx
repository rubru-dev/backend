"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ruangkeruangApi } from "@/lib/api/website";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";

type Row = { title: string; description: string };
type Faq = { question: string; answer: string };
const emptySite = { name: "RUANGKERUANG", eyebrow: "Design & Build Workshop", headline: "", description: "", whatsapp: "", hero_image_url: "" };
const emptyRow: Row = { title: "", description: "" };
const emptyFaq: Faq = { question: "", answer: "" };

export default function RuangkeruangConfigPage() {
  const qc = useQueryClient(); const heroRef = useRef<HTMLInputElement>(null);
  const [site, setSite] = useState(emptySite); const [highlights, setHighlights] = useState<Row[]>([]); const [process, setProcess] = useState<Row[]>([]); const [faq, setFaq] = useState<Faq[]>([]);
  const { data = [], isLoading } = useQuery({ queryKey: ["ruangkeruang-settings"], queryFn: ruangkeruangApi.getSettings });
  useEffect(() => {
    const value = (key: string, fallback: any) => data.find((item: any) => item.key === key)?.value ?? fallback;
    setSite({ ...emptySite, ...(value("site", {}) || {}) }); setHighlights(value("highlights", [])); setProcess(value("process", [])); setFaq(value("faq", []));
  }, [data]);
  const save = useMutation({ mutationFn: async () => Promise.all([ruangkeruangApi.saveSetting("site", site), ruangkeruangApi.saveSetting("highlights", highlights), ruangkeruangApi.saveSetting("process", process), ruangkeruangApi.saveSetting("faq", faq)]), onSuccess: () => { toast.success("Konten website tersimpan"); qc.invalidateQueries({ queryKey: ["ruangkeruang-settings"] }); }, onError: () => toast.error("Konten gagal disimpan") });
  const upload = useMutation({ mutationFn: (file: File) => { const fd = new FormData(); fd.append("image", file); return ruangkeruangApi.uploadHeroImage(fd); }, onSuccess: (result: any) => { const value = result?.value?.hero_image_url; if (value) setSite((current) => ({ ...current, hero_image_url: value })); toast.success("Gambar hero tersimpan"); }, onError: () => toast.error("Gambar hero gagal diupload") });
  const change = (key: keyof typeof site) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSite((current) => ({ ...current, [key]: event.target.value }));
  if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin" /></div>;
  return <div className="max-w-4xl space-y-7 p-6">
    <div><h1 className="text-2xl font-bold">Konten Website Ruangkeruang</h1><p className="mt-1 text-sm text-muted-foreground">Atur hero, keunggulan, alur pemesanan, dan FAQ dari satu halaman.</p></div>
    <section className="space-y-4 rounded-lg border bg-card p-5"><h2 className="font-semibold">Hero dan CTA</h2><div className="grid gap-4 md:grid-cols-2"><div className="space-y-1"><Label>Nama brand</Label><Input value={site.name} onChange={change("name")} /></div><div className="space-y-1"><Label>Eyebrow</Label><Input value={site.eyebrow} onChange={change("eyebrow")} /></div></div><div className="space-y-1"><Label>Headline</Label><Textarea rows={2} value={site.headline} onChange={change("headline")} /></div><div className="space-y-1"><Label>Deskripsi</Label><Textarea rows={4} value={site.description} onChange={change("description")} /></div><div className="space-y-1"><Label>Link WhatsApp</Label><Input placeholder="https://wa.me/628..." value={site.whatsapp} onChange={change("whatsapp")} /></div><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={() => heroRef.current?.click()} disabled={upload.isPending}><Upload className="mr-2" size={16} />{upload.isPending ? "Mengupload..." : "Upload gambar hero"}</Button>{site.hero_image_url && <img src={site.hero_image_url} alt="Preview hero" className="h-16 w-28 rounded object-cover" />}<input ref={heroRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.currentTarget.value = ""; }} /></div></section>
    <ContentRows title="Keunggulan" description="Alasan yang benar-benar dimiliki Ruangkeruang." rows={highlights} setter={setHighlights} />
    <ContentRows title="Alur pemesanan" description="Langkah kerja aktual dari konsultasi sampai instalasi." rows={process} setter={setProcess} />
    <section className="space-y-4 rounded-lg border bg-card p-5"><div><h2 className="font-semibold">FAQ</h2><p className="text-sm text-muted-foreground">Pertanyaan yang relevan dengan calon klien Ruangkeruang.</p></div>{faq.map((item, index) => <div className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]" key={index}><Input aria-label={`Pertanyaan ${index + 1}`} placeholder="Pertanyaan" value={item.question} onChange={(e) => setFaq((items) => items.map((x, i) => i === index ? { ...x, question: e.target.value } : x))} /><Textarea aria-label={`Jawaban ${index + 1}`} placeholder="Jawaban" rows={2} value={item.answer} onChange={(e) => setFaq((items) => items.map((x, i) => i === index ? { ...x, answer: e.target.value } : x))} /><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setFaq((items) => items.filter((_, i) => i !== index))}><Trash2 size={16} /></Button></div>)}<Button type="button" variant="outline" onClick={() => setFaq((items) => [...items, emptyFaq])}><Plus className="mr-2" size={16} />Tambah FAQ</Button></section>
    <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2" size={16} />{save.isPending ? "Menyimpan..." : "Simpan semua konten"}</Button>
  </div>;
}

function ContentRows({ title, description, rows, setter }: { title: string; description: string; rows: Row[]; setter: React.Dispatch<React.SetStateAction<Row[]>> }) {
  return <section className="space-y-4 rounded-lg border bg-card p-5"><div><h2 className="font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>{rows.map((item, index) => <div className="grid gap-3 rounded-md border p-3 md:grid-cols-[.7fr_1fr_auto]" key={index}><Input aria-label={`${title} ${index + 1}`} placeholder="Judul" value={item.title} onChange={(e) => setter((items) => items.map((x, i) => i === index ? { ...x, title: e.target.value } : x))} /><Textarea placeholder="Deskripsi" rows={2} value={item.description} onChange={(e) => setter((items) => items.map((x, i) => i === index ? { ...x, description: e.target.value } : x))} /><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setter((items) => items.filter((_, i) => i !== index))}><Trash2 size={16} /></Button></div>)}<Button type="button" variant="outline" onClick={() => setter((items) => [...items, emptyRow])}><Plus className="mr-2" size={16} />Tambah item</Button></section>;
}
