export function storageUrl(path?: string | null): string {
  if (!path) return "";
  const value = String(path).trim();
  if (/^(data:|blob:)/i.test(value)) return value;

  const storageIndex = value.indexOf("/storage/");
  if (storageIndex >= 0) return `/api/v1${value.slice(storageIndex)}`;

  if (value.startsWith("/api/v1/storage/")) return value;
  if (/^[^/?#]+\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(value)) {
    return `/api/v1/storage/pic-docs/${value}`;
  }
  return value;
}
