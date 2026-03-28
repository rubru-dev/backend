"use client";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface CameraPlayerProps {
  hlsUrl: string;
  cameraName: string;
}

const MAX_RETRIES = 8;       // maks retry sebelum error
const RETRY_DELAY_MS = 3000; // jeda antar retry (MediaMTX butuh ~5-10s untuk connect RTSP)

export default function CameraPlayer({ hlsUrl, cameraName }: CameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [retryCount, setRetryCount] = useState(0);

  function destroyHls() {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }

  function initHls() {
    const video = videoRef.current;
    if (!video) return;

    destroyHls();

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        manifestLoadingMaxRetry: 0, // kita handle retry sendiri
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        retryRef.current = 0;
        setRetryCount(0);
        video.play().catch(() => setState("error"));
        setState("playing");
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        // 404 / network error → MediaMTX belum siap, retry
        if (retryRef.current < MAX_RETRIES) {
          retryRef.current += 1;
          setRetryCount(retryRef.current);
          destroyHls();
          retryTimerRef.current = setTimeout(initHls, RETRY_DELAY_MS);
        } else {
          setState("error");
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => setState("error"));
        setState("playing");
      }, { once: true });
      video.addEventListener("error", () => setState("error"), { once: true });
    } else {
      setState("error");
    }
  }

  function startPlay() {
    const video = videoRef.current;
    if (!video) return;
    retryRef.current = 0;
    setRetryCount(0);
    setState("loading");
    initHls();
  }

  function stopPlay() {
    destroyHls();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    retryRef.current = 0;
    setRetryCount(0);
    setState("idle");
  }

  useEffect(() => {
    return () => { destroyHls(); };
  }, []);

  function requestFullscreen() {
    videoRef.current?.requestFullscreen?.();
  }

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative group">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted
        style={{ display: state === "playing" || state === "loading" ? "block" : "none" }}
      />

      {/* Idle: play button overlay */}
      {state === "idle" && (
        <button
          onClick={startPlay}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-400 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M10 7l13 7-13 7V7z" fill="#fb923c" />
            </svg>
          </div>
          <span className="text-slate-300 text-sm font-medium">{cameraName}</span>
        </button>
      )}

      {/* Loading / Retrying */}
      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300 text-sm">
            {retryCount === 0
              ? "Menghubungkan ke kamera..."
              : `Menunggu stream siap... (${retryCount}/${MAX_RETRIES})`}
          </span>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#ef4444" strokeWidth="2" />
            <path d="M14 14l12 12M26 14L14 26" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-slate-300 text-sm text-center px-4">
            Kamera tidak dapat dijangkau.<br />
            <span className="text-slate-500 text-xs">Pastikan MediaMTX berjalan dan kamera aktif.</span>
          </p>
          <button
            onClick={startPlay}
            className="text-orange-400 text-xs underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Controls when playing */}
      {state === "playing" && (
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-xs font-semibold">LIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={stopPlay}
              className="text-white/80 hover:text-white text-xs px-2 py-0.5 rounded bg-black/40"
            >
              Stop
            </button>
            <button
              onClick={requestFullscreen}
              className="text-white/80 hover:text-white"
              title="Fullscreen"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 6V2h4M12 2h4v4M16 12v4h-4M6 16H2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
