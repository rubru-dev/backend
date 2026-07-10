// Central route definitions — update here if any path changes
export const ROUTES = {
  dashboard: "/dashboard",

  // Modul A
  inquiries: "/inquiries",
  inquiry: (id: string) => `/inquiries/${id}`,
  surveys: "/surveys",
  survey: (id: string) => `/surveys/${id}`,
  drawLayouts: "/draw-layout",
  drawLayout: (id: string) => `/draw-layout/${id}`,
  quotations: "/quotations",
  quotation: (id: string) => `/quotations/${id}`,
  quotationNew: (type?: "b2b" | "b2c") => type ? `/quotations/new?type=${type}` : "/quotations/new",

  // Modul B
  agreements: "/agreements",
  agreement: (id: string) => `/agreements/${id}`,
  serviceContracts: "/service-contracts",
  monthlyReports: "/monthly-report",
  simpleReport: (id: string) => `/monthly-report/simple/${id}`,
  renewals: "/renewals",

  // Modul C
  customers: "/customers",
  customer: (id: string) => `/customers/${id}`,

  // Modul D
  orderSheets: "/order-sheets",
  orderSheet: (id: string) => `/order-sheets/${id}`,
  vendors: "/vendors",

  // Modul E
  complaints: "/complaints",

  // Survey reports
  b2bReport: (surveyId: string) => `/b2b-report/${surveyId}`,
  b2cReport: (surveyId: string) => `/surveys/${surveyId}`,

  // Admin
  adminUsers: "/admin/users",
  adminRoles: "/admin/roles",
} as const;
