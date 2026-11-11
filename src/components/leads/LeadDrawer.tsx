import { Calendar, Mail, MessageCircle, Phone, PhoneIncoming, PhoneOutgoing, StickyNote, Users, Wallet, X } from "lucide-react";
import { useEffect } from "react";
import { FlightSearchPanel } from "@/components/flights/FlightSearchPanel";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/store/AppContext";
import { cn, formatDuration, formatMoney, prettyDate, STAGES, timeAgo } from "@/lib/utils";

export function LeadDrawer() {
  const { selectedLead:lead, closeLead, staff, role, updateLead, moveLead, startOutbound, calls, settings, pushToast } = useApp();

  useEffect(()=>{
    if (!lead) return;
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") closeLead(); };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[lead,closeLead]);

  if (!lead) return null;

  const owner = staff.find(s=>s.id===lead.assigned_to)??staff[0];
  const leadCalls = calls.filter(c=>c.lead_id===lead.id);
  const meta = STAGES.find(s=>s.key===lead.stage);

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="anim-fade-in absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={closeLead}/>
      <div className="anim-drawer absolute bottom-3 right-3 top-3 flex w-[min(1080px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-[#F7F8FA] shadow-[0_40px_90px_-20px_rgba(0,0,0,0.5)]">
        <header className="flex flex-wrap items-center gap-3 border-b border-zinc-200/80 bg-white px-6 py-4">
          <Avatar person={owner} size="md" showStatus/>
          <div className="min-w-0">
            <h2 className="font-display text-[17px] font-bold tracking-tight text-zinc-950">{lead.client_name}</h2>
            <p className="text-[11.5px] font-medium text-zinc-400">{lead.origin_iata} → {lead.destination_iata} · created {timeAgo(lead.created_at)} · owner {owner.full_name}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {STAGES.map(s=>(
              <button key={s.key} onClick={()=>moveLead(lead.id,s.key)}
                className={cn("rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
                  lead.stage===s.key?"border-[#222468] bg-[#222468] text-white":"border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400")}>
                {s.short}
              </button>
            ))}
          </div>
          <button onClick={closeLead} className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-100"><X className="h-4 w-4"/></button>
        </header>

        <div className="grid flex-1 grid-cols-2 overflow-hidden">
          <div className="nice-scroll space-y-5 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                {icon:Calendar, label:"Travel window", value:`${prettyDate(lead.travel_date)}${lead.return_date?` → ${prettyDate(lead.return_date)}`:""}`},
                {icon:Users,    label:"Passengers",    value:`${lead.passengers} traveller${lead.passengers>1?"s":""}`},
                {icon:Wallet,   label:"Budget",         value:formatMoney(lead.budget,settings.currency)},
                {icon:MessageCircle, label:"Channel",  value:lead.source.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())},
              ].map(f=>(
                <div key={f.label} className="rounded-2xl border border-zinc-200 bg-white p-3.5">
                  <f.icon className="mb-2 h-4 w-4 text-[#EA7218]"/>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{f.label}</p>
                  <p className="mt-0.5 truncate text-[13px] font-bold text-zinc-900">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-zinc-900">{lead.phone}</p>
                <p className="flex items-center gap-1 truncate text-[11px] font-medium text-zinc-400"><Mail className="h-3 w-3"/> {lead.email||"no email on file"}</p>
              </div>
              <button onClick={()=>startOutbound(lead.phone,lead.id,lead.client_name)} className="flex items-center gap-2 rounded-xl bg-[#222468] px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-[#EA7218]">
                <Phone className="h-3.5 w-3.5"/> Call now
              </button>
              <button onClick={()=>pushToast({kind:"info",title:"WhatsApp thread opened",body:"wa.me/"+lead.phone.replace(/\D/g,"")})}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12px] font-bold text-emerald-700 transition hover:bg-emerald-100">
                <MessageCircle className="h-3.5 w-3.5"/> WhatsApp
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
              <Avatar person={owner} size="sm" showStatus/>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Assigned consultant</p>
                {role==="admin"?(
                  <select value={lead.assigned_to} onChange={e=>updateLead(lead.id,{assigned_to:e.target.value})} className="mt-0.5 w-full appearance-none bg-transparent text-[13px] font-bold text-zinc-900 outline-none focus:outline-none focus-visible:outline-none">
                    {staff.map(s=><option key={s.id} value={s.id}>{s.full_name} — {s.title}</option>)}
                  </select>
                ):(
                  <p className="mt-0.5 text-[13px] font-bold text-zinc-900">{owner.full_name}<span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold uppercase text-zinc-500">staff view</span></p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400"><StickyNote className="h-3.5 w-3.5"/> Journey notes</p>
              <textarea defaultValue={lead.notes} onBlur={e=>updateLead(lead.id,{notes:e.target.value})} rows={4}
                placeholder="Qualification notes, preferences, visa status…"
                className="w-full resize-none rounded-xl bg-zinc-50 p-3 text-[12.5px] font-medium leading-relaxed text-zinc-700 outline-none transition-all duration-200 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-[#222468]/20 focus:outline-none focus-visible:outline-none"/>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400"><MessageCircle className="h-3.5 w-3.5 text-emerald-500"/> WhatsApp conversation</p>
              <div className="space-y-2">
                {lead.whatsapp.length===0&&<p className="rounded-xl bg-zinc-50 p-3 text-[11.5px] font-medium text-zinc-400">No WhatsApp thread yet.</p>}
                {lead.whatsapp.map(m=>(
                  <div key={m.id} className={cn("flex",m.from==="agent"?"justify-end":"justify-start")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed",
                      m.from==="agent"?"rounded-br-md bg-[#222468] text-white":"rounded-bl-md border border-zinc-200 bg-zinc-50 text-zinc-700")}>
                      <p>{m.text}</p>
                      <p className={cn("mt-1 text-[9px] font-semibold",m.from==="agent"?"text-blue-200":"text-zinc-400")}>{timeAgo(m.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400"><Phone className="h-3.5 w-3.5"/> Call history ({leadCalls.length})</p>
              {leadCalls.length===0&&<p className="rounded-xl bg-zinc-50 p-3 text-[11.5px] font-medium text-zinc-400">No calls logged yet.</p>}
              <div className="space-y-2">
                {leadCalls.map(c=>(
                  <div key={c.id} className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-full",c.direction==="inbound"?"bg-emerald-100 text-emerald-600":"bg-[#222468]/10 text-[#222468]")}>
                      {c.direction==="inbound"?<PhoneIncoming className="h-3.5 w-3.5"/>:<PhoneOutgoing className="h-3.5 w-3.5"/>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-bold text-zinc-800">{c.disposition.replace("_"," ")} · {formatDuration(c.duration_seconds)}</p>
                      {c.notes&&<p className="truncate text-[10.5px] text-zinc-500">{c.notes}</p>}
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-400">{timeAgo(c.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden border-l border-zinc-200/80 bg-white/60 p-6">
            <FlightSearchPanel lead={lead}/>
          </div>
        </div>

        <footer className="flex items-center gap-3 border-t border-zinc-200/80 bg-white px-6 py-3">
          <span className="h-2 w-2 rounded-full" style={{background:meta?.dot}}/>
          <p className="text-[11px] font-semibold text-zinc-500">Deal value {formatMoney(lead.budget,settings.currency)} · stage {meta?.label} · progress {lead.progress}%</p>
          <p className="ml-auto text-[10px] font-medium text-zinc-300">Lead ID {lead.id.slice(0,8)} · Supabase synced</p>
        </footer>
      </div>
    </div>
  );
}
