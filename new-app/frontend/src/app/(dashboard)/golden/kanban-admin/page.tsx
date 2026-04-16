import { GoldenAdminKanbanBoard } from "./kanban-board";

export const metadata = { title: "Kanban Admin — RubahrumahxGolden" };

export default function GoldenKanbanAdminPage() {
  return (
    <div className="flex flex-col gap-4 h-full p-1">
      <div>
        <h1 className="text-2xl font-bold">Kanban Admin Golden</h1>
        <p className="text-muted-foreground text-sm">
          Tracking leads RubahrumahxGolden — W1, W2, W3, W4, Closing Survey, Move To Telemarketing
        </p>
      </div>
      <GoldenAdminKanbanBoard />
    </div>
  );
}
