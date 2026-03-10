import type { Metadata } from "next";
import { SalesKanbanPage } from "./kanban-page";

export const metadata: Metadata = { title: "Kanban Sales" };

export default function Page() {
  return <SalesKanbanPage />;
}
