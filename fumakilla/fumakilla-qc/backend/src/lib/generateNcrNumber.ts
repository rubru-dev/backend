import { Prisma } from "@prisma/client";
import prisma from "../prisma";

async function nextNcrNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.nCR.count({
    where: { ncrNumber: { startsWith: `NCR-${year}-` } },
  });
  return `NCR-${year}-${String(count + 1).padStart(3, "0")}`;
}

export async function createWithNcrNumber<T>(create: (ncrNumber: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await create(await nextNcrNumber());
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
  throw Object.assign(new Error("Gagal membuat nomor NCR unik"), { status: 409 });
}
