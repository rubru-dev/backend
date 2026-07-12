// Reverse geocode lat/lng → nama lokasi (OpenStreetMap Nominatim, gratis tanpa API key).
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`;
    const r = await fetch(url, { headers: { "User-Agent": "RubahRumah-ERP/1.0 (visit-attendance)" } });
    if (!r.ok) return null;
    const j: any = await r.json();
    return j?.display_name ?? null;
  } catch {
    return null;
  }
}

export function numOrNull(v: unknown): number | null {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}
