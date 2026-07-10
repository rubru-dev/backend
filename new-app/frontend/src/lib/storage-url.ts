export function storageUrl(path?: string | null): string {
  if (!path) return "";
  const value = String(path).trim();
  if (/^(data:|blob:)/i.test(value)) return value;

  const storageIndex = value.indexOf("/storage/");
  if (storageIndex >= 0) return `/api/v1${value.slice(storageIndex)}`;

  if (value.startsWith("/api/v1/storage/")) return value;
  return value;
}
