import type { JenisJasa } from "@rubahrumah/types";

export interface WALeadData {
  nama: string;
  whatsapp: string;
  alamat?: string;
  instagram?: string;
  // Per-jenis fields
  lantai?: number;
  model_bangunan?: string;
  paket?: string;
  jenis_ruangan?: string;
  gaya_interior?: string;
  luas?: number;
  budget?: number;
}

const JENIS_LABEL: Record<JenisJasa, string> = {
  BANGUN_RUMAH: "Bangun Rumah",
  RENOVASI: "Renovasi Rumah",
  DESIGN: "Design & Perencanaan",
  INTERIOR: "Interior Custom",
};

/**
 * Generate pesan WA terformat dari data form jasa
 */
export function generateWAMessage(jenis: JenisJasa, data: WALeadData): string {
  const lines: string[] = [
    `Halo Rubah Rumah, saya ingin konsultasi mengenai jasa *${JENIS_LABEL[jenis]}*`,
    ``,
    `*Data Saya:*`,
    `• Nama: ${data.nama}`,
    `• WhatsApp: ${data.whatsapp}`,
  ];

  if (data.alamat) lines.push(`• Alamat: ${data.alamat}`);
  if (data.instagram) lines.push(`• Instagram: @${data.instagram}`);

  lines.push(``);
  lines.push(`*Detail Kebutuhan:*`);

  if (jenis === "BANGUN_RUMAH" || jenis === "RENOVASI") {
    if (data.lantai) lines.push(`• Jumlah Lantai: ${data.lantai}`);
    if (data.model_bangunan) lines.push(`• Model Bangunan: ${data.model_bangunan}`);
  }

  if (jenis === "DESIGN") {
    if (data.paket) lines.push(`• Paket: ${data.paket}`);
    if (data.model_bangunan) lines.push(`• Model Bangunan: ${data.model_bangunan}`);
  }

  if (jenis === "INTERIOR") {
    if (data.jenis_ruangan) lines.push(`• Jenis Ruangan: ${data.jenis_ruangan}`);
    if (data.gaya_interior) lines.push(`• Gaya Interior: ${data.gaya_interior}`);
    if (data.luas) lines.push(`• Luas Ruangan: ${data.luas} m²`);
  }

  if (data.budget) {
    const formatted = new Intl.NumberFormat("id-ID").format(data.budget);
    lines.push(`• Budget: Rp${formatted}`);
  }

  lines.push(``);
  lines.push(`Mohon informasinya, terima kasih 🙏`);

  return lines.join("\n");
}

/**
 * Generate link WA dengan pesan
 */
export function generateWALink(number: string, message: string): string {
  // Normalize number: hapus +, 0 di depan → ganti dengan 62
  const normalized = number.replace(/^\+/, "").replace(/^0/, "62");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate link konsultasi umum
 */
export function generateWAConsultLink(number: string): string {
  const message = "Halo Rubah Rumah, saya ingin melakukan konsultasi!";
  return generateWALink(number, message);
}
