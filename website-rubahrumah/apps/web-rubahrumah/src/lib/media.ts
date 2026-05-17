const storageBase =
  process.env.NEXT_PUBLIC_STORAGE_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/(?:api\/)?v1\/?$/, "") ||
  "";

export function mediaUrl(path?: string | null) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (!storageBase) return path;
  return `${storageBase.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
