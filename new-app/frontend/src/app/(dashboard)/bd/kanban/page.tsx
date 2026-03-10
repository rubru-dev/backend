import type { Metadata } from "next";
import { KanbanPage } from "./kanban-page";

export const metadata: Metadata = { title: "Kanban BD" };

export default function Page() {
  return <KanbanPage />;
}
