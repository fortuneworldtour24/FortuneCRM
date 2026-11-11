import { Inbox, Plus } from "lucide-react";
import { useState } from "react";
import { LeadCard } from "@/components/dashboard/LeadCard";
import { useApp } from "@/store/AppContext";
import { cn, formatMoney, STAGES } from "@/lib/utils";

export function KanbanBoard() {
  const { leadsByStage, moveLead, setAddLeadOpen, role } = useApp();
  const [over, setOver] = useState<string|null>(null);

  return (
    <div className="no-scrollbar -mx-1 mt-6 overflow-x-auto px-1 pb-2">
      <div className="grid min-w-[1100px] grid-cols-4 gap-5">
        {STAGES.map(stage => {
          const leads = leadsByStage(stage.key);
          const value = leads.reduce((a,l)=>a+l.budget,0);
          return (
            <section key={stage.key}
              onDragOver={e=>{ e.preventDefault(); setOver(stage.key); }}
              onDragLeave={()=>setOver(o=>o===stage.key?null:o)}
              onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("text/lead-id"); if(id) moveLead(id,stage.key); setOver(null); }}
              className={cn("flex max-h-[calc(100vh-420px)] min-h-[240px] flex-col rounded-3xl transition-colors",
                over===stage.key&&"bg-[#222468]/5 outline-dashed outline-2 outline-[#222468]/30")}>
              <header className="mb-3 flex items-center gap-2 px-1.5">
                <span className="h-2 w-2 rounded-full" style={{background:stage.dot}}/>
                <h2 className="text-[13.5px] font-bold tracking-tight text-zinc-900">{stage.label}</h2>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-[10px] font-bold text-white">{leads.length}</span>
                <span className="ml-auto text-[10.5px] font-semibold text-zinc-400">{formatMoney(value)}</span>
                <button onClick={()=>setAddLeadOpen(true)} className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700"><Plus className="h-3.5 w-3.5"/></button>
              </header>
              <div className="nice-scroll anim-stagger flex-1 space-y-3 overflow-y-auto px-0.5 pb-4">
                {leads.map(lead=><LeadCard key={lead.id} lead={lead}/>)}
                {leads.length===0&&(
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-200 py-10 text-center">
                    <Inbox className="h-5 w-5 text-zinc-300"/>
                    <p className="text-[11px] font-medium text-zinc-400">{role==="staff"?"No assigned leads":"Drag a lead here"}</p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
