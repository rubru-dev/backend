import { GoldenAdminKanbanBoard } from "@/app/(dashboard)/golden/kanban-admin/kanban-board";

export const metadata = { title: "Kanban Golden" };

export default function TelemarketingKanbanGoldenPage() {
  return (
    <div className="flex flex-col gap-4 h-full p-1">
      <div>
        <h1 className="text-2xl font-bold">Kanban Golden</h1>
        <p className="text-muted-foreground text-sm">
          Tracking leads Golden yang terhubung dengan Follow Up Leads Golden.
        </p>
      </div>
      <GoldenAdminKanbanBoard />
    </div>
  );
}
