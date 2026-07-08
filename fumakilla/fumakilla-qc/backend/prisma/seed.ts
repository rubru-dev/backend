import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Full permission catalog — must stay in sync with frontend app/admin/roles/page.tsx
const ALL_PERMISSIONS = [
  "dashboard.view",
  "customers.view", "customers.create", "customers.edit", "customers.delete",
  "inquiries.view", "inquiries.create", "inquiries.edit", "inquiries.delete", "inquiries.change_status",
  "quotations.view", "quotations.create", "quotations.edit", "quotations.delete", "quotations.change_status",
  "surveys.view", "surveys.create", "surveys.edit", "surveys.delete", "surveys.change_status", "surveys.b2b_report", "surveys.b2c_report",
  "after_surveys.view", "after_surveys.submit", "after_surveys.review", "after_surveys.approve",
  "agreements.view", "agreements.create", "agreements.edit", "agreements.delete", "agreements.change_status", "agreements.activate",
  "order_sheets.view", "order_sheets.create", "order_sheets.edit", "order_sheets.delete", "order_sheets.change_status",
  "service_contracts.view",
  "renewals.view", "renewals.create", "renewals.approve", "renewals.reject",
  "complaints.view", "complaints.create", "complaints.edit", "complaints.delete", "complaints.change_status", "complaints.resolve", "complaints.close",
  "work_plans.view", "work_plans.view_all", "work_plans.create", "work_plans.edit", "work_plans.delete", "work_plans.change_status",
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
  "inquiries.view", "inquiries.edit", "inquiries.change_status",
  "quotations.view",
  "surveys.view", "surveys.change_status", "surveys.b2b_report", "surveys.b2c_report",
  "after_surveys.view", "after_surveys.submit", "after_surveys.review", "after_surveys.approve",
  "agreements.view",
  "service_contracts.view",
  "complaints.view", "complaints.create", "complaints.change_status",
  "monthly_reports.view", "monthly_reports.create", "monthly_reports.edit", "monthly_reports.select_type",
  "work_plans.view", "work_plans.create", "work_plans.edit", "work_plans.change_status",
];

async function main() {
  const password = await bcrypt.hash("fumakilla2026", 10);

  // Roles (permissions are matched by name in login/auth middleware fallback)
  const roles = [
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
    { name: "Admin Fumakilla", email: "admin@fumakilla.co.id", role: "ADMIN" },
    { name: "Andi Pratama",    email: "surveyor@fumakilla.co.id", role: "SALES" },
    { name: "QA Fumakilla",    email: "qa@fumakilla.co.id", role: "QA" },
    { name: "Budi QA",         email: "qa2@fumakilla.co.id", role: "QA" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, password, role: u.role, isActive: true },
      create: { name: u.name, email: u.email, password, role: u.role },
    });
  }

  console.log("Seed selesai.");
  console.log(`AppRole ADMIN: ${ALL_PERMISSIONS.length} permission (full akses)`);
  console.log(`AppRole QA: ${QA_PERMISSIONS.length} permission`);
  console.log("Login ADMIN: admin@fumakilla.co.id / fumakilla2026");
  console.log("Login QA:    qa@fumakilla.co.id / fumakilla2026  (+ qa2@fumakilla.co.id)");
}

main().finally(() => prisma.$disconnect());
