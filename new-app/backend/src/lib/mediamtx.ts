import { config } from "../config";

const API = config.mediamtxApiUrl;

/** Register or update an RTSP path in MediaMTX (on-demand). */
export async function registerPath(streamPath: string, rtspUrl: string): Promise<void> {
  const res = await fetch(`${API}/v3/config/paths/add/${streamPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: rtspUrl, sourceOnDemand: true }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`MediaMTX registerPath failed: ${res.status} ${body}`);
  }
}

/** Remove an RTSP path from MediaMTX. */
export async function removePath(streamPath: string): Promise<void> {
  const res = await fetch(`${API}/v3/config/paths/remove/${streamPath}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "");
    throw new Error(`MediaMTX removePath failed: ${res.status} ${body}`);
  }
}

/** Compute the HLS playlist URL for a given stream path. */
export function hlsUrl(streamPath: string): string {
  return `${config.mediamtxHlsBaseUrl}/${streamPath}/index.m3u8`;
}

/** Register all active RTSP cameras to MediaMTX. Call at server start. */
export async function syncCamerasToMediaMTX(
  cameras: Array<{ stream_path: string | null; stream_url: string; stream_type: string }>
): Promise<void> {
  const rtspCams = cameras.filter((c) => c.stream_type === "rtsp" && c.stream_path);
  if (rtspCams.length === 0) return;
  for (const cam of rtspCams) {
    try {
      await registerPath(cam.stream_path!, cam.stream_url);
    } catch (err) {
      console.warn(`[MediaMTX] Could not sync camera ${cam.stream_path}:`, (err as Error).message);
    }
  }
}
