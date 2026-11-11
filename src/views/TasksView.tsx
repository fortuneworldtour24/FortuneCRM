import { CheckSquare, Plus } from "lucide-react";
import { useState } from "react";
import { TaskRow } from "@/components/dashboard/PriorityTasks";
import { useApp } from "@/store/AppContext";
import { cn } from "@/lib/utils";

export function TasksView() {
  const { tasks, addTask } = useApp();
  const [draft,setDraft] = useState("");
  const [tag,setTag] = useState("Follow-up");
  const [filter,setFilter] = useState<"all"|"open"|"done">("all");
  const open = tasks.filter(t=>!t.done);
  const shown = tasks.filter(t=>filter==="all"?true:filter==="open"?!t.done:t.done);

  return (
    <div className="anim-fade-up mt-6 grid grid-cols-[1fr_340px] gap-6">
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-5 flex gap-2">
          <input value={draft} onChange={e=>setDraft(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&draft.trim()){ addTask(draft.trim(),tag); setDraft(""); } }}
            placeholder="Add an operational task… (Enter to save)"
            className="h-11 flex-1 rounded-full border border-zinc-200 bg-white px-4 text-[13px] font-medium outline-none transition-all duration-200 placeholder:text-zinc-400 focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none focus-visible:outline-none"/>
          <select value={tag} onChange={e=>setTag(e.target.value)} className="h-11 rounded-full border border-zinc-200 bg-white px-3 text-[12px] font-semibold outline-none transition-all duration-200 focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none focus-visible:outline-none">
            {["Follow-up","Ticketing","Visa","Operations","Supplier","Marketing"].map(t=><option key={t}>{t}</option>)}
          </select>
          <button onClick={()=>{ if(draft.trim()){ addTask(draft.trim(),tag); setDraft(""); } }}
            className="flex h-11 items-center gap-1.5 rounded-full bg-[#222468] px-5 text-[12.5px] font-bold text-white transition hover:bg-[#EA7218]">
            <Plus className="h-4 w-4"/> Add
          </button>
        </div>
        <div className="mb-4 flex gap-1.5">
          {(["all","open","done"] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              className={cn("rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold capitalize transition",
                filter===f?"border-[#222468] bg-[#222468] text-white":"border-zinc-200 text-zinc-500 hover:border-zinc-400")}>
              {f}
            </button>
          ))}
        </div>
        <div className="anim-stagger space-y-1">{shown.map(t=><TaskRow key={t.id} task={t}/>)}</div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-3xl bg-zinc-950 p-6 text-white">
          <CheckSquare className="mb-3 h-5 w-5 text-[#EA7218]"/>
          <p className="font-display text-[34px] font-bold leading-none">{open.length}</p>
          <p className="mt-1 text-[12px] font-medium text-zinc-400">open priority tasks</p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#222468] to-[#EA7218]" style={{width:`${(tasks.filter(t=>t.done).length/Math.max(1,tasks.length))*100}%`}}/>
          </div>
          <p className="mt-2 text-[10.5px] font-semibold text-zinc-500">{tasks.filter(t=>t.done).length} of {tasks.length} completed this sprint</p>
        </div>
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6">
          <p className="text-[12.5px] font-bold text-zinc-900">Completion ritual</p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-zinc-500">Tick tasks as you finish them — completion syncs to the activity feed and the daily stand-up digest emailed at 08:30 AEDT.</p>
        </div>
      </aside>
    </div>
  );
}
