import type { Metadata } from "next";
import { SalesKanbanPage } from "./kanban-page";

export const metadata: Metadata = { title: "Kanban Sales Rubru" };

export default function Page() {
  return <SalesKanbanPage />;
}
