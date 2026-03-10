import { TelemarketingKanbanBoard } from "./kanban-board";

export const metadata = { title: "Kanban Telemarketing" };

export default function KanbanTelemarketingPage() {
  return (
    <div className="flex flex-col gap-4 h-full p-1">
      <div>
        <h1 className="text-2xl font-bold">Kanban Telemarketing</h1>
        <p className="text-muted-foreground text-sm">
          Tracking leads telemarketing — From Sales Admin, W1–W4, Closing Survey, Move To Cold Database
        </p>
      </div>
      <TelemarketingKanbanBoard />
    </div>
  );
}
