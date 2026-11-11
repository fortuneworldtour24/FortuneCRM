import { Calendar, DollarSign, Mail, MapPin, Megaphone, MessageCircle, PenLine, Phone, PhoneCall, User, X } from "lucide-react";
import { useState } from "react";
import { AirportInput } from "@/components/flights/FlightSearchPanel";
import { useApp } from "@/store/AppContext";
import { cn } from "@/lib/utils";
import type { LeadSource } from "@/types/database";

const SOURCE_OPTS: { key:LeadSource; label:string; icon:typeof Megaphone }[] = [
  {key:"meta_ads", label:"Meta Ads", icon:Megaphone},
  {key:"whatsapp", label:"WhatsApp", icon:MessageCircle},
  {key:"walk_in",  label:"Walk-in",  icon:PhoneCall},
  {key:"manual",   label:"Manual",   icon:PenLine},
];

const FIELD = "flex h-11 w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-[13px] font-semibold text-zinc-900 transition-all duration-200 focus-within:border-[#222468] focus-within:ring-2 focus-within:ring-[#222468]/10";

export function AddLeadModal() {
  const { addLeadOpen, setAddLeadOpen, addLead, openLead, settings, staff, role, currentUser } = useApp();
  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");
  const [email,setEmail] = useState("");
  const [origin,setOrigin] = useState("SYD");
  const [destination,setDestination] = useState("");
  const [date,setDate] = useState(new Date(Date.now()+30*864e5).toISOString().slice(0,10));
  const [pax,setPax] = useState(2);
  const [budget,setBudget] = useState(5000);
  const [source,setSource] = useState<LeadSource>("manual");
  const [assignee,setAssignee] = useState("");
  const [summary,setSummary] = useState("");

  if (!addLeadOpen) return null;

  const valid = name.trim().length>1 && phone.trim().length>4 && destination.trim().length>=3;

  const submit = () => {
    if (!valid) return;
    const lead = addLead({ client_name:name.trim(), phone:phone.trim(), email:email.trim(),
      origin_iata:origin.slice(0,3).toUpperCase(), destination_iata:destination.slice(0,3).toUpperCase(),
      travel_date:date, passengers:pax, budget, source, summary:summary.trim()||undefined, assigned_to:assignee||undefined });
    setAddLeadOpen(false); openLead(lead.id);
    setName(""); setPhone(""); setEmail(""); setDestination(""); setSummary(""); setAssignee("");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="anim-fade-in absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={()=>setAddLeadOpen(false)}/>
      <div className="anim-modal relative max-h-[92vh] w-[620px] overflow-y-auto rounded-[28px] border border-zinc-200 bg-[#F7F8FA] shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-200/80 bg-white px-6 py-4">
          <div>
            <h2 className="font-display text-[17px] font-bold tracking-tight text-zinc-950">New Lead — Quick Intake</h2>
            <p className="text-[11.5px] font-medium text-zinc-400">{settings.roundRobin?"Round-robin auto-assignment is ON":"Round-robin off — defaults to you"}</p>
          </div>
          <button onClick={()=>setAddLeadOpen(false)} className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-100"><X className="h-4 w-4"/></button>
        </header>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Client name *</label>
              <div className={FIELD}><User className="h-4 w-4 text-zinc-400"/><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Aarav Mehta" className="w-full border-none bg-transparent outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"/></div>
            </div>
            <div>
              <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Phone *</label>
              <div className={FIELD}><Phone className="h-4 w-4 text-zinc-400"/><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+61 4xx xxx xxx" className="w-full border-none bg-transparent outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"/></div>
            </div>
            <div>
              <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Email</label>
              <div className={FIELD}><Mail className="h-4 w-4 text-zinc-400"/><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="client@email.com" className="w-full border-none bg-transparent outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"/></div>
            </div>
            <AirportInput label="Origin" value={origin} onChange={setOrigin} icon={MapPin}/>
            <AirportInput label="Destination *" value={destination} onChange={setDestination} icon={MapPin}/>
            <div>
              <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Travel date</label>
              <div className={FIELD}><Calendar className="h-4 w-4 text-zinc-400"/><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full border-none bg-transparent outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Pax</label>
                <input type="number" min={1} max={9} value={pax} onChange={e=>setPax(Number(e.target.value))} className={cn(FIELD,"px-3 outline-none focus:outline-none focus-visible:outline-none")}/>
              </div>
              <div>
                <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Budget ({settings.currency})</label>
                <div className={FIELD}><DollarSign className="h-4 w-4 text-zinc-400"/><input type="number" min={0} step={100} value={budget} onChange={e=>setBudget(Number(e.target.value))} className="w-full border-none bg-transparent outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"/></div>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Lead source</label>
            <div className="grid grid-cols-4 gap-2">
              {SOURCE_OPTS.map(s=>(
                <button key={s.key} onClick={()=>setSource(s.key)}
                  className={cn("flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[11.5px] font-bold transition",
                    source===s.key?"border-[#222468] bg-[#222468] text-white":"border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400")}>
                  <s.icon className="h-3.5 w-3.5"/> {s.label}
                </button>
              ))}
            </div>
          </div>
          {role==="admin" ? (
            <div>
              <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Assign to</label>
              <select value={assignee} onChange={e=>setAssignee(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 text-[13px] font-semibold text-zinc-900 outline-none transition-all duration-200 focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none focus-visible:outline-none">
                <option value="">Auto — round robin</option>
                {staff.map(s=><option key={s.id} value={s.id}>{s.full_name} — {s.title}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3.5 py-2.5">
              <span className="text-[11px] font-semibold text-zinc-500">Assigned to:</span>
              <span className="text-[12px] font-bold text-zinc-900">{staff.find(s=>s.id===currentUser.id)?.full_name ?? "You"}</span>
              <span className="ml-auto rounded-full bg-zinc-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">Auto</span>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Enquiry summary</label>
            <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={2} placeholder="e.g. Couple asking for honeymoon quote, 5-star only…"
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white p-3 text-[12.5px] font-medium text-zinc-700 outline-none transition-all duration-200 placeholder:text-zinc-400 focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none focus-visible:outline-none"/>
          </div>
          <button onClick={submit} disabled={!valid}
            className={cn("h-12 w-full rounded-2xl bg-[#222468] text-[13.5px] font-bold text-white transition active:scale-[0.99]",valid?"hover:bg-[#EA7218]":"cursor-not-allowed opacity-40")}>
            Create lead & open workspace
          </button>
        </div>
      </div>
    </div>
  );
}
