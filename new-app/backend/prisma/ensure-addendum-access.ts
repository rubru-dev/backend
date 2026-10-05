import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const permission = await prisma.permission.upsert({
    where: { name: "sales.addendum" },
    update: { module: "sales", label: "Sub-menu: Addendum Kontrak" },
    create: { name: "sales.addendum", module: "sales", label: "Sub-menu: Addendum Kontrak" },
  });
  const roles = await prisma.role.findMany({ where: { name: { in: ["Sales", "Sales Admin"] } } });
  for (const role of roles) {
    await prisma.rolePermission.upsert({
      where: { role_id_permission_id: { role_id: role.id, permission_id: permission.id } },
      update: {},
      create: { role_id: role.id, permission_id: permission.id },
    });
  }
  console.log(`Addendum access synced for: ${roles.map((role) => role.name).join(", ") || "no matching roles"}`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
