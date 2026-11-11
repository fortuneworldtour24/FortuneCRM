import { ArrowUpDown, Check, Filter, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/store/AppContext";
import { cn, SOURCES } from "@/lib/utils";
import type { LeadSource, ViewKey } from "@/types/database";

const TITLES: Record<ViewKey,{title:string;sub:string}> = {
  dashboard: { title:"Dashboard",        sub:"Pipeline, conversion & today's priorities" },
  tasks:     { title:"Tasks",            sub:"Operational to-dos across the agency" },
  activity:  { title:"Activity",         sub:"Calls, quotes & lifecycle events" },
  customers: { title:"Customers / Leads",sub:"Every traveller, one pipeline" },
  flights:   { title:"Flight Engine",    sub:"Live fares · SerpApi · markup calculator" },
  settings:  { title:"Settings",         sub:"Agency, team, channels & access control" },
};

const SORT_LABEL = { newest:"Newest", budget:"Budget ↓", az:"A → Z" } as const;

export function Header() {
  const { view, query, setQuery, channelFilter, setChannelFilter, sortMode, cycleSort, setAddLeadOpen, currentUser, isSuperAdminUser } = useApp();
  const [filterOpen, setFilterOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if (!filterOpen) return;
    const onClick=(e:MouseEvent)=>{ if (!panelRef.current?.contains(e.target as Node)) setFilterOpen(false); };
    window.addEventListener("mousedown",onClick);
    return ()=>window.removeEventListener("mousedown",onClick);
  },[filterOpen]);

  const today = new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"});

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="mr-auto">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-zinc-950">{TITLES[view].title}</h1>
        <p className="text-[12px] font-medium text-zinc-400">{today} · {TITLES[view].sub}</p>
      </div>

      {/* Super Admin identity indicator in header */}
      {isSuperAdminUser && (
        <div className="hidden items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 md:flex">
          <span className="text-[11px]">⭐</span>
          <div className="text-left">
            <p className="text-[11px] font-bold leading-none text-orange-800">{currentUser.full_name}</p>
            <p className="text-[9.5px] font-semibold uppercase tracking-wider text-orange-500">Super Admin</p>
          </div>
        </div>
      )}

      <label className="group flex h-11 w-[300px] items-center gap-2.5 rounded-full border border-zinc-200 bg-white px-4 transition-all duration-200 focus-within:border-[#222468] focus-within:ring-2 focus-within:ring-[#222468]/10">
        <Search className="h-4 w-4 shrink-0 text-zinc-400 transition group-focus-within:text-[#222468]" />
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, phone, PNR, destination..."
          className="w-full border-none bg-transparent text-[13px] font-medium text-zinc-800 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-zinc-400" />
        {query && <button onClick={()=>setQuery("")} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 hover:bg-zinc-200">Clear</button>}
      </label>

      <div className="relative" ref={panelRef}>
        <button onClick={()=>setFilterOpen(o=>!o)}
          className={cn("flex h-11 items-center gap-2 rounded-full border px-4 text-[12.5px] font-semibold transition",
            channelFilter!=="all"?"border-[#222468] bg-[#222468] text-white shadow-lg shadow-[#222468]/25":"border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300")}>
          <Filter className="h-3.5 w-3.5" />
          {channelFilter==="all"?"Filter":SOURCES[channelFilter].label}
        </button>
        {filterOpen && (
          <div className="anim-modal absolute right-0 top-[52px] z-40 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Lead source</p>
            {(["all","meta_ads","whatsapp","walk_in","manual"] as (LeadSource|"all")[]).map(s=>(
              <button key={s} onClick={()=>setChannelFilter(s)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12.5px] font-medium text-zinc-700 transition hover:bg-zinc-100">
                <span className="flex-1">{s==="all"?"All channels":SOURCES[s].label}</span>
                {(channelFilter===s||(s==="all"&&channelFilter==="all"))&&<Check className="h-3.5 w-3.5 text-[#222468]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={cycleSort} className="flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-[12.5px] font-semibold text-zinc-700 transition hover:border-zinc-300">
        <ArrowUpDown className="h-3.5 w-3.5" /> {SORT_LABEL[sortMode]}
      </button>

      <button onClick={()=>setAddLeadOpen(true)}
        className="flex h-11 items-center gap-2 rounded-full bg-[#222468] px-5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(34,36,104,0.6)] transition hover:bg-[#1a1c54] active:scale-[0.97]">
        <Plus className="h-4 w-4" /> Add New Lead
      </button>
    </div>
  );
}
