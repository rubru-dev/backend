import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  { name: "ruangkeruang.view", module: "ruangkeruang", label: "Lihat modul Ruangkeruang" },
  { name: "ruangkeruang.manage", module: "ruangkeruang", label: "Kelola pengaturan front end Ruangkeruang" },
];

async function main() {
  const role = await prisma.role.upsert({
    where: { name: "Ruangkeruang Admin" },
    update: {},
    create: { name: "Ruangkeruang Admin" },
  });

  for (const definition of permissions) {
    const permission = await prisma.permission.upsert({
      where: { name: definition.name },
      update: { module: definition.module, label: definition.label },
      create: definition,
    });

    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: role.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: role.id,
        permission_id: permission.id,
      },
    });
  }

  console.log("Ruangkeruang access is ready.");
  console.log(`Role: Ruangkeruang Admin (id=${role.id.toString()})`);
  console.log(`Permissions: ${permissions.map((permission) => permission.name).join(", ")}`);
}

main()
  .catch((error) => {
    console.error("Failed to sync Ruangkeruang access:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
