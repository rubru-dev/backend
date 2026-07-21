/**
 * Seeder DATA DEMO REALISTIS — untuk menampilkan aplikasi siap launching.
 * Jalankan: npx tsx prisma/seed-demo.ts   (pastikan `npm run seed` sudah dijalankan agar user/role ada)
 * Kode/nomor pakai prefix "D" agar tidak bentrok dengan data produksi. Aman di-rerun (try/catch skip duplikat).
 */
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (d: number) => { const x = new Date(); x.setDate(x.getDate() - d); return x; };
const monthName = (d: Date) => ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][d.getMonth()];
const pad = (n: number, w = 3) => String(n).padStart(w, "0");

const CITIES = ["Jakarta","Bogor","Depok","Tangerang","Bekasi","Bandung","Purwakarta","Semarang","Surabaya"];
const SERVICE_TYPES = ["PC","RC","PCRC","Termite Control","Other Pests"];
const SOURCES = ["Whatsapp","Instagram","Tiktok","Referal"];
const PROGRESS = ["New Inquiry","Contacted","Pricelist Sent","Survey Scheduled","Survey Completed","Quotation Sent","Waiting Agreement","Won/Closing","Lost/Not Interest"];

const B2B = [
  ["PT Indofood Sukses Makmur", "Food & Beverage", "Jakarta"],
  ["PT Kalbe Farma Tbk", "Pharmaceutical", "Bekasi"],
  ["RS Siloam Hospitals", "Hospital / Healthcare", "Tangerang"],
  ["Hotel Santika Premiere", "Hotel", "Bogor"],
  ["Mall Kota Kasablanka", "Mall", "Jakarta"],
  ["PT Mayora Indah Tbk", "Food & Beverage", "Tangerang"],
  ["Apartemen Taman Anggrek", "Residential - Apartment", "Jakarta"],
  ["PT Astra International Tbk", "Manufacturing (Non-F&B)", "Jakarta"],
  ["Gudang Logistik JNE Express", "Warehouse / Logistics", "Bekasi"],
  ["Sekolah Islam Al-Azhar", "School / Education", "Jakarta"],
  ["Restoran Sederhana Bintaro", "Restaurant / Café", "Tangerang"],
  ["PT Unilever Indonesia Tbk", "Manufacturing (Non-F&B)", "Bekasi"],
  ["Kawasan Industri MM2100", "Manufacturing (Non-F&B)", "Bekasi"],
  ["PT Semen Indonesia Tbk", "Manufacturing (Non-F&B)", "Semarang"],
] as const;

const B2C = [
  ["Bapak Andi Wijaya", "Residential - House", "Depok"],
  ["Ibu Sri Rahayu", "Residential - House", "Bogor"],
  ["Bapak Hendra Gunawan", "Residential - Ruko", "Jakarta"],
  ["Ibu Maria Susanti", "Residential - Apartment", "Tangerang"],
  ["Bapak Budi Santoso", "Residential - House", "Bekasi"],
  ["Ibu Dewi Lestari", "Residential - House", "Bandung"],
] as const;

const VENDORS = [
  ["Pestigo Indonesia", "Jakarta, Bogor, Depok"],
  ["Istapest Solution", "Tangerang, Jakarta Barat"],
  ["Pascal Pest Control", "Bekasi, Cikarang"],
  ["PCO Nusantara", "Jakarta, Tangerang"],
  ["SPC Hygiene", "Bandung, Purwakarta"],
  ["Riztra Pest Management", "Semarang, Surabaya"],
] as const;

const PIC_NAMES = ["Rudi Hartono","Siti Nurhaliza","Agus Salim","Rina Marlina","Dodi Firmansyah","Lina Kusuma","Bambang Sutrisno","Fitri Handayani"];
const COMPLAINT_TYPES = ["Hama masih muncul", "Jadwal treatment terlewat", "Bau pestisida menyengat", "Teknisi tidak datang", "Hasil kurang efektif", "Keterlambatan laporan"];

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch (e: any) { if (String(e?.code) === "P2002") return null; console.warn(`skip ${label}: ${e?.message?.slice(0, 80)}`); return null; }
}
const D = (v: number) => new Prisma.Decimal(v);

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", isActive: true } });
  const qas = await prisma.user.findMany({ where: { role: "QA", isActive: true } });
  const sales = await prisma.user.findFirst({ where: { role: "SALES", isActive: true } });
  if (!admin || !qas.length) { console.error("Jalankan `npm run seed` dulu — butuh user ADMIN & QA."); process.exit(1); }
  const owner = sales?.id || admin.id;
  const qa = () => pick(qas);

  console.log("Seeding customers…");
  const customers: any[] = [];
  let cn = 1;
  for (const [name, segment, city] of B2B) {
    const c = await safe("cust", () => prisma.customer.create({ data: {
      code: `CUS-D${pad(cn)}`, name: pick(PIC_NAMES), company: name, segmentType: "B2B", segment, city,
      treatmentAddress: `Jl. ${pick(["Sudirman","Gatot Subroto","MH Thamrin","Ahmad Yani","Diponegoro"])} No. ${rnd(1, 99)}, ${city}`,
      phone: `021-${rnd(5000000, 8999999)}`, email: `procurement@${name.replace(/[^a-z]/gi, "").toLowerCase().slice(0, 12)}.co.id`,
      status: pick(["Kontrak", "Kontrak", "Non-Kontrak", "Renewal"]), leadSource: pick(SOURCES), treatment: pick(SERVICE_TYPES),
      picServiceName: pick(PIC_NAMES), picServicePhone: `08${rnd(11, 89)}${rnd(10000000, 99999999)}`,
    } }));
    if (c) customers.push(c); cn++;
  }
  for (const [name, segment, city] of B2C) {
    const c = await safe("cust", () => prisma.customer.create({ data: {
      code: `CUS-D${pad(cn)}`, name, segmentType: "B2C", segment, city,
      treatmentAddress: `Perum ${pick(["Citra Garden","Green Ville","Taman Harapan","Bumi Serpong"])} Blok ${pick(["A","B","C"])}${rnd(1, 20)}, ${city}`,
      phone: `08${rnd(11, 89)}${rnd(10000000, 99999999)}`, status: pick(["Kontrak", "Non-Kontrak"]), leadSource: pick(SOURCES), treatment: pick(SERVICE_TYPES),
    } }));
    if (c) customers.push(c); cn++;
  }
  console.log(`  ${customers.length} customer`);

  console.log("Seeding vendors…");
  let vn = 1; const vendors: any[] = [];
  for (const [name, area] of VENDORS) {
    const v = await safe("vendor", () => prisma.vendor.create({ data: {
      code: `VEN-D${pad(vn)}`, name, vendorType: "Pest Control", serviceCategories: ["Pest Control", "Termite Control"],
      picName: pick(PIC_NAMES), phone: `08${rnd(11, 89)}${rnd(10000000, 99999999)}`, coverageArea: area,
      rating: rnd(3, 5), status: pick(["ACTIVE", "ACTIVE", "INACTIVE"]) as any, bankName: pick(["BCA", "Mandiri", "BNI", "BRI"]), bankAccountName: name,
    } }));
    if (v) vendors.push(v); vn++;
  }
  console.log(`  ${vendors.length} vendor`);

  console.log("Seeding inquiries…");
  const inquiries: any[] = [];
  for (let i = 0; i < 24; i++) {
    const c = pick(customers); const d = daysAgo(rnd(1, 300)); const st = pick(SERVICE_TYPES); const q = qa();
    const inq = await safe("inq", () => prisma.inquiry.create({ data: {
      number: `INQ-D${pad(i + 1, 4)}`, customerId: c.id, service: st, serviceType: st, source: pick(SOURCES),
      inquiryDate: d, contactMonth: monthName(d), progress: pick(PROGRESS), result: pick(["On Going", "On Going", "Won/Closing", "Lost"]),
      picFiId: q.id, picFiName: q.name, segmentType: c.segmentType, customerCity: c.city || pick(CITIES),
      customerName: c.name, companyName: c.company || "", phone: c.phone || "-", areaSizeM2: D(rnd(50, 5000)),
      buildingType: c.segmentType, salesPic: q.name, ownerId: owner, address: c.treatmentAddress || c.city || "-",
    } }));
    if (inq) inquiries.push({ ...inq, customer: c });
  }
  console.log(`  ${inquiries.length} inquiry`);

  console.log("Seeding quotations…");
  const quotations: any[] = [];
  for (let i = 0; i < 16; i++) {
    const inq = pick(inquiries); const amount = rnd(5, 150) * 1_000_000;
    const q = await safe("quo", () => prisma.quotation.create({ data: {
      number: `QT-D${pad(i + 1, 4)}`, customerId: inq.customer.id, inquiryId: inq.id,
      title: `Penawaran ${pick(SERVICE_TYPES)} — ${inq.customer.company || inq.customer.name}`,
      amount: D(amount), status: pick(["DRAFT", "SENT", "SENT", "APPROVED", "APPROVED"]) as any,
      segmentType: inq.customer.segmentType, quotationDate: daysAgo(rnd(1, 200)), ownerId: owner,
    } }));
    if (q) quotations.push({ ...q, customer: inq.customer });
  }
  console.log(`  ${quotations.length} quotation`);

  console.log("Seeding agreements…");
  let an = 1;
  for (const q of quotations.filter((x) => x.status === "APPROVED").slice(0, 12)) {
    const mulai = daysAgo(rnd(30, 180)); const berakhir = new Date(mulai); berakhir.setFullYear(berakhir.getFullYear() + 1);
    const nilai = Number(q.amount);
    await safe("agr", () => prisma.agreement.create({ data: {
      number: `AGR/FMK/D/${pad(an)}`, customerId: q.customer.id, quotationId: q.id, jenisLayanan: pick(SERVICE_TYPES),
      lokasiPekerjaan: q.customer.treatmentAddress || q.customer.city || "-", tanggal: mulai, tanggalMulai: mulai, tanggalBerakhir: berakhir,
      durasiKontrak: 12, nilaiKontrak: D(nilai), ppn: D(nilai * 0.11), grandTotal: D(nilai * 1.11),
      status: pick(["ACTIVE", "ACTIVE", "SIGNED", "DRAFT"]) as any, picKlienNama: pick(PIC_NAMES), ttdFumakillaNama: admin.name,
    } }));
    an++;
  }
  console.log(`  ${an - 1} agreement`);

  console.log("Seeding surveys…");
  let sn = 1;
  for (const inq of inquiries.slice(0, 14)) {
    const q = qa();
    await safe("survey", () => prisma.survey.create({ data: {
      number: `SVY-D${pad(sn, 4)}`, customerId: inq.customer.id, inquiryId: inq.id, picId: q.id,
      scheduledAt: daysAgo(rnd(-14, 120)), location: inq.customer.treatmentAddress || inq.customer.city || "Lokasi klien",
      status: pick(["SCHEDULED", "COMPLETED", "COMPLETED", "POSTPONED"]) as any,
    } }));
    sn++;
  }
  console.log(`  ${sn - 1} survey`);

  console.log("Seeding order sheets…");
  const orderSheets: any[] = [];
  for (let i = 0; i < 12; i++) {
    const c = pick(customers); const v = pick(vendors); const sub = rnd(3, 80) * 1_000_000;
    const os = await safe("os", () => prisma.orderSheet.create({ data: {
      number: `OS-D${pad(i + 1, 4)}`, customerId: c.id, vendorId: v.id, orderDate: daysAgo(rnd(1, 150)),
      jobTitle: `${pick(SERVICE_TYPES)} — ${c.company || c.name}`, serviceType: pick(SERVICE_TYPES),
      status: pick(["DRAFT", "SENT", "FINAL", "COMPLETED", "COMPLETED"]) as any, picInternal: pick(PIC_NAMES),
      subtotal: D(sub), ppnPercent: D(11), ppnAmount: D(sub * 0.11), grandTotal: D(sub * 1.11), customerSnapshot: { name: c.name, company: c.company },
    } }));
    if (os) orderSheets.push({ ...os, customer: c, vendor: v });
  }
  console.log(`  ${orderSheets.length} order sheet`);

  console.log("Seeding complaints…");
  for (let i = 0; i < 10; i++) {
    const c = pick(customers); const os = pick(orderSheets);
    await safe("complaint", () => prisma.complaint.create({ data: {
      number: `CMP-D${pad(i + 1, 4)}`, customerId: c.id, vendorId: os?.vendor?.id || null, orderSheetId: Math.random() > .5 ? os?.id : null,
      segmentType: c.segmentType, source: pick(["CUSTOMER", "INTERNAL", "VENDOR"]) as any, complaintType: pick(COMPLAINT_TYPES),
      priority: pick(["LOW", "NORMAL", "NORMAL", "HIGH", "URGENT"]) as any, status: pick(["OPEN", "IN_PROGRESS", "WAITING_VENDOR", "RESOLVED", "CLOSED"]) as any,
      subject: `${pick(COMPLAINT_TYPES)} di ${c.company || c.name}`, description: "Laporan keluhan pelanggan terkait pelaksanaan treatment. Perlu tindak lanjut tim teknis.",
      complaintDate: daysAgo(rnd(1, 90)), reportedByName: c.picServiceName || c.name, picInternal: pick(PIC_NAMES),
    } }));
  }
  console.log("  10 complaint");

  console.log("Seeding work plans…");
  for (let i = 0; i < 20; i++) {
    const q = qa(); const wd = daysAgo(rnd(-10, 30));
    const sh = rnd(7, 15); const eh = sh + rnd(1, 3);
    await safe("wp", () => prisma.workPlan.create({ data: {
      title: pick(["Survey lokasi", "Treatment rutin", "Follow up client", "Meeting internal", "Kunjungan vendor", "QC lapangan", "Briefing pagi"]) + " — " + pick(customers).name,
      workDate: wd, startTime: `${pad(sh, 2)}:00`, endTime: `${pad(eh, 2)}:00`, location: pick(CITIES),
      status: pick(["PLANNED", "IN_PROGRESS", "COMPLETED", "COMPLETED"]) as any, ownerId: q.id, createdById: admin.id,
      description: "Rencana kegiatan operasional harian.",
    } }));
  }
  console.log("  20 work plan");

  console.log("Seeding activity logs…");
  const acts = ["membuat inquiry baru","mengubah status quotation menjadi APPROVED","approve agreement","membuat order sheet","menyelesaikan complaint","menambah customer baru","submit laporan survey","membuat work plan","mengaktivasi agreement","mengubah data vendor"];
  const allUsers = [admin, sales, ...qas].filter(Boolean) as any[];
  for (let i = 0; i < 40; i++) {
    const u = pick(allUsers);
    await safe("log", () => prisma.activityLog.create({ data: {
      message: `${u.name} ${pick(acts)}`, type: pick(["INQUIRY","QUOTATION","AGREEMENT","ORDER_SHEET","COMPLAINT","CUSTOMER","SURVEY","WORK_PLAN"]),
      userId: u.id, createdAt: daysAgo(rnd(0, 180)),
    } }));
  }
  console.log("  40 activity log");

  console.log("\n✓ Seed demo selesai — data realistis siap ditampilkan.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
