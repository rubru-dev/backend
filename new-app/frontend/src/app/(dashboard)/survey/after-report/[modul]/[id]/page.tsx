"use client";

import { useParams } from "next/navigation";
import { KalenderSurvey } from "@/components/kalender-survey";

const VALID_MODUL = new Set(["sales-admin", "telemarketing", "database-client", "sales-client", "golden", "filter-air"]);

export default function AfterSurveyReportPage() {
  const params = useParams<{ modul: string; id: string }>();
  const modul = VALID_MODUL.has(params.modul) ? params.modul as "sales-admin" | "telemarketing" | "database-client" | "sales-client" | "golden" | "filter-air" : "sales-admin";
  const id = Number(params.id);

  return (
    <KalenderSurvey
      modul={modul}
      reportPage
      reportLeadId={Number.isFinite(id) ? id : undefined}
      useGoldenSurveyReportTemplate={modul === "golden"}
    />
  );
}
