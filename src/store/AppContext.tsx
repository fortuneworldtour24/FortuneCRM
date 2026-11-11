import {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState, type ReactNode,
} from "react";
import { MOCK_ACTIVITY, MOCK_CALLS, MOCK_LEADS, MOCK_STAFF, MOCK_TASKS, CURRENT_USER_ID } from "@/data/mock";
import { deleteRow, fetchTable, insertRow, isSupabaseConfigured, patchRow, supabase } from "@/lib/supabase";
import { airportLabel } from "@/services/airports";
import { metaLeadToInput, pickRoundRobin, whatsappToInput, type MetaLeadPayload, type WhatsAppInboundPayload } from "@/services/webhooks";
import type { FlightOffer } from "@/services/flights/types";
import type { ActivityEvent, CallDisposition, CallLog, Lead, LeadSource, NewLeadInput, Profile, Quote, Role, Stage, TaskItem, ViewKey } from "@/types/database";
import { stageMeta, uid } from "@/lib/utils";
import { updateMemberRole, isSuperAdmin } from "@/lib/auth";

export interface AgencySettings { markupPercent:number; currency:string; roundRobin:boolean; agencyPhone:string; provider:string; }
export interface Toast { id:string; kind:"info"|"success"|"error"|"call"; title:string; body?:string; phone?:string; leadId?:string; }
export type DialerStatus = "idle"|"dialing"|"connected"|"wrapup";
export interface DialerState { open:boolean; minimized:boolean; status:DialerStatus; phone:string; leadId:string|null; leadName:string; direction:"inbound"|"outbound"; elapsed:number; }

interface AppContextValue {
  view:ViewKey; setView:(v:ViewKey)=>void;
  query:string; setQuery:(q:string)=>void;
  channelFilter:LeadSource|"all"; setChannelFilter:(c:LeadSource|"all")=>void;
  sortMode:"newest"|"budget"|"az"; cycleSort:()=>void;
  currentUser:Profile; role:Role; setRole:(r:Role)=>void;
  isSuperAdminUser: boolean;
  updateCurrentUserProfile:(patch:Partial<Profile>)=>void;
  staff:Profile[]; addStaff:(name:string,title:string,role?:Role)=>void;
  promoteStaff:(id:string,newRole:Role)=>void;
  toggleStaffSuspended:(id:string)=>void; removeStaff:(id:string,reassign:boolean)=>void;
  leads:Lead[]; visibleLeads:Lead[]; leadsByStage:(s:Stage)=>Lead[];
  addLead:(input:NewLeadInput)=>Lead; moveLead:(id:string,stage:Stage)=>void; updateLead:(id:string,patch:Partial<Lead>)=>void;
  selectedLead:Lead|null; openLead:(id:string)=>void; closeLead:()=>void;
  tasks:TaskItem[]; toggleTask:(id:string)=>void; addTask:(title:string,tag:string)=>void;
  calls:CallLog[]; quotes:Quote[]; activity:ActivityEvent[];
  settings:AgencySettings; updateSettings:(patch:Partial<AgencySettings>)=>void;
  attachQuote:(leadId:string|null,offer:FlightOffer,net:number,sell:number)=>void;
  copyWhatsAppQuote:(lead:Lead|null,offer:FlightOffer,sell:number)=>void;
  toasts:Toast[]; pushToast:(t:Omit<Toast,"id">)=>void; dismissToast:(id:string)=>void;
  dialer:DialerState; toggleDialer:()=>void; startOutbound:(phone:string,leadId:string|null,name:string)=>void;
  answerInbound:(toastId:string)=>void; pressKey:(k:string)=>void; backspace:()=>void;
  beginCall:()=>void; endCall:()=>void; completeWrapup:(disposition:CallDisposition,notes:string)=>void;
  simulateInbound:()=>void; ingestMetaLead:(p:MetaLeadPayload)=>void; ingestWhatsApp:(p:WhatsAppInboundPayload)=>void;
  addLeadOpen:boolean; setAddLeadOpen:(b:boolean)=>void;
  funnel:{ newLeads:number; delta:string; stages:{label:string;pct:number;count:number}[] };
  supabaseLive:boolean; remoteHydrated:boolean;
}

const AppContext = createContext<AppContextValue|null>(null);
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside <AppProvider>");
  return ctx;
}

const STAFF_COLORS = ["from-blue-500 to-indigo-600","from-rose-400 to-pink-600","from-amber-400 to-orange-600","from-emerald-400 to-teal-600","from-violet-400 to-purple-600","from-sky-400 to-blue-600"];
const VALID_STAGES:Stage[] = ["contacted","negotiation","offer_sent","closed_won","closed_lost"];
const VALID_SOURCES:LeadSource[] = ["meta_ads","whatsapp","manual","walk_in"];
const ACTIVE_STAGES:Stage[] = ["contacted","negotiation","offer_sent"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normLead(row: any): Lead {
  return { id:String(row.id), client_name:row.client_name??"Unknown", email:row.email??"", phone:row.phone??"",
    origin_iata:row.origin_iata??"SYD", destination_iata:row.destination_iata??"—",
    travel_date:row.travel_date??"", return_date:row.return_date??undefined,
    passengers:Number(row.passengers??2), budget:Number(row.budget??0),
    stage:VALID_STAGES.includes(row.stage)?row.stage:"contacted",
    source:VALID_SOURCES.includes(row.source)?row.source:"manual",
    assigned_to:row.assigned_to??CURRENT_USER_ID, progress:Number(row.progress??5),
    comments:Number(row.comments??0), summary:row.summary??"Synced from Supabase.",
    notes:row.notes??"", whatsapp:[], created_at:row.created_at??new Date().toISOString() };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normProfile(row: any): Profile {
  const seed = String(row.id??row.full_name??"x");
  return { id:String(row.id), full_name:row.full_name??"Member", email:row.email??"",
    role:row.role==="admin"?"admin":"staff", title:row.title??"Consultant",
    avatar_color:row.avatar_color??STAFF_COLORS[seed.length%STAFF_COLORS.length],
    avatar_url:row.avatar_url??undefined,
    status:row.status==="busy"?"busy":row.status==="online"?"online":"offline",
    suspended:row.is_active===false };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normCall(row: any): CallLog {
  return { id:String(row.id), lead_id:row.lead_id??null, lead_name:row.lead_name??"",
    staff_id:row.staff_id??CURRENT_USER_ID, direction:row.direction==="inbound"?"inbound":"outbound",
    phone:row.phone??"", duration_seconds:Number(row.duration_seconds??0),
    disposition:(["connected","busy","no_answer","wrong_number"].includes(row.disposition)?row.disposition:"connected") as CallDisposition,
    notes:row.notes??"", created_at:row.created_at??new Date().toISOString() };
}

export function AppProvider({
  children,
  authProfile,
}: {
  children: ReactNode;
  authProfile: Profile;
}) {
  const [view,setView] = useState<ViewKey>("dashboard");
  const [query,setQuery] = useState("");
  const [channelFilter,setChannelFilter] = useState<LeadSource|"all">("all");
  const [sortMode,setSortMode] = useState<"newest"|"budget"|"az">("newest");

  /* ── Staff roster: seed from mock, inject real authenticated user ─ */
  const [staff, setStaff] = useState<Profile[]>(() => {
    // Replace the placeholder admin slot with the real authenticated user,
    // then keep the rest of the mock roster for the demo pipeline.
    const existing = MOCK_STAFF.filter((s) => s.id !== CURRENT_USER_ID);
    return [{ ...authProfile, status: "online" as const }, ...existing];
  });

  const [leads,setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [tasks,setTasks] = useState<TaskItem[]>(MOCK_TASKS);
  const [calls,setCalls] = useState<CallLog[]>(MOCK_CALLS);
  const [quotes,setQuotes] = useState<Quote[]>([]);
  const [activity,setActivity] = useState<ActivityEvent[]>(MOCK_ACTIVITY);
  const [selectedLeadId,setSelectedLeadId] = useState<string|null>(null);
  const [addLeadOpen,setAddLeadOpen] = useState(false);
  const [toasts,setToasts] = useState<Toast[]>([]);
  const [remoteHydrated,setRemoteHydrated] = useState(false);
  const toastTimers = useRef<Record<string,ReturnType<typeof setTimeout>>>({});

  const [settings,setSettings] = useState<AgencySettings>({
    markupPercent:Number(import.meta.env.VITE_DEFAULT_MARKUP_PERCENT)||5,
    currency:import.meta.env.VITE_DEFAULT_CURRENCY||"AUD", roundRobin:true,
    agencyPhone:"+61 2 8000 4422",
    provider:(import.meta.env.VITE_FLIGHT_PROVIDER||"serpapi").toLowerCase(),
  });

  const [dialer,setDialer] = useState<DialerState>({ open:false, minimized:false, status:"idle", phone:"", leadId:null, leadName:"", direction:"outbound", elapsed:0 });

  /* The authenticated user is always the first entry in the staff array */
  const currentUser = staff.find(s => s.id === authProfile.id) ?? staff[0];
  const role = currentUser?.role ?? "staff";
  const SELF_ID = authProfile.id;
  const isSuperAdminUser = isSuperAdmin(authProfile.email);

  const updateCurrentUserProfile = useCallback((patch: Partial<Profile>) => {
    setStaff(prev => prev.map(s => s.id === SELF_ID ? { ...s, ...patch } : s));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SELF_ID]);

  /* Keep currentUser in sync if authProfile reference changes */
  useEffect(() => {
    setStaff(prev => {
      const idx = prev.findIndex(s => s.id === authProfile.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], ...authProfile };
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authProfile.id]);

  const setRole = useCallback((r:Role) => {
    setStaff(prev => prev.map(s => s.id===SELF_ID ? {...s,role:r} : s));
    void patchRow("profiles", SELF_ID, { role:r });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[SELF_ID]);

  const dismissToast = useCallback((id:string) => {
    setToasts(t => t.filter(x => x.id!==id));
    const t = toastTimers.current[id]; if (t) clearTimeout(t);
    delete toastTimers.current[id];
  },[]);

  const pushToast = useCallback((t:Omit<Toast,"id">) => {
    const id = uid();
    setToasts(prev => [...prev.slice(-3), {...t,id}]);
    toastTimers.current[id] = setTimeout(() => dismissToast(id), t.kind==="call"?12000:5000);
  },[dismissToast]);

  const logActivity = useCallback((kind:ActivityEvent["kind"], text:string) => {
    setActivity(prev => [{id:uid(),kind,text,at:new Date().toISOString()},...prev]);
  },[]);

  /* --- leads --- */
  const addLead = useCallback((input:NewLeadInput): Lead => {
    let assigned = input.assigned_to;
    let autoAssigned = false;
    // Staff members always self-assign — never pick another consultant
    if (role === "staff") {
      assigned = SELF_ID;
      autoAssigned = false;
    } else if (!assigned) {
      assigned = settings.roundRobin ? pickRoundRobin(staff,leads)?.id??SELF_ID : SELF_ID;
      autoAssigned = true;
    }
    const lead:Lead = { id:uid(), email:input.email??"", client_name:input.client_name, phone:input.phone,
      origin_iata:input.origin_iata.toUpperCase(), destination_iata:input.destination_iata.toUpperCase(),
      travel_date:input.travel_date, passengers:input.passengers, budget:input.budget,
      stage:input.stage??"contacted", source:input.source, assigned_to:assigned, progress:6, comments:0,
      summary:input.summary??"New enquiry.", notes:"", whatsapp:input.source==="whatsapp"?[{id:uid(),from:"client",text:input.summary??"Hi!",at:new Date().toISOString()}]:[],
      created_at:new Date().toISOString() };
    setLeads(prev => [lead,...prev]);
    const row = {...lead} as Record<string,unknown>; delete row.whatsapp;
    void insertRow("leads", row);
    const owner = staff.find(s => s.id===assigned);
    logActivity("lead",`New lead: ${lead.client_name} — ${lead.origin_iata}→${lead.destination_iata}`);
    pushToast({ kind:"success", title:"Lead created", body:autoAssigned?`Round-robin → ${owner?.full_name??"team"}`:`Assigned to ${owner?.full_name??"you"}` });
    return lead;
  },[leads,settings.roundRobin,staff,logActivity,pushToast]);

  const moveLead = useCallback((id:string, stage:Stage) => {
    setLeads(prev => {
      const t = prev.find(l=>l.id===id);
      if (!t||t.stage===stage) return prev;
      logActivity("stage",`${t.client_name} moved to ${stageMeta(stage).short}`);
      void patchRow("leads",id,{stage});
      return prev.map(l => l.id===id ? {...l,stage,
        progress:stage==="closed_won"?100:stage==="offer_sent"?Math.max(l.progress,70):stage==="negotiation"?Math.max(l.progress,45):l.progress} : l);
    });
  },[logActivity]);

  const updateLead = useCallback((id:string, patch:Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id===id ? {...l,...patch} : l));
    const row = {...patch} as Record<string,unknown>; delete row.whatsapp;
    void patchRow("leads",id,row);
  },[]);

  const selectedLead = useMemo(() => leads.find(l=>l.id===selectedLeadId)??null,[leads,selectedLeadId]);
  const openLead = useCallback((id:string) => setSelectedLeadId(id),[]);
  const closeLead = useCallback(() => setSelectedLeadId(null),[]);

  const visibleLeads = useMemo(() => {
    let out = role==="staff" ? leads.filter(l=>l.assigned_to===currentUser.id) : leads;
    if (channelFilter!=="all") out = out.filter(l=>l.source===channelFilter);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter(l => [l.client_name,l.phone,l.email,l.origin_iata,l.destination_iata,airportLabel(l.destination_iata),l.summary].join(" ").toLowerCase().includes(q));
    const sorted = [...out];
    if (sortMode==="budget") sorted.sort((a,b)=>b.budget-a.budget);
    else if (sortMode==="az") sorted.sort((a,b)=>a.client_name.localeCompare(b.client_name));
    else sorted.sort((a,b)=>b.created_at.localeCompare(a.created_at));
    return sorted;
  },[leads,role,currentUser.id,channelFilter,query,sortMode]);

  const leadsByStage = useCallback((s:Stage) => visibleLeads.filter(l=>l.stage===s),[visibleLeads]);

  /* --- tasks --- */
  const toggleTask = useCallback((id:string) => setTasks(prev=>prev.map(t=>t.id===id?{...t,done:!t.done,progress:!t.done?100:t.progress}:t)),[]);
  const addTask = useCallback((title:string,tag:string) => setTasks(prev=>[{id:uid(),title,tag:tag||"General",dueLabel:"Due tomorrow",tone:"blue",done:false,assignee:SELF_ID,progress:0,created_at:new Date().toISOString()},...prev]),[SELF_ID]);

  /* --- team --- */
  const addStaff = useCallback((name:string, title:string, memberRole:Role = "staff") => {
    if (role!=="admin") { pushToast({kind:"error",title:"Admin only",body:"Only admins can add team members."}); return; }
    const colors = ["from-sky-400 to-blue-600","from-fuchsia-400 to-purple-600","from-lime-400 to-emerald-600","from-orange-400 to-rose-500"];
    const member:Profile = { id:uid(), full_name:name, email:`${name.toLowerCase().replace(/\s+/g,".")}@fortuneworld.tours`, role:memberRole, title:title||"Consultant", avatar_color:colors[staff.length%colors.length], status:"online", suspended:false };
    setStaff(prev=>[...prev,member]);
    void insertRow("profiles",{ full_name:member.full_name, email:member.email, role:member.role, title:member.title, status:"online", is_active:true });
    logActivity("task",`${name} joined the roster as ${memberRole}`);
    pushToast({kind:"success",title:"Staff member added",body:`${name} · ${memberRole==="admin"?"Administrator":"Staff Consultant"}`});
  },[role,staff.length,logActivity,pushToast]);

  const promoteStaff = useCallback((id:string, newRole:Role) => {
    if (role!=="admin") { pushToast({kind:"error",title:"Admin only"}); return; }
    if (id===SELF_ID) { pushToast({kind:"error",title:"Cannot change your own role here"}); return; }
    const target = staff.find(s=>s.id===id); if (!target) return;
    setStaff(prev=>prev.map(s=>s.id===id ? {...s,role:newRole} : s));
    void updateMemberRole(id, newRole);
    const label = newRole==="admin" ? "Administrator" : "Staff Consultant";
    logActivity("task",`${target.full_name} role changed to ${label}`);
    pushToast({kind:"success",title:newRole==="admin" ? `Promoted ${target.full_name} to Admin` : `${target.full_name} set to Staff`,body:`Role: ${label}`});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[role, staff, SELF_ID, logActivity, pushToast]);


  const toggleStaffSuspended = useCallback((id:string) => {
    if (role!=="admin") { pushToast({kind:"error",title:"Admin only"}); return; }
    if (id===currentUser.id) { pushToast({kind:"error",title:"Not allowed",body:"Cannot suspend your own account."}); return; }
    const target = staff.find(s=>s.id===id); if (!target) return;
    const next = !target.suspended;
    setStaff(prev=>prev.map(s=>s.id===id?{...s,suspended:next,status:next?"offline":"online"}:s));
    void patchRow("profiles",id,{is_active:!next});
    pushToast({kind:next?"info":"success",title:next?`${target.full_name} suspended`:`${target.full_name} reactivated`});
  },[role,staff,currentUser.id,pushToast]);

  const removeStaff = useCallback((id:string,reassign:boolean) => {
    if (role!=="admin") { pushToast({kind:"error",title:"Admin only"}); return; }
    if (id===currentUser.id) { pushToast({kind:"error",title:"Cannot remove yourself"}); return; }
    const target = staff.find(s=>s.id===id); if (!target) return;
    const affected = leads.filter(l=>l.assigned_to===id&&ACTIVE_STAGES.includes(l.stage));
    if (reassign && affected.length) {
      const pool = staff.filter(s=>s.id!==id&&!s.suspended);
      const recipients = pool.length?pool:[currentUser];
      const load = new Map<string,number>(recipients.map(r=>[r.id,0]));
      for (const l of leads) { if (ACTIVE_STAGES.includes(l.stage)&&load.has(l.assigned_to)) load.set(l.assigned_to,(load.get(l.assigned_to)??0)+1); }
      setLeads(prev=>prev.map(l=>{
        if (!(l.assigned_to===id&&ACTIVE_STAGES.includes(l.stage))) return l;
        let best=recipients[0];
        for (const r of recipients) { if ((load.get(r.id)??0)<(load.get(best.id)??0)) best=r; }
        load.set(best.id,(load.get(best.id)??0)+1);
        void patchRow("leads",l.id,{assigned_to:best.id});
        return {...l,assigned_to:best.id};
      }));
    }
    setStaff(prev=>prev.filter(s=>s.id!==id));
    void deleteRow("profiles",id);
    logActivity("task",`${target.full_name} removed${reassign&&affected.length?` — ${affected.length} leads reassigned`:""}`);
    pushToast({kind:"success",title:"Member removed",body:reassign&&affected.length?`${affected.length} lead(s) reassigned.`:"Profile deleted."});
  },[role,staff,leads,currentUser,logActivity,pushToast]);

  /* --- quotes --- */
  const attachQuote = useCallback((leadId:string|null,offer:FlightOffer,net:number,sell:number) => {
    const quote:Quote = { id:uid(), lead_id:leadId, provider:offer.provider, flight_details:offer,
      route:`${offer.legs[0]?.from??""}→${offer.legs[offer.legs.length-1]?.to??""}`,
      net_price:net, selling_price:sell, markup_percent:settings.markupPercent, created_by:currentUser.id, created_at:new Date().toISOString() };
    setQuotes(prev=>[quote,...prev]);
    void insertRow("quotes",{ lead_id:quote.lead_id, provider:quote.provider, flight_details:JSON.stringify(offer), net_price:net, selling_price:sell, markup_percent:quote.markup_percent });
    const lead = leads.find(l=>l.id===leadId);
    if (lead) { updateLead(lead.id,{progress:Math.max(lead.progress,72)}); logActivity("quote",`Quote attached to ${lead.client_name}`); }
    pushToast({kind:"success",title:"Quote attached",body:lead?`${offer.airline} · ${lead.client_name}`:`${offer.airline} · saved`});
  },[currentUser.id,leads,settings.markupPercent,updateLead,logActivity,pushToast]);

  const copyWhatsAppQuote = useCallback((lead:Lead|null,offer:FlightOffer,sell:number) => {
    const route = `${offer.legs[0]?.from??"?"} → ${offer.legs[offer.legs.length-1]?.to??"?"}`;
    const stops = offer.stops===0?"Non-stop":`${offer.stops} stop(s) (${offer.stopAirports.join(", ")})`;
    const hrs = `${Math.floor(offer.totalDurationMin/60)}h ${String(offer.totalDurationMin%60).padStart(2,"0")}m`;
    const text = [`✈️ *Fortune World Tour — Flight Quote*`, lead?`For: ${lead.client_name}`:"", `Route: *${route}*`,
      `Airline: ${offer.airline} ${offer.flightNumbers.join(" / ")}`, `Duration: ${hrs} · ${stops}`,
      `Departure: ${offer.departTime} → Arrival: ${offer.arriveTime}`,
      `💰 All-in price: *${new Intl.NumberFormat("en-AU",{style:"currency",currency:settings.currency,maximumFractionDigits:0}).format(sell)}* (${settings.currency}, incl. taxes)`,
      ``, `Reply YES to lock seats — fares refresh daily.`, `📞 ${settings.agencyPhone} · Fortune World Tour`,
    ].filter(Boolean).join("\n");
    void navigator.clipboard?.writeText(text).catch(()=>{});
    pushToast({kind:"success",title:"WhatsApp quote copied",body:"Ready to paste."});
  },[pushToast,settings.agencyPhone,settings.currency]);

  /* --- dialer --- */
  const toggleDialer = useCallback(()=>setDialer(d=>({...d,open:!d.open,minimized:false})),[]);
  const startOutbound = useCallback((phone:string,leadId:string|null,name:string) => setDialer({open:true,minimized:false,status:"dialing",phone,leadId,leadName:name,direction:"outbound",elapsed:0}),[]);
  const simulateInbound = useCallback(()=>{
    const lead = leads[Math.floor(Math.random()*leads.length)]??MOCK_LEADS[0];
    pushToast({kind:"call",title:"Inbound call — "+lead.client_name,body:`${lead.phone} · ${lead.origin_iata}→${lead.destination_iata}`,phone:lead.phone,leadId:lead.id});
  },[leads,pushToast]);
  const answerInbound = useCallback((toastId:string)=>{
    const toast = toasts.find(t=>t.id===toastId); if (!toast) return;
    const lead = leads.find(l=>l.id===toast.leadId);
    setDialer({open:true,minimized:false,status:"connected",phone:toast.phone??"",leadId:toast.leadId??null,leadName:lead?.client_name??"Unknown",direction:"inbound",elapsed:0});
    dismissToast(toastId);
  },[toasts,leads,dismissToast]);
  const pressKey = useCallback((k:string)=>setDialer(d=>d.status==="idle"&&d.phone.replace(/\D/g,"").length<15?{...d,phone:d.phone+k}:d),[]);
  const backspace = useCallback(()=>setDialer(d=>d.status==="idle"?{...d,phone:d.phone.slice(0,-1)}:d),[]);
  const beginCall = useCallback(()=>setDialer(d=>d.phone.trim().length>=4&&d.status==="idle"?{...d,status:"dialing",elapsed:0,direction:"outbound",leadName:d.leadName||"Manual dial"}:d),[]);
  const endCall = useCallback(()=>setDialer(d=>(d.status==="connected"||d.status==="dialing")?{...d,status:"wrapup"}:d),[]);
  const completeWrapup = useCallback((disposition:CallDisposition,notes:string)=>{
    const d = dialer;
    const lead = d.leadId?leads.find(l=>l.id===d.leadId):null;
    const record:CallLog = { id:uid(), lead_id:d.leadId, lead_name:lead?.client_name??d.leadName??"Unknown", staff_id:currentUser.id, direction:d.direction, phone:d.phone, duration_seconds:d.elapsed, disposition, notes, created_at:new Date().toISOString() };
    setCalls(prev=>[record,...prev]);
    const row={...record} as Record<string,unknown>; delete row.lead_name;
    void insertRow("calls",row);
    logActivity("call",`${d.direction} call with ${record.lead_name} (${disposition})`);
    pushToast({kind:"success",title:"Call logged",body:`${record.lead_name} · ${disposition.replace("_"," ")}`});
    setDialer(prev=>({...prev,status:"idle",phone:"",leadId:null,leadName:"",elapsed:0}));
  },[dialer,leads,currentUser.id,logActivity,pushToast]);

  useEffect(()=>{
    if (dialer.status==="dialing"){ const t=setTimeout(()=>setDialer(d=>d.status==="dialing"?{...d,status:"connected"}:d),1800); return()=>clearTimeout(t); }
    if (dialer.status==="connected"){ const iv=setInterval(()=>setDialer(d=>d.status==="connected"?{...d,elapsed:d.elapsed+1}:d),1000); return()=>clearInterval(iv); }
    return undefined;
  },[dialer.status]);

  /* --- webhooks --- */
  const ingestMetaLead = useCallback((p:MetaLeadPayload)=>{addLead(metaLeadToInput(p)); logActivity("webhook",`Meta Lead ingested: ${p.full_name}`);},[addLead,logActivity]);
  const ingestWhatsApp = useCallback((p:WhatsAppInboundPayload)=>{addLead(whatsappToInput(p)); logActivity("webhook",`WhatsApp inquiry from ${p.wa_id}`);},[addLead,logActivity]);

  /* --- funnel (scoped to visible leads for RBAC) --- */
  const funnel = useMemo(()=>{
    const myLeads = visibleLeads;
    const total = myLeads.length || 1;
    const contacted = myLeads.filter(l=>l.stage==="contacted").length;
    const negotiation = myLeads.filter(l=>l.stage==="negotiation").length;
    const offerSent = myLeads.filter(l=>l.stage==="offer_sent").length;
    const won = myLeads.filter(l=>l.stage==="closed_won").length;
    const registered = total;
    const qualified = contacted + negotiation + offerSent + won;
    const contactedPct = Math.round((qualified / total) * 100);
    const convertedPct = Math.round((won / total) * 100);
    return { newLeads: total, delta:"+6%", stages:[
      {label:"Registered", pct: 100, count: registered},
      {label:"Qualified",  pct: Math.round((qualified/total)*100), count: qualified},
      {label:"Contacted",  pct: contactedPct, count: contacted + negotiation},
      {label:"Converted",  pct: convertedPct, count: won},
    ]};
  },[visibleLeads]);

  /* --- Supabase hydration + realtime --- */
  useEffect(()=>{
    if (!supabase) return;
    let cancelled = false;
    (async()=>{
      const [dbLeads,dbProfiles,dbCalls] = await Promise.all([
        fetchTable<Record<string,unknown>>("leads"),
        fetchTable<Record<string,unknown>>("profiles"),
        fetchTable<Record<string,unknown>>("calls"),
      ]);
      if (cancelled) return;
      if (dbProfiles?.length) setStaff(dbProfiles.map(normProfile));
      if (dbCalls?.length) setCalls(dbCalls.map(normCall));
      if (dbLeads?.length) { setLeads(dbLeads.map(normLead)); setRemoteHydrated(true); }
    })();
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]>|null = null;
    try {
      channel = supabase.channel("crm-live")
        .on("postgres_changes",{event:"*",schema:"public",table:"leads"},(payload)=>{
          if (payload.eventType==="DELETE") { const oid=String((payload.old as {id?:string}).id??""); setLeads(p=>p.filter(l=>l.id!==oid)); setSelectedLeadId(s=>s===oid?null:s); return; }
          const lead=normLead(payload.new);
          setLeads(p=>{ const idx=p.findIndex(l=>l.id===lead.id); if(idx===-1) return [lead,...p]; const c=[...p]; c[idx]={...lead,whatsapp:p[idx].whatsapp}; return c; });
        })
        .on("postgres_changes",{event:"*",schema:"public",table:"profiles"},(payload)=>{
          if (payload.eventType==="DELETE") { const oid=String((payload.old as {id?:string}).id??""); setStaff(p=>p.filter(s=>s.id!==oid)); return; }
          const member=normProfile(payload.new);
          setStaff(p=>{ const idx=p.findIndex(s=>s.id===member.id); if(idx===-1) return [...p,member]; const c=[...p]; c[idx]=member; return c; });
        })
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"calls"},(payload)=>{
          const c=normCall(payload.new);
          setCalls(p=>p.some(x=>x.id===c.id)?p:[c,...p]);
        })
        .subscribe();
    } catch { /* realtime unavailable */ }
    return ()=>{ cancelled=true; try { if(channel) void channel.unsubscribe(); } catch{} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    const t=setTimeout(()=>pushToast({kind:"info",title:isSupabaseConfigured?"Workspace synced":"Demo mode",body:isSupabaseConfigured?"Connected to Supabase · realtime ON":"Running on local dataset"}),900);
    return()=>clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const value:AppContextValue = {
    view,setView,query,setQuery,channelFilter,setChannelFilter,sortMode,
    cycleSort:()=>setSortMode(m=>m==="newest"?"budget":m==="budget"?"az":"newest"),
    currentUser,role,setRole,isSuperAdminUser,updateCurrentUserProfile,
    staff,addStaff,promoteStaff,toggleStaffSuspended,removeStaff,
    leads,visibleLeads,leadsByStage,addLead,moveLead,updateLead,selectedLead,openLead,closeLead,
    tasks,toggleTask,addTask,calls,quotes,activity,settings,
    updateSettings:(patch)=>setSettings(s=>({...s,...patch})),
    attachQuote,copyWhatsAppQuote,toasts,pushToast,dismissToast,
    dialer,toggleDialer,startOutbound,answerInbound,pressKey,backspace,beginCall,endCall,completeWrapup,simulateInbound,
    ingestMetaLead,ingestWhatsApp,addLeadOpen,setAddLeadOpen,funnel,
    supabaseLive:isSupabaseConfigured,remoteHydrated,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
