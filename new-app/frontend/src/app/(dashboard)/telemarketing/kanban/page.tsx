import { TelemarketingKanbanBoard } from "./kanban-board";

export const metadata = { title: "Kanban Admin Product" };

export default function KanbanTelemarketingPage() {
  return (
    <div className="flex flex-col gap-4 h-full p-1">
      <div>
        <h1 className="text-2xl font-bold">Kanban Admin Product</h1>
        <p className="text-muted-foreground text-sm">
          Tracking leads RKR dari Sales Admin Product dan Mitra.
        </p>
      </div>
      <TelemarketingKanbanBoard />
    </div>
  );
}
