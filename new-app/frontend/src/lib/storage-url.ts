export function storageUrl(path?: string | null): string {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (path.startsWith("/api/v1/storage/")) return path;
  if (path.startsWith("/storage/")) return `/api/v1${path}`;
  return path;
}
