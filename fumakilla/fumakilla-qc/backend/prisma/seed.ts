import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Full permission catalog — must stay in sync with frontend app/admin/roles/page.tsx
const ALL_PERMISSIONS = [
  "dashboard.view",
  "customers.view", "customers.create", "customers.edit", "customers.delete",
  "inquiries.view", "inquiries.create", "inquiries.edit", "inquiries.delete",
  "inquiries.set_new_inquiry", "inquiries.set_non_sales_inquiry", "inquiries.set_pricelist_sent", "inquiries.set_contacted", "inquiries.set_survey_scheduled", "inquiries.set_survey_completed", "inquiries.set_quotation_sent", "inquiries.set_waiting_agreement", "inquiries.set_won_closing", "inquiries.set_lost",
  "quotations.view", "quotations.create", "quotations.edit", "quotations.delete", "quotations.set_sent", "quotations.set_approved", "quotations.set_rejected",
  "surveys.view", "surveys.create", "surveys.edit", "surveys.delete", "surveys.set_completed", "surveys.set_postponed", "surveys.set_cancelled", "surveys.b2b_report", "surveys.b2c_report",
  "after_surveys.view", "after_surveys.submit", "after_surveys.review", "after_surveys.approve",
  "agreements.view", "agreements.create", "agreements.edit", "agreements.delete", "agreements.set_sent", "agreements.set_signed", "agreements.set_active", "agreements.set_expired", "agreements.set_cancelled",
  "order_sheets.view", "order_sheets.create", "order_sheets.edit", "order_sheets.delete", "order_sheets.set_final", "order_sheets.set_sent", "order_sheets.set_completed", "order_sheets.set_cancelled",
  "service_contracts.view",
  "renewals.view", "renewals.create", "renewals.approve", "renewals.reject",
  "complaints.view", "complaints.create", "complaints.edit", "complaints.delete", "complaints.set_in_progress", "complaints.set_waiting_vendor", "complaints.set_waiting_customer", "complaints.set_resolved", "complaints.set_closed",
  "work_plans.view", "work_plans.view_all", "work_plans.create", "work_plans.edit", "work_plans.delete", "work_plans.set_in_progress", "work_plans.set_completed", "work_plans.set_cancelled",
  "monthly_reports.view", "monthly_reports.create", "monthly_reports.edit", "monthly_reports.select_type",
  "vendors.view", "vendors.create", "vendors.edit", "vendors.delete",
  "admin.users", "admin.roles", "admin.settings",
];

// SALES: everything operational, minus admin panel
const SALES_PERMISSIONS = ALL_PERMISSIONS.filter((p) => !p.startsWith("admin."));

// QA (PIC FI): inquiry, survey & after-survey handling + reports (read-mostly)
const QA_PERMISSIONS = [
  "dashboard.view",
  "customers.view",
  "inquiries.view", "inquiries.edit",
  "inquiries.set_new_inquiry", "inquiries.set_non_sales_inquiry", "inquiries.set_pricelist_sent", "inquiries.set_contacted", "inquiries.set_survey_scheduled", "inquiries.set_survey_completed", "inquiries.set_quotation_sent", "inquiries.set_waiting_agreement", "inquiries.set_won_closing", "inquiries.set_lost",
  "quotations.view",
  "surveys.view", "surveys.set_completed", "surveys.set_postponed", "surveys.set_cancelled", "surveys.b2b_report", "surveys.b2c_report",
  "after_surveys.view", "after_surveys.submit", "after_surveys.review", "after_surveys.approve",
  "agreements.view",
  "service_contracts.view",
  "complaints.view", "complaints.create", "complaints.set_in_progress", "complaints.set_waiting_vendor", "complaints.set_waiting_customer",
  "monthly_reports.view", "monthly_reports.create", "monthly_reports.edit", "monthly_reports.select_type",
  "work_plans.view", "work_plans.create", "work_plans.edit", "work_plans.set_in_progress", "work_plans.set_completed", "work_plans.set_cancelled",
];

async function main() {
  const password = await bcrypt.hash("fumakilla2026", 10);
  const superPassword = await bcrypt.hash("password", 10);

  // Roles (permissions are matched by name in login/auth middleware fallback)
  // "Super Admin" = bypass semua permission (lihat SUPER_ADMIN_ROLES di middleware/auth) & tidak bisa dihapus.
  const roles = [
    { name: "Super Admin", permissions: ALL_PERMISSIONS },
    { name: "ADMIN", permissions: ALL_PERMISSIONS },
    { name: "SALES", permissions: SALES_PERMISSIONS },
    { name: "QA", permissions: QA_PERMISSIONS },
  ];
  for (const r of roles) {
    await prisma.appRole.upsert({
      where: { name: r.name },
      update: { permissions: r.permissions },
      create: { name: r.name, permissions: r.permissions },
    });
  }

  const users = [
    { name: "Super Admin", email: "superadmin@gmail.com", role: "Super Admin", password: superPassword },
    { name: "Admin Fumakilla", email: "admin@fumakilla.co.id", role: "ADMIN" },
    { name: "Andi Pratama",    email: "surveyor@fumakilla.co.id", role: "SALES" },
    { name: "QA Fumakilla",    email: "qa@fumakilla.co.id", role: "QA" },
    { name: "Budi QA",         email: "qa2@fumakilla.co.id", role: "QA" },
  ];
  for (const u of users) {
    const pw = (u as any).password || password;
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, password: pw, role: u.role, isActive: true },
      create: { name: u.name, email: u.email, password: pw, role: u.role },
    });
  }

  console.log("Seed selesai.");
  console.log(`AppRole ADMIN: ${ALL_PERMISSIONS.length} permission (full akses)`);
  console.log(`AppRole QA: ${QA_PERMISSIONS.length} permission`);
  console.log("Login ADMIN: admin@fumakilla.co.id / fumakilla2026");
  console.log("Login QA:    qa@fumakilla.co.id / fumakilla2026  (+ qa2@fumakilla.co.id)");
}

main().finally(() => prisma.$disconnect());
