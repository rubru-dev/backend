// Domain kanonik situs.
//
// Situs disajikan dari dua domain sekaligus (rubahrumah.com dan main.rubru.id),
// keduanya menampilkan konten identik. Tanpa penanda, Google membacanya sebagai
// duplicate content. Nilai ini dipakai untuk canonical URL, sitemap, dan robots.txt
// supaya hanya satu domain yang dianggap utama.
//
// Set NEXT_PUBLIC_SITE_URL saat build kalau domain utama berubah. Tanpa trailing slash.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://rubahrumah.com"
).replace(/\/$/, "");
