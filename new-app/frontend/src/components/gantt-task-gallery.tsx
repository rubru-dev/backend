"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, ImageOff, Loader2, User } from "lucide-react";
import { laporanPicApi } from "@/lib/api/laporanPic";
import { storageUrl } from "@/lib/storage-url";

export function GanttTaskGallery({
  projectType,
  taskId,
}: {
  projectType: "sipil" | "interior";
  taskId: string;
}) {
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["gantt-task-gallery", projectType, taskId],
    queryFn: () => laporanPicApi.taskGallery(projectType, taskId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat foto pekerjaan…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <span>Foto pekerjaan gagal dimuat.</span>
        <button type="button" className="font-semibold underline underline-offset-2" onClick={() => refetch()}>
          Coba lagi
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-7 text-sm text-muted-foreground">
        <ImageOff className="h-4 w-4" />
        Belum ada foto untuk pekerjaan ini.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {data.map((photo, index) => (
        <a
          key={photo.id}
          href={storageUrl(photo.file_path)}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-md border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Buka foto ${index + 1} dari ${photo.source}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={storageUrl(photo.file_path)}
            alt={`Foto pekerjaan ${index + 1}`}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full bg-muted object-cover transition-opacity group-hover:opacity-90"
          />
          <div className="space-y-1 px-2 py-2 text-[11px] text-muted-foreground">
            <div className="font-medium text-foreground">{photo.source}</div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              {new Date(photo.created_at).toLocaleDateString("id-ID")}
            </div>
            {photo.uploader && (
              <div className="flex items-center gap-1 truncate">
                <User className="h-3 w-3 flex-none" aria-hidden="true" />
                <span className="truncate">{photo.uploader}</span>
              </div>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
