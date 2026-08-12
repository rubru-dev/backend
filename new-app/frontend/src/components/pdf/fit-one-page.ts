// Utilitas agar dokumen (invoice / kwitansi) muat dalam SATU halaman, sehingga
// blok tanda tangan tidak pernah terpotong atau terdorong ke halaman kedua.
//
// Model tinggi yang dipakai sengaja sederhana tapi cukup akurat:
//
//   tinggi = teksTetap + spacing * spasiTetap
//          + Σ tinggi-teks-baris + jumlahBaris * spacing * spasiBaris
//
// Yang dikompres hanya margin/padding vertikal (faktor `spacing`, 1 = normal);
// ukuran font TIDAK ikut mengecil supaya dokumen tetap terbaca. Bila pada
// kompresi maksimum pun masih tidak muat, sebagian baris tabel dipindah ke
// halaman lampiran (`overflow`) — halaman pertama tetap berakhir di tanda tangan.

export const A4_HEIGHT = 841.89;

export interface FitInput {
  /** Tinggi area konten halaman (tinggi kertas - padding atas - padding bawah). */
  contentHeight: number;
  /** Tinggi teks/gambar blok tetap yang tidak ikut diskalakan. */
  fixedText: number;
  /** Total margin + padding vertikal blok tetap (ikut diskalakan). */
  fixedSpace: number;
  /** Tinggi teks tiap baris tabel (sudah memperhitungkan word-wrap). */
  rowText: number[];
  /** Padding + border vertikal satu baris tabel (ikut diskalakan). */
  rowSpace: number;
  /** Batas bawah kompresi spasi. */
  minSpacing?: number;
  /** Cadangan tinggi untuk menutup galat estimasi. */
  safety?: number;
}

export interface FitResult {
  /** Pengali margin/padding vertikal, 0.6 - 1. */
  spacing: number;
  /** Jumlah baris tabel yang dirender di halaman pertama. */
  rows: number;
  /** true bila sisa baris harus dipindah ke halaman lampiran. */
  overflow: boolean;
}

export function fitOnePage(input: FitInput): FitResult {
  const {
    contentHeight, fixedText, fixedSpace, rowText, rowSpace,
    minSpacing = 0.6, safety = 16,
  } = input;

  const budget = contentHeight - safety;
  const n = rowText.length;
  const sumText = rowText.reduce((a, b) => a + b, 0);
  const spaceNeeded = fixedSpace + n * rowSpace;

  const spacing = spaceNeeded > 0
    ? (budget - fixedText - sumText) / spaceNeeded
    : 1;

  if (spacing >= 1) return { spacing: 1, rows: n, overflow: false };
  if (spacing >= minSpacing) return { spacing, rows: n, overflow: false };

  // Kompresi maksimum masih kurang → potong jumlah baris, sisakan ruang untuk
  // satu baris keterangan "… item lainnya, lihat lampiran".
  const heightAt = (k: number) =>
    fixedText + minSpacing * fixedSpace +
    rowText.slice(0, k).reduce((a, b) => a + b, 0) + k * minSpacing * rowSpace;
  const extraRow = (rowText[0] ?? 12) + minSpacing * rowSpace;

  let rows = n;
  while (rows > 0 && heightAt(rows) + extraRow > budget) rows--;

  return { spacing: minSpacing, rows, overflow: true };
}

/**
 * Perkiraan jumlah baris hasil word-wrap. Lebar rata-rata karakter pada font
 * Helvetica ≈ 0.5 × fontSize; cukup untuk estimasi tata letak.
 */
export function estimateLines(
  text: string | null | undefined, width: number, fontSize: number,
): number {
  if (!text) return 0;
  const perLine = Math.max(1, Math.floor(width / (fontSize * 0.5)));
  return text.split("\n").reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(line.trim().length / perLine)), 0,
  );
}
