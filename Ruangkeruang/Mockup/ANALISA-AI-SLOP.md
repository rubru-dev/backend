# Analisa AI-Slop Ruangkeruang

Tool yang digunakan: [slop-detect](https://github.com/ravidsrk/slop-detect), CLI `slop-detect` dengan 27 aturan visual dan 9 aturan copy.

## Baseline Homepage

- Design: **29/100 — Heavy — D+**
- Copy: **5/100 — Clean — A**
- Unified: **29/100 — Heavy — D+**
- Definitions: `2026.08`

Sinyal visual yang terdeteksi:

1. AI-default font stack menurut ruleset: Plus Jakarta Sans terdeteksi sebagai font generik.
2. Hero terdeteksi centered.
3. All-caps labels.
4. Numbered steps.
5. Bento-like grid.
6. Cream/beige default background.

Copy hanya menandai penggunaan em dash, sehingga copy axis masih Clean.

## Cara Menjalankan Ulang

Dari folder `Ruangkeruang/Mockup`:

```powershell
.\scan-mockup.ps1
```

Script akan menjalankan static server sementara, memindai tujuh halaman mockup, lalu menyimpan hasil JSON ke `slop-report.json`. Browser Chromium Playwright akan diunduh otomatis oleh `slop-detect` saat pemakaian pertama.

Untuk audit halaman yang sudah online, gunakan CLI langsung:

```powershell
npx --yes slop-detect https://domain-ruangkeruang.com --axes all --json
```

Audit URL produksi lebih representatif daripada file lokal karena engine memindai halaman melalui headless Chromium. API web juga membatasi pemanggilan langsung dari browser ke origin tertentu, jadi integrasi dashboard sebaiknya melalui backend/proxy atau CLI/CI, bukan `fetch` langsung dari HTML statis.
