import { FileText, Plane } from "lucide-react";
import { FlightSearchPanel } from "@/components/flights/FlightSearchPanel";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/store/AppContext";
import { formatMoney, timeAgo } from "@/lib/utils";

export function FlightsView() {
  const { quotes, staff, settings, leads, openLead } = useApp();
  return (
    <div className="anim-fade-up mt-6 grid grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] items-start gap-6">
      <section className="min-h-[560px] rounded-3xl border border-zinc-200/80 bg-white/70 p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <FlightSearchPanel/>
      </section>
      <aside className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-bold tracking-tight text-zinc-950">Saved quotes</h2>
          <span className="rounded-full bg-zinc-950 px-2.5 py-0.5 text-[10px] font-bold text-white">{quotes.length}</span>
        </div>
        <div className="nice-scroll max-h-[620px] space-y-2.5 overflow-y-auto">
          {quotes.length===0&&(
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-200 py-14 text-center">
              <Plane className="h-6 w-6 -rotate-45 text-zinc-300"/>
              <p className="text-[12px] font-semibold text-zinc-500">No quotes saved yet</p>
              <p className="max-w-[220px] text-[10.5px] text-zinc-400">Search fares on the left, then "Save quote" or attach directly from a lead.</p>
            </div>
          )}
          {quotes.map(q=>{
            const agent = staff.find(s=>s.id===q.created_by)??staff[0];
            const lead = leads.find(l=>l.id===q.lead_id);
            return (
              <button key={q.id} onClick={()=>lead&&openLead(lead.id)} className="w-full rounded-2xl border border-zinc-200 p-4 text-left transition hover:border-[#222468]/30 hover:bg-blue-50/40">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-[#222468]"/>
                  <p className="text-[12.5px] font-bold text-zinc-900">{q.route} · {q.flight_details.airline}</p>
                  <span className="ml-auto rounded-full bg-[#222468]/10 px-2 py-px text-[9px] font-bold uppercase text-[#222468]">{q.provider}</span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Net {formatMoney(q.net_price,settings.currency)}</p>
                    <p className="font-display text-[18px] font-bold leading-tight text-zinc-950">{formatMoney(q.selling_price,settings.currency)}<span className="ml-1.5 align-middle text-[9.5px] font-bold uppercase tracking-wide text-emerald-600">+{q.markup_percent}% sell</span></p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400">
                    <Avatar person={agent} size="xs"/> {timeAgo(q.created_at)}
                  </div>
                </div>
                {lead&&<p className="mt-1.5 text-[10.5px] font-semibold text-[#222468]">Attached to {lead.client_name} →</p>}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
