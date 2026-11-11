import { Delete, Mic, MicOff, Pause, Phone, PhoneIncoming, PhoneOff, Save, Signal, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/store/AppContext";
import { cn, formatDuration } from "@/lib/utils";
import type { CallDisposition } from "@/types/database";

const KEYS = ["1","2","3","4","5","6","7","8","9","*","0","#"];
const DISPOSITIONS: CallDisposition[] = ["connected","busy","no_answer","wrong_number"];

export function FloatingDialer() {
  const { dialer, toggleDialer, pressKey, backspace, beginCall, endCall, completeWrapup, simulateInbound } = useApp();
  const [disposition, setDisposition] = useState<CallDisposition>("connected");
  const [notes, setNotes] = useState("");
  const [muted, setMuted] = useState(false);

  if (!dialer.open) {
    return (
      <button onClick={toggleDialer}
        className="ring-pulse fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#222468] to-[#1a1c54] text-white shadow-[0_16px_36px_-10px_rgba(34,36,104,0.9)] transition hover:scale-105 active:scale-95">
        <Phone className="h-5 w-5"/>
      </button>
    );
  }

  const active = dialer.status==="connected"||dialer.status==="dialing";

  return (
    <div className="anim-modal fixed bottom-6 right-6 z-[80] w-[320px] overflow-hidden rounded-[26px] border border-white/10 bg-zinc-950 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between px-5 pt-4">
        <div>
          <p className="text-[13px] font-bold tracking-tight">Softphone</p>
          <p className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500"><Signal className="h-3 w-3 text-emerald-400"/> SIP registered · WebRTC ready</p>
        </div>
        <div className="flex gap-1">
          <button onClick={simulateInbound} className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 transition hover:bg-white/[0.12]">
            <PhoneIncoming className="h-3 w-3 text-emerald-400"/> Inbound
          </button>
          <button onClick={toggleDialer} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.08] hover:text-white"><X className="h-4 w-4"/></button>
        </div>
      </div>

      <div className="px-5 pb-2 pt-3 text-center">
        {active||dialer.status==="wrapup"?(
          <>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{dialer.direction==="inbound"?"Inbound":"Outbound"} · {dialer.leadName}</p>
            <p className="mt-1 font-display text-[24px] font-bold tracking-tight">{dialer.phone}</p>
            <p className="mt-1 text-[11px] font-semibold">
              {dialer.status==="dialing"&&<span className="blink text-[#EA7218]">Dialing…</span>}
              {dialer.status==="connected"&&<span className="text-emerald-400">{formatDuration(dialer.elapsed)}</span>}
              {dialer.status==="wrapup"&&<span className="text-amber-400">Ended · {formatDuration(dialer.elapsed)} — wrap up</span>}
            </p>
          </>
        ):(
          <input value={dialer.phone} readOnly placeholder="Enter number" className="w-full bg-transparent text-center font-display text-[22px] font-bold tracking-wide text-white placeholder:text-zinc-700"/>
        )}
      </div>

      {dialer.status==="connected"&&(
        <div className="flex items-end justify-center gap-1 pb-1">
          {[10,18,26,14,22,8,16,24,12].map((h,i)=><span key={i} className="blink w-1 rounded-full bg-emerald-400/80" style={{height:h,animationDelay:`${i*120}ms`}}/>)}
        </div>
      )}

      {dialer.status==="idle"&&(
        <div className="grid grid-cols-3 gap-1.5 px-5 pb-2 pt-1">
          {KEYS.map(k=><button key={k} onClick={()=>pressKey(k)} className="rounded-xl py-2.5 text-[17px] font-semibold text-zinc-200 transition hover:bg-white/[0.08] active:scale-95">{k}</button>)}
        </div>
      )}

      {dialer.status==="wrapup"&&(
        <div className="space-y-2.5 px-5 pb-2 pt-2">
          <div className="grid grid-cols-2 gap-1.5">
            {DISPOSITIONS.map(d=>(
              <button key={d} onClick={()=>setDisposition(d)}
                className={cn("rounded-lg border py-2 text-[10.5px] font-bold capitalize transition",
                  disposition===d?"border-[#EA7218] bg-[#EA7218]/15 text-[#EA7218]":"border-white/10 text-zinc-400 hover:border-white/25")}>
                {d.replace("_"," ")}
              </button>
            ))}
          </div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Call notes…"
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-[11.5px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:outline-none focus-visible:outline-none"/>
          <button onClick={()=>{ completeWrapup(disposition,notes); setNotes(""); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#222468] py-2.5 text-[12px] font-bold text-white transition hover:bg-[#EA7218]">
            <Save className="h-3.5 w-3.5"/> Save & log call
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 px-5 py-4">
        {dialer.status==="idle"&&(
          <>
            <button onClick={backspace} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400 transition hover:bg-white/[0.12]"><Delete className="h-4 w-4"/></button>
            <button onClick={beginCall} disabled={dialer.phone.replace(/\D/g,"").length<4}
              className={cn("flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_10px_24px_-6px_rgba(16,185,129,0.7)] transition hover:brightness-110 active:scale-95",dialer.phone.replace(/\D/g,"").length<4&&"opacity-30")}>
              <Phone className="h-5 w-5"/>
            </button>
            <span className="w-11"/>
          </>
        )}
        {active&&(
          <>
            <button onClick={()=>setMuted(m=>!m)}
              className={cn("flex h-11 w-11 items-center justify-center rounded-full transition",muted?"bg-amber-500/20 text-amber-300":"bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12]")}>
              {muted?<MicOff className="h-4 w-4"/>:<Mic className="h-4 w-4"/>}
            </button>
            <button onClick={endCall} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_10px_24px_-6px_rgba(239,68,68,0.7)] transition hover:brightness-110 active:scale-95">
              <PhoneOff className="h-5 w-5"/>
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 transition hover:bg-white/[0.12]"><Pause className="h-4 w-4"/></button>
          </>
        )}
      </div>
    </div>
  );
}
