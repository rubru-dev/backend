"use client";
import { useState, useEffect } from "react";
import { portalApi } from "@/lib/apiClient";

interface CctvStream {
  id: number;
  nama: string;
  stream_url: string;
  stream_type: string; // youtube | hls | rtsp | iframe
}

function getYouTubeEmbedUrl(url: string) {
  // https://youtu.be/xxx or https://www.youtube.com/watch?v=xxx or https://www.youtube.com/live/xxx
  const patterns = [
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtube\.com\/live\/([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1`;
  }
  return null;
}

function StreamPlayer({ stream }: { stream: CctvStream }) {
  if (stream.stream_type === "youtube") {
    const embedUrl = getYouTubeEmbedUrl(stream.stream_url);
    if (embedUrl) {
      return (
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title={stream.nama}
          />
        </div>
      );
    }
  }

  if (stream.stream_type === "iframe") {
    return (
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
        <iframe
          src={stream.stream_url}
          className="w-full h-full"
          allowFullScreen
          title={stream.nama}
        />
      </div>
    );
  }

  if (stream.stream_type === "rtsp") {
    // RTSP tidak bisa langsung di-embed di browser — tampilkan info & copy URL
    return (
      <div className="w-full aspect-video bg-slate-800 rounded-xl flex flex-col items-center justify-center gap-4 p-6">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="10" width="36" height="24" rx="4" stroke="#94a3b8" strokeWidth="2"/>
          <circle cx="24" cy="22" r="5" stroke="#f97316" strokeWidth="2"/>
          <path d="M20 22a4 4 0 014-4M24 18v4l2.5 2.5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M18 38h12M24 34v4" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <div className="text-center">
          <p className="text-white font-semibold mb-1">Stream RTSP</p>
          <p className="text-slate-400 text-xs mb-3">
            RTSP tidak dapat diputar langsung di browser.<br/>
            Gunakan VLC, Tapo App, atau software RTSP player.
          </p>
          <div className="bg-slate-900 rounded-lg px-3 py-2 flex items-center gap-2 max-w-xs mx-auto">
            <code className="text-orange-400 text-xs break-all flex-1">{stream.stream_url}</code>
            <button
              onClick={() => navigator.clipboard.writeText(stream.stream_url)}
              className="shrink-0 text-slate-400 hover:text-white transition"
              title="Salin URL"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M3 11V4a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-2">
            Tapo C310: Buka Tapo App → Live View untuk akses langsung
          </p>
        </div>
      </div>
    );
  }

  // fallback / hls (tampilkan iframe atau pesan)
  return (
    <div className="w-full aspect-video bg-slate-800 rounded-xl flex items-center justify-center">
      <p className="text-slate-400 text-sm">Stream tidak dapat ditampilkan</p>
    </div>
  );
}

export default function MonitoringPage() {
  const [streams, setStreams] = useState<CctvStream[]>([]);
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([portalApi.me(), portalApi.monitoring()])
      .then(([p, s]) => { setProject(p); setStreams(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[#0F4C75] mb-1">
        {(project?.nama_proyek as string) ?? "Proyek"}
      </h1>
      <p className="text-sm text-slate-400 flex items-center gap-1 mb-5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="6" r="3" stroke="#94a3b8" strokeWidth="1.2"/>
        </svg>
        {(project?.alamat as string) ?? "-"}
      </p>

      <h2 className="text-base font-semibold text-slate-700 mb-4">Monitoring Live</h2>

      {streams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-4 text-slate-300">
            <rect x="6" y="10" width="36" height="24" rx="4" stroke="currentColor" strokeWidth="2"/>
            <circle cx="24" cy="22" r="5" stroke="currentColor" strokeWidth="2"/>
            <path d="M18 38h12M24 34v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="text-slate-400 font-medium mb-1">Belum ada kamera terpasang</p>
          <p className="text-slate-300 text-sm">Admin akan mengatur kamera CCTV live untuk proyek ini.</p>
        </div>
      ) : (
        <div className={`grid gap-5 ${streams.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
          {streams.map((stream) => (
            <div key={stream.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <StreamPlayer stream={stream} />
              <div className="px-4 py-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
                <span className="text-sm font-semibold text-slate-700">{stream.nama}</span>
                <span className="ml-auto text-xs text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                  {stream.stream_type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-5 flex items-start gap-3 bg-blue-50 border border-blue-100 text-blue-700 text-sm px-4 py-3 rounded-xl">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
          <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 8v4M9 6.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>
          Tampilan kamera live tergantung koneksi internet di lokasi proyek.
          Untuk kamera RTSP (Tapo C310), gunakan aplikasi <strong>Tapo</strong> untuk live view.
        </span>
      </div>
    </div>
  );
}
