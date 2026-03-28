/**
 * Generate URL-friendly slug dari teks
 * @example generateSlug("Mr. H.D - Renovasi 2 Lantai") => "mr-hd-renovasi-2-lantai"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // hapus aksen
    .replace(/[^a-z0-9\s-]/g, "")    // hapus karakter spesial
    .trim()
    .replace(/\s+/g, "-")            // spasi → dash
    .replace(/-+/g, "-");            // multiple dash → single
}

/**
 * Truncate text dengan ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}
