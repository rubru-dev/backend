import type { Metadata } from "next";
import { SalesKanbanPage } from "../kanban/kanban-page";

export const metadata: Metadata = { title: "Kanban Sales Golden" };

export default function Page() {
  return (
    <SalesKanbanPage
      source="golden"
      title="Kanban Sales Golden"
      summaryTitle="Summary Sales Golden"
      description="Pipeline sales Golden dari Follow Up Leads Golden."
    />
  );
}
