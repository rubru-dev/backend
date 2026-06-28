import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("fumakilla2026", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@fumakilla.co.id" },
    update: { name: "Admin Fumakilla", password, role: Role.ADMIN, isActive: true },
    create: { name: "Admin Fumakilla", email: "admin@fumakilla.co.id", password, role: Role.ADMIN },
  });
  const surveyor = await prisma.user.upsert({
    where: { email: "surveyor@fumakilla.co.id" },
    update: { name: "Andi Pratama", password, role: Role.SURVEYOR, isActive: true },
    create: { name: "Andi Pratama", email: "surveyor@fumakilla.co.id", password, role: Role.SURVEYOR },
  });
  const qa = await prisma.user.upsert({
    where: { email: "qa@fumakilla.co.id" },
    update: { name: "QA Fumakilla", password, role: Role.QA, isActive: true },
    create: { name: "QA Fumakilla", email: "qa@fumakilla.co.id", password, role: Role.QA },
  });
  const customer = await prisma.customer.create({ data: { code: "CUS-2026-001", name: "PT Maju Mundur", company: "PT Maju Mundur Sejahtera", phone: "+62 812-3456-7890", city: "Jakarta", address: "Jakarta Selatan", treatmentAddress: "Gedung Kantor Pusat, Jakarta Selatan", status: "ACTIVE", segment: "COMMERCIAL", segmentType: "Corporate", treatment: "Pest Control", treatmentFrequency: "Bulanan", agreementType: "Annual Service Agreement", agreementNumber: "AGR-2026-001", agreementStart: new Date(), agreementEnd: new Date(Date.now() + 365 * 86400000), picServiceName: "Budi Wijaya", picServicePhone: "+62 821-9876-5432", picScheduleName: "Siti Aminah", picSchedulePhone: "+62 812-1111-2222", salesOwner: "Admin Fumakilla", isPriority: true } });
  await prisma.inquiry.create({ data: { number: "INQ-2026-001", customerId: customer.id, service: "PC", source: "Whatsapp", status: "NEW", progress: "New Inquiry", result: "On Going", contactMonth: "Januari", picFiId: qa.id, picFiName: qa.name, segmentType: "B2B", serviceType: "PC", customerCity: "Jakarta", customerName: customer.name, companyName: customer.company || "", phone: customer.phone || "", ownerId: admin.id } });
  await prisma.quotation.create({ data: { number: "QUO-2026-001", customerId: customer.id, title: "Penawaran Pest Control", amount: 45200000, status: "SENT", ownerId: admin.id } });
  await prisma.renewal.create({ data: { number: "AGR-2026-001", customerId: customer.id, service: "Annual Maintenance", expiryDate: new Date(Date.now() + 7 * 86400000), progress: 25 } });
  const survey = await prisma.survey.create({ data: { number: "SRV-2026-001", customerId: customer.id, picId: surveyor.id, scheduledAt: new Date(), location: "Jakarta Selatan" } });
  await prisma.afterSurvey.create({ data: { surveyId: survey.id, reportDue: new Date(Date.now() + 86400000) } });
  await prisma.dailyReport.create({ data: { reportDate: new Date(), inquiryCount: 1, quotationCount: 1, surveyCount: 1, productivity: 92, authorId: admin.id } });
  await prisma.activityLog.createMany({ data: [
    { message: "Admin Fumakilla membuat inquiry baru", type: "INQUIRY", userId: admin.id },
    { message: "Andi Pratama dijadwalkan untuk survey", type: "SURVEY", userId: surveyor.id },
  ] });
}

main().then(() => console.log("Seed ERP selesai. Login: admin@fumakilla.co.id / fumakilla2026")).finally(() => prisma.$disconnect());
