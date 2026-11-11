import { ArrowRight, Phone, SearchX } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { useApp } from "@/store/AppContext";
import { cn, formatMoney, prettyDate, stageMeta } from "@/lib/utils";

export function CustomersView() {
  const { visibleLeads, staff, openLead, startOutbound, role, currentUser } = useApp();
  const active = visibleLeads.filter(l=>!["closed_won","closed_lost"].includes(l.stage));
  const pipeline = active.reduce((a,b)=>a+b.budget,0);
  const won = visibleLeads.filter(l=>l.stage==="closed_won").length;

  return (
    <div className="anim-fade-up mt-6">
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          {label:role==="staff"?"My leads":"Visible leads", value:String(visibleLeads.length)},
          {label:"Active pipeline", value:formatMoney(pipeline)},
          {label:"Deals ticketed", value:String(won)},
          {label:"Win rate", value:`${Math.round((won/Math.max(1,visibleLeads.length))*100)}%`},
        ].map(s=>(
          <div key={s.label} className="rounded-2xl border border-zinc-200/80 bg-white p-4">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">{s.label}</p>
            <p className="mt-1 font-display text-[22px] font-bold tracking-tight text-zinc-950">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
              <th className="px-5 py-3.5">Traveller</th><th className="px-3 py-3.5">Route</th>
              <th className="px-3 py-3.5">Stage</th><th className="px-3 py-3.5">Source</th>
              <th className="px-3 py-3.5">Budget</th><th className="px-3 py-3.5">Owner</th>
              <th className="px-3 py-3.5">Travel</th><th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleLeads.map((l,i)=>{
              const owner = staff.find(s=>s.id===l.assigned_to)??staff[0];
              const meta = stageMeta(l.stage);
              return (
                <tr key={l.id} onClick={()=>openLead(l.id)}
                  className="anim-fade-up cursor-pointer border-b border-zinc-50 transition last:border-0 hover:bg-blue-50/40"
                  style={{animationDelay:`${Math.min(i,8)*30}ms`}}>
                  <td className="px-5 py-3"><p className="text-[13px] font-bold text-zinc-900">{l.client_name}</p><p className="text-[10.5px] font-medium text-zinc-400">{l.phone}</p></td>
                  <td className="px-3 py-3"><span className="flex items-center gap-1 text-[12px] font-bold text-[#222468]">{l.origin_iata}<ArrowRight className="h-3 w-3"/>{l.destination_iata}</span><span className="text-[10px] font-medium text-zinc-400">{l.passengers} pax</span></td>
                  <td className="px-3 py-3"><span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold",meta.chip)}>{meta.short}</span></td>
                  <td className="px-3 py-3 text-[11px] font-semibold capitalize text-zinc-500">{l.source.replace("_"," ")}</td>
                  <td className="px-3 py-3 text-[12.5px] font-bold text-zinc-900">{formatMoney(l.budget)}</td>
                  <td className="px-3 py-3"><Avatar person={owner} size="xs"/></td>
                  <td className="px-3 py-3 text-[11px] font-semibold text-zinc-500">{prettyDate(l.travel_date)}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={e=>{ e.stopPropagation(); startOutbound(l.phone,l.id,l.client_name); }} className="rounded-full bg-[#222468] p-2 text-white transition hover:bg-[#EA7218]"><Phone className="h-3 w-3"/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleLeads.length===0&&(
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <SearchX className="h-6 w-6 text-zinc-300"/>
            <p className="text-[13px] font-semibold text-zinc-500">No leads match your filters</p>
            <p className="text-[11px] text-zinc-400">{role==="staff"?`Showing only leads assigned to ${currentUser.full_name}`:"Try clearing search or channel filters"}</p>
          </div>
        )}
      </div>
      <h2 className="mt-8 text-[15px] font-bold tracking-tight text-zinc-950">Pipeline view</h2>
      <KanbanBoard/>
    </div>
  );
}
