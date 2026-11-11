import { AlertTriangle, CheckCircle2, Info, PhoneIncoming, PhoneOff, X } from "lucide-react";
import { useApp } from "@/store/AppContext";
import { cn } from "@/lib/utils";

export function Toasts() {
  const { toasts, dismissToast, answerInbound } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-6 left-[280px] z-[90] flex w-[360px] flex-col gap-2.5">
      {toasts.map(t => (
        <div key={t.id} className={cn("anim-fade-up pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl",
          t.kind==="call" ? "border-emerald-500/30 bg-zinc-900/95 text-white" : "border-zinc-200/70 bg-white/95")}>
          {t.kind==="call" ? (
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="ring-pulse-green flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                  <PhoneIncoming className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-tight">{t.title}</p>
                  {t.body && <p className="mt-0.5 truncate text-[11.5px] text-zinc-400">{t.body}</p>}
                  <div className="mt-3 flex gap-2">
                    <button onClick={()=>answerInbound(t.id)} className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-emerald-400">Answer</button>
                    <button onClick={()=>dismissToast(t.id)} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-zinc-300 transition hover:bg-white/20"><PhoneOff className="h-3 w-3" /> Decline</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3.5">
              <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", t.kind==="success"&&"bg-emerald-100 text-emerald-600", t.kind==="info"&&"bg-blue-100 text-blue-600", t.kind==="error"&&"bg-red-100 text-red-600")}>
                {t.kind==="success"?<CheckCircle2 className="h-3.5 w-3.5"/>:t.kind==="error"?<AlertTriangle className="h-3.5 w-3.5"/>:<Info className="h-3.5 w-3.5"/>}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-zinc-900">{t.title}</p>
                {t.body && <p className="mt-0.5 text-[11.5px] leading-snug text-zinc-500">{t.body}</p>}
              </div>
              <button onClick={()=>dismissToast(t.id)} className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
