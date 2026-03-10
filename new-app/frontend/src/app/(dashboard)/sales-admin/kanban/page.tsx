import { AdminKanbanBoard } from "./kanban-board";

export const metadata = { title: "Kanban Admin" };

export default function KanbanAdminPage() {
  return (
    <div className="flex flex-col gap-4 h-full p-1">
      <div>
        <h1 className="text-2xl font-bold">Kanban Admin</h1>
        <p className="text-muted-foreground text-sm">
          Tracking leads sales admin — W1, W2, W3, W4, Closing Survey, Move To Telemarketing
        </p>
      </div>
      <AdminKanbanBoard />
    </div>
  );
}
