import type { Metadata } from "next";
import { GoldenSalesKanbanPage } from "./kanban-page";

export const metadata: Metadata = { title: "Kanban Sales — RubahrumahxGolden" };

export default function Page() {
  return <GoldenSalesKanbanPage />;
}
