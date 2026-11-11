import { CheckSquare, FileText, GitBranch, Phone, PhoneIncoming, PhoneOutgoing, UserPlus, Webhook } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/store/AppContext";
import { cn, formatDuration, timeAgo } from "@/lib/utils";
import type { ActivityEvent } from "@/types/database";

const KIND_ICON: Record<ActivityEvent["kind"],typeof Phone> = { call:Phone, quote:FileText, lead:UserPlus, stage:GitBranch, task:CheckSquare, webhook:Webhook };
const KIND_TINT: Record<ActivityEvent["kind"],string> = { call:"bg-[#222468]/10 text-[#222468]", quote:"bg-violet-100 text-violet-600", lead:"bg-emerald-100 text-emerald-600", stage:"bg-amber-100 text-amber-600", task:"bg-zinc-200 text-zinc-600", webhook:"bg-rose-100 text-rose-600" };

export function ActivityView() {
  const { activity, calls, staff, leads } = useApp();
  return (
    <div className="anim-fade-up mt-6 grid grid-cols-2 items-start gap-6">
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-5 text-[15px] font-bold tracking-tight text-zinc-950">Live activity stream</h2>
        <div className="relative space-y-5">
          <span className="absolute bottom-2 left-[15px] top-2 w-px bg-zinc-100"/>
          {activity.map((e,i)=>{
            const Icon = KIND_ICON[e.kind];
            return (
              <div key={e.id} className="anim-fade-up relative flex gap-4" style={{animationDelay:`${Math.min(i,8)*45}ms`}}>
                <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white",KIND_TINT[e.kind])}><Icon className="h-3.5 w-3.5"/></span>
                <div className="min-w-0 flex-1 border-b border-zinc-50 pb-4">
                  <p className="text-[12.5px] font-medium leading-snug text-zinc-700">{e.text}</p>
                  <p className="mt-1 text-[10.5px] font-semibold text-zinc-400">{timeAgo(e.at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-5 text-[15px] font-bold tracking-tight text-zinc-950">Call history <span className="ml-1 rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-bold text-white">{calls.length}</span></h2>
        <div className="space-y-2">
          {calls.map(c=>{
            const agent = staff.find(s=>s.id===c.staff_id)??staff[0];
            return (
              <div key={c.id} className="flex items-start gap-3 rounded-2xl border border-zinc-100 p-3.5 transition hover:border-zinc-200 hover:bg-zinc-50/60">
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",c.direction==="inbound"?"bg-emerald-100 text-emerald-600":"bg-[#222468]/10 text-[#222468]")}>
                  {c.direction==="inbound"?<PhoneIncoming className="h-3.5 w-3.5"/>:<PhoneOutgoing className="h-3.5 w-3.5"/>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-zinc-900">{c.lead_name||leads.find(l=>l.id===c.lead_id)?.client_name||"Caller"} <span className="font-medium text-zinc-400">· {c.phone}</span></p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{c.notes||"No notes"}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-px text-[9.5px] font-bold uppercase tracking-wide text-zinc-500">{c.disposition.replace("_"," ")}</span>
                    <span className="font-display text-[10.5px] font-bold text-zinc-700">{formatDuration(c.duration_seconds)}</span>
                    <span className="text-[10px] text-zinc-400">{timeAgo(c.created_at)}</span>
                  </div>
                </div>
                <Avatar person={agent} size="xs"/>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
