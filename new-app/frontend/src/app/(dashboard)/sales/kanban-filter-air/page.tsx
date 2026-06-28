import type { Metadata } from "next";
import { SalesKanbanPage } from "../kanban/kanban-page";

export const metadata: Metadata = { title: "Kanban Sales Filter Air" };

export default function Page() {
  return (
    <SalesKanbanPage
      source="filter-air"
      title="Kanban Sales Filter Air"
      summaryTitle="Summary Sales Filter Air"
      description="Pipeline sales Filter Air dari Follow Up Leads Filter Air."
    />
  );
}
