import type { Metadata } from "next";
import { SalesKanbanPage } from "../kanban/kanban-page";

export const metadata: Metadata = { title: "Kanban Sales RKR" };

export default function Page() {
  return (
    <SalesKanbanPage
      source="rkr"
      title="Kanban Sales RKR"
      summaryTitle="Summary Sales RKR"
      description="Pipeline sales RKR dari Follow Up Leads RKR."
    />
  );
}
