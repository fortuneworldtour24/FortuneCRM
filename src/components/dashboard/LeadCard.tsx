import { ArrowRight, Megaphone, MessageCircle, MessageSquare, MoreHorizontal, PenLine, Phone, PhoneCall } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/store/AppContext";
import { cn, prettyDate, timeAgo } from "@/lib/utils";
import type { Lead, LeadSource } from "@/types/database";

const SOURCE_ICON: Record<LeadSource,typeof Megaphone> = { meta_ads:Megaphone, whatsapp:MessageCircle, walk_in:PhoneCall, manual:PenLine };
const SOURCE_TINT: Record<LeadSource,string> = { meta_ads:"text-blue-500 bg-blue-500/10", whatsapp:"text-emerald-600 bg-emerald-500/10", walk_in:"text-amber-500 bg-amber-500/10", manual:"text-zinc-500 bg-zinc-400/10" };

export function LeadCard({ lead }:{ lead:Lead }) {
  const { staff, selectedLead, openLead, startOutbound } = useApp();
  const dark = selectedLead?.id===lead.id;
  const owner = staff.find(s=>s.id===lead.assigned_to)??staff[0];
  const SrcIcon = SOURCE_ICON[lead.source];

  return (
    <article draggable
      onDragStart={e=>{ e.dataTransfer.setData("text/lead-id",lead.id); e.dataTransfer.effectAllowed="move"; }}
      onClick={()=>openLead(lead.id)}
      className={cn("group cursor-pointer rounded-2xl border p-4 transition-all duration-200 active:cursor-grabbing",
        dark?"border-zinc-950 bg-[#18181B] text-white shadow-[0_18px_36px_-14px_rgba(24,24,27,0.55)]"
           :"border-zinc-200/90 bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:-translate-y-[3px] hover:border-zinc-300 hover:shadow-[0_14px_28px_-14px_rgba(16,24,40,0.18)]")}>
      <div className="mb-2.5 flex items-center justify-between">
        <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide", dark?"bg-white/10 text-zinc-300":SOURCE_TINT[lead.source])}>
          <SrcIcon className="h-3 w-3"/>
          {lead.source==="meta_ads"?"Meta":lead.source==="whatsapp"?"WhatsApp":lead.source==="walk_in"?"Walk-in":"Manual"}
        </span>
        <div className="flex items-center gap-1">
          <span className={cn("text-[10px] font-medium",dark?"text-zinc-500":"text-zinc-400")}>{timeAgo(lead.created_at)}</span>
          <MoreHorizontal className={cn("h-4 w-4",dark?"text-zinc-500":"text-zinc-300 group-hover:text-zinc-500")}/>
        </div>
      </div>
      <h3 className="truncate text-[14.5px] font-bold tracking-tight">{lead.client_name}</h3>
      <div className={cn("mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold", dark?"text-[#EA7218]":"text-[#222468]")}>
        <span>{lead.origin_iata}</span><ArrowRight className="h-3 w-3"/><span>{lead.destination_iata}</span>
        <span className={cn("font-medium",dark?"text-zinc-500":"text-zinc-400")}>· {lead.passengers} pax · {prettyDate(lead.travel_date)}</span>
      </div>
      <p className={cn("mt-2 line-clamp-2 text-[12px] leading-relaxed",dark?"text-zinc-400":"text-zinc-500")}>{lead.summary}</p>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider",dark?"text-zinc-500":"text-zinc-400")}>Deal progress</span>
          <span className={cn("text-[10.5px] font-bold",dark?"text-[#EA7218]":"text-[#222468]")}>{lead.progress}%</span>
        </div>
        <div className={cn("h-1.5 w-full overflow-hidden rounded-full",dark?"bg-white/10":"bg-zinc-100")}>
          <div className="h-full rounded-full bg-[#EA7218] transition-all duration-500" style={{width:`${lead.progress}%`}}/>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-2">
        <Avatar person={owner} size="xs" dark={dark}/>
        <span className={cn("max-w-[96px] truncate text-[10.5px] font-medium",dark?"text-zinc-400":"text-zinc-500")}>{owner.full_name}</span>
        <span className={cn("ml-auto flex items-center gap-1 text-[11px] font-semibold",dark?"text-zinc-400":"text-zinc-400")}>
          <MessageSquare className="h-3 w-3"/>{lead.comments}
        </span>
        <button onClick={e=>{ e.stopPropagation(); startOutbound(lead.phone,lead.id,lead.client_name); }}
          className={cn("flex h-7 w-7 items-center justify-center rounded-full transition active:scale-90",
            dark?"bg-[#EA7218] text-white hover:brightness-110":"bg-[#222468] text-white hover:bg-[#1a1c54]")}
          title={`Call ${lead.client_name}`}>
          <Phone className="h-3 w-3"/>
        </button>
      </div>
    </article>
  );
}
