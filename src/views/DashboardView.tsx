import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { PriorityTasks } from "@/components/dashboard/PriorityTasks";

export function DashboardView() {
  return (
    <div className="anim-fade-up">
      <div className="mt-6 flex items-stretch gap-6">
        <div className="min-w-0 flex-1"><FunnelChart/></div>
        <PriorityTasks/>
      </div>
      <KanbanBoard/>
    </div>
  );
}
