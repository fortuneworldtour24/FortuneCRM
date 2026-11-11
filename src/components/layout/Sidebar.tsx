import { Activity, CheckSquare, Globe, LayoutDashboard, LogOut, Megaphone, MessageCircle, PhoneCall, Plane, Plus, Settings, Users } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";
import { cn } from "@/lib/utils";
import type { LeadSource, ViewKey } from "@/types/database";

const NAV: { key:ViewKey; label:string; icon:typeof Globe }[] = [
  { key:"dashboard", label:"Dashboard",         icon:LayoutDashboard },
  { key:"tasks",     label:"Tasks",             icon:CheckSquare     },
  { key:"activity",  label:"Activity",          icon:Activity        },
  { key:"customers", label:"Customers / Leads", icon:Users           },
  { key:"flights",   label:"Flight Engine",     icon:Plane           },
  { key:"settings",  label:"Settings",          icon:Settings        },
];

const CHANNELS: { key:LeadSource; label:string; icon:typeof Globe }[] = [
  { key:"meta_ads", label:"Meta Ads",          icon:Megaphone    },
  { key:"whatsapp", label:"WhatsApp Inquiries",icon:MessageCircle},
  { key:"walk_in",  label:"Walk-ins / Phone",  icon:PhoneCall    },
];

export function Sidebar() {
  const { view, setView, staff, currentUser, leads, tasks, channelFilter, setChannelFilter, setAddLeadOpen, pushToast, isSuperAdminUser, role } = useApp();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const openTasks = tasks.filter(t=>!t.done).length;
  const agents = staff.filter(s => s.id !== currentUser.id);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      /* AuthContext clears session → App re-renders AuthScreen */
      pushToast({ kind: "success", title: "Signed out successfully" });
    } catch {
      pushToast({ kind: "error", title: "Sign-out failed", body: "Please try again." });
      setSigningOut(false);
    }
  };

  return (
    <aside className="dark-scroll flex h-full w-[260px] shrink-0 flex-col overflow-y-auto px-4 pb-4 pt-5 text-zinc-400">
      {/* Brand */}
      <div className="mb-7 px-1">
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white px-3.5 py-2 shadow-sm transition-all hover:shadow-md">
          <BrandLogo className="h-8 md:h-9" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV.map(item => {
          const active = view === item.key;
          return (
            <button key={item.key} onClick={()=>setView(item.key)}
              className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                active?"bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]":"text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200")}>
              <item.icon className={cn("h-[17px] w-[17px] transition-colors", active?"text-[#EA7218]":"text-zinc-600 group-hover:text-zinc-400")} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.key==="tasks"&&openTasks>0&&<span className="rounded-full bg-[#EA7218]/15 px-2 py-0.5 text-[10px] font-semibold text-[#EA7218]">{openTasks}</span>}
              {item.key==="flights"&&<span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">Live</span>}
            </button>
          );
        })}
      </nav>

      {/* Members */}
      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between px-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Members</p>
          {role === "admin" && (
            <button onClick={()=>setView("settings")} className="rounded-md p-1 text-zinc-600 transition hover:bg-white/[0.06] hover:text-white" title="Manage staff">
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {agents.map(s => {
            const activeCount = leads.filter(l=>l.assigned_to===s.id&&!["closed_won","closed_lost"].includes(l.stage)).length;
            return (
              <div key={s.id} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-white/[0.04]", s.suspended&&"opacity-45")}>
                <Avatar person={s} size="sm" showStatus dark />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-zinc-300">{s.full_name}</p>
                  <p className="truncate text-[10.5px] text-zinc-600">{s.suspended?"Suspended":`${s.title} · ${activeCount} active`}</p>
                </div>
              </div>
            );
          })}
          {role === "admin" && (
            <button onClick={()=>setView("settings")} className="mt-1 flex items-center gap-2.5 rounded-xl border border-dashed border-zinc-800 px-3 py-2 text-[12px] font-medium text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300">
              <Plus className="h-3.5 w-3.5" /> Add Staff
            </button>
          )}
        </div>
      </div>

      {/* Lead Sources */}
      <div className="mt-8">
        <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Lead Sources</p>
        <div className="flex flex-col gap-0.5">
          {CHANNELS.map(c => {
            const count = leads.filter(l=>l.source===c.key).length;
            const active = channelFilter===c.key;
            return (
              <button key={c.key} onClick={()=>{setChannelFilter(active?"all":c.key); setView("customers");}}
                className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] font-medium transition", active?"bg-[#EA7218]/15 text-[#EA7218]":"text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300")}>
                <c.icon className="h-[15px] w-[15px]" />
                <span className="flex-1 text-left">{c.label}</span>
                <span className="text-[10.5px] font-semibold text-zinc-600">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1" />

      {/* Quick intake */}
      <button onClick={()=>setAddLeadOpen(true)}
        className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-[#EA7218] py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(234,114,24,0.8)] transition hover:brightness-110 active:scale-[0.98]">
        <Plus className="h-4 w-4" /> Quick Intake
      </button>

      {/* Profile */}
      <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-white/[0.04] p-2.5 ring-1 ring-white/[0.06]">
        <Avatar person={currentUser} size="md" showStatus dark />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-white">{currentUser.full_name}</p>
          {isSuperAdminUser ? (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#EA7218]/30 to-[#222468]/30 px-2 py-px text-[9.5px] font-bold uppercase tracking-wider text-orange-300">
              ⭐ Super Admin
            </span>
          ) : (
            <span className={cn("mt-0.5 inline-block rounded-full px-2 py-px text-[9.5px] font-bold uppercase tracking-wider",
              currentUser.role==="admin"?"bg-[#222468]/30 text-blue-300":"bg-zinc-700/60 text-zinc-400")}>
              {currentUser.role}
            </span>
          )}
        </div>
        <button
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="rounded-xl p-2 text-zinc-500 transition hover:bg-white/[0.08] hover:text-rose-400 disabled:opacity-40"
          title="Sign out"
        >
          <LogOut className={cn("h-4 w-4", signingOut && "animate-spin opacity-60")} />
        </button>
      </div>
    </aside>
  );
}
