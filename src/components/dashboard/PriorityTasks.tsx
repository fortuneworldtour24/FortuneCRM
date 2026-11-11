import { ArrowUpRight, Check } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/store/AppContext";
import { cn } from "@/lib/utils";
import type { TaskItem } from "@/types/database";

export const TONE_CHIP: Record<TaskItem["tone"],string> = {
  amber:"bg-amber-50 text-amber-700 border-amber-200/70",
  red:"bg-red-50 text-red-600 border-red-200/70",
  slate:"bg-zinc-100 text-zinc-500 border-zinc-200/70",
  blue:"bg-blue-50 text-blue-600 border-blue-200/70",
  green:"bg-emerald-50 text-emerald-600 border-emerald-200/70",
};

export function TaskRow({ task }:{ task:TaskItem }) {
  const { toggleTask, staff } = useApp();
  const owner = staff.find(s=>s.id===task.assignee)??staff[0];
  return (
    <div className={cn("group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition hover:border-zinc-200 hover:bg-zinc-50/80", task.done&&"opacity-55")}>
      <button onClick={()=>toggleTask(task.id)}
        className={cn("flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-lg border-2 transition",
          task.done?"border-[#222468] bg-[#222468] text-white":"border-zinc-300 text-transparent hover:border-[#222468]")}>
        <Check className="h-3 w-3" strokeWidth={3.5}/>
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13px] font-semibold text-zinc-800",task.done&&"line-through")}>{task.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className={cn("rounded-full border px-2 py-px text-[10px] font-bold",TONE_CHIP[task.tone])}>{task.dueLabel}</span>
          <span className="text-[10.5px] font-medium text-zinc-400">{task.tag}</span>
          <span className="h-1 w-10 overflow-hidden rounded-full bg-zinc-200">
            <span className={cn("block h-full rounded-full transition-all",task.done?"bg-emerald-500":"bg-[#222468]")} style={{width:`${task.progress}%`}}/>
          </span>
        </div>
      </div>
      <Avatar person={owner} size="xs"/>
    </div>
  );
}

export function PriorityTasks() {
  const { tasks, setView } = useApp();
  const open = tasks.filter(t=>!t.done);
  return (
    <section className="flex min-h-[248px] w-[380px] shrink-0 flex-col rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-zinc-950">
          Priority tasks
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1.5 text-[10.5px] font-bold text-white">{open.length+11}</span>
        </h2>
        <button onClick={()=>setView("tasks")} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"><ArrowUpRight className="h-4 w-4"/></button>
      </div>
      <div className="nice-scroll -mx-1 flex-1 space-y-0.5 overflow-y-auto px-1">
        {tasks.slice(0,5).map((t,i)=>(
          <div key={t.id} className="anim-fade-up" style={{animationDelay:`${i*60}ms`}}><TaskRow task={t}/></div>
        ))}
      </div>
      <button onClick={()=>setView("tasks")} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-200 py-2 text-[11.5px] font-semibold text-zinc-500 transition hover:border-[#EA7218] hover:text-[#EA7218]">
        View full task board <ArrowUpRight className="h-3 w-3"/>
      </button>
    </section>
  );
}
