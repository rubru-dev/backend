import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("fumakilla2026", 10);
  await prisma.user.upsert({
    where: { email: "admin@fumakilla.co.id" },
    update: { isActive: true, role: "ADMIN" },
    create: {
      name: "Admin QC",
      email: "admin@fumakilla.co.id",
      password,
      role: "ADMIN",
    },
  });
  console.log("Seed selesai. Login: admin@fumakilla.co.id / fumakilla2026");
}

main().finally(() => prisma.$disconnect());
