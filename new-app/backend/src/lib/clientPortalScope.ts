import { prisma } from "./prisma";

type PortalProjectRef = {
  id: bigint;
  lead_id: bigint;
  adm_finance_project_id?: bigint | null;
};

export async function resolveClientPortalScope(project: PortalProjectRef) {
  const [sipilProjects, interiorProjects] = await Promise.all([
    prisma.proyekBerjalan.findMany({
      where: { lead_id: project.lead_id },
      select: {
        id: true,
        nama_proyek: true,
        updated_at: true,
        rab_items: { select: { id: true } },
      },
      orderBy: { updated_at: "desc" },
    }),
    prisma.proyekInterior.findMany({
      where: { lead_id: project.lead_id },
      select: { id: true, nama_proyek: true, updated_at: true },
      orderBy: { updated_at: "desc" },
    }),
  ]);

  const sipilIds = sipilProjects.map((item) => item.id);
  const interiorIds = interiorProjects.map((item) => item.id);
  const admFilters: any[] = [{ lead_id: project.lead_id }];
  if (project.adm_finance_project_id) admFilters.unshift({ id: project.adm_finance_project_id });
  if (sipilIds.length > 0) admFilters.push({ proyek_berjalan_id: { in: sipilIds } });
  if (interiorIds.length > 0) admFilters.push({ proyek_interior_id: { in: interiorIds } });

  const admProjects = await prisma.admFinanceProject.findMany({
    where: { OR: admFilters },
    include: {
      proyek_berjalan: {
        select: {
          id: true,
          nama_proyek: true,
          lead_id: true,
          rab_items: { select: { id: true } },
        },
      },
      proyek_interior: { select: { id: true, nama_proyek: true, lead_id: true } },
    },
    orderBy: { updated_at: "desc" },
  });

  const explicitAdm = project.adm_finance_project_id
    ? admProjects.find((item) => item.id === project.adm_finance_project_id)
    : null;
  const admProject = explicitAdm ?? admProjects[0] ?? null;

  const rabItemIds = new Set(sipilProjects.flatMap((item) => item.rab_items.map((rab) => rab.id)));
  const operationalProjects = new Map<string, { id: bigint; type: "sipil" | "interior"; nama_proyek: string | null }>();
  for (const item of sipilProjects) {
    operationalProjects.set(`sipil:${item.id}`, { id: item.id, type: "sipil", nama_proyek: item.nama_proyek });
  }
  for (const item of interiorProjects) {
    operationalProjects.set(`interior:${item.id}`, { id: item.id, type: "interior", nama_proyek: item.nama_proyek });
  }
  for (const adm of admProjects) {
    if (adm.proyek_berjalan) {
      const item = adm.proyek_berjalan;
      operationalProjects.set(`sipil:${item.id}`, { id: item.id, type: "sipil", nama_proyek: item.nama_proyek });
      item.rab_items.forEach((rab) => rabItemIds.add(rab.id));
    }
    if (adm.proyek_interior) {
      const item = adm.proyek_interior;
      operationalProjects.set(`interior:${item.id}`, { id: item.id, type: "interior", nama_proyek: item.nama_proyek });
    }
  }

  const invoiceLinks: any[] = [
    { lead_id: project.lead_id },
    { client_portal_project_id: project.id },
  ];
  if (rabItemIds.size > 0) invoiceLinks.push({ rab_item_id: { in: Array.from(rabItemIds) } });

  return {
    admProject,
    admProjects,
    operationalProjects: Array.from(operationalProjects.values()),
    invoiceLinks,
  };
}

export function visibleClientInvoiceWhere(scope: Awaited<ReturnType<typeof resolveClientPortalScope>>) {
  return {
    AND: [
      { OR: scope.invoiceLinks },
      { OR: [{ status: { in: ["Terbit", "Lunas"] } }, { kwitansi: { isNot: null } }] },
    ],
  };
}

export function paidClientInvoiceWhere(scope: Awaited<ReturnType<typeof resolveClientPortalScope>>) {
  return {
    AND: [
      { OR: scope.invoiceLinks },
      { OR: [{ status: "Lunas" }, { kwitansi: { isNot: null } }] },
    ],
  };
}
