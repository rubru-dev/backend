"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { storageUrl } from "@/lib/storage-url";
import { Button } from "@/components/ui/button";

function AbsenPhoto({ src, label }: { src: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <div className="space-y-2">
    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    {!src ? <p className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">Foto tidak tersedia.</p>
      : failed ? <div role="alert" className="space-y-2 rounded-lg border p-3 text-sm">
        <p>Gagal memuat {label.toLowerCase()}.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => { setFailed(false); setLoaded(false); setAttempt((value) => value + 1); }}>Coba lagi</Button>
      </div> : <>
        {!loaded && <p role="status" className="text-xs text-muted-foreground">Memuat foto…</p>}
        <img key={attempt} src={storageUrl(src)} alt={label} className="max-h-80 w-full rounded-lg border object-contain" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      </>}
  </div>;
}

// Mount only inside an opened attendance dialog, never in the list rows.
export function AbsenPhotos({ recordId }: { recordId: string | number }) {
  const photos = useQuery({
    queryKey: ["absen-photos", String(recordId)],
    queryFn: ({ signal }) => apiClient.get<{ foto_masuk: string | null; foto_keluar: string | null }>(`/absen-karyawan/admin/${encodeURIComponent(String(recordId))}/foto`, { signal }).then((response) => response.data),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (photos.isPending) return <p role="status" className="py-4 text-sm text-muted-foreground">Memuat foto absensi…</p>;
  if (photos.isError) return <div role="alert" className="space-y-2 py-3 text-sm">
    <p>Gagal memuat foto absensi.</p>
    <Button type="button" variant="outline" size="sm" disabled={photos.isFetching} onClick={() => photos.refetch()}>{photos.isFetching ? "Memuat…" : "Coba lagi"}</Button>
  </div>;
  return <div className="grid grid-cols-2 gap-3">
    <AbsenPhoto key={`${recordId}:masuk:${photos.dataUpdatedAt}`} src={photos.data.foto_masuk} label="Foto Masuk" />
    <AbsenPhoto key={`${recordId}:keluar:${photos.dataUpdatedAt}`} src={photos.data.foto_keluar} label="Foto Keluar" />
  </div>;
}
