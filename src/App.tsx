import { useEffect, useRef, useState } from "react";
import { AlertCircle, Globe, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AddLeadModal } from "@/components/leads/AddLeadModal";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { FloatingDialer } from "@/components/telephony/FloatingDialer";
import { Toasts } from "@/components/ui/Toasts";
import { FloatingAssistant } from "@/components/ai/FloatingAssistant";
import { AuthProvider, useAuth } from "@/store/AuthContext";
import { AppProvider, useApp } from "@/store/AppContext";
import { IntegrationsProvider } from "@/store/IntegrationsContext";
import { ActivityView } from "@/views/ActivityView";
import { CustomersView } from "@/views/CustomersView";
import { DashboardView } from "@/views/DashboardView";
import { FlightsView } from "@/views/FlightsView";
import { SettingsView } from "@/views/SettingsView";
import { TasksView } from "@/views/TasksView";
import { cn } from "@/lib/utils";

/* ================================================================== */
/*  Logo — hosted URL with graceful text fallback                      */
/* ================================================================== */
function LogoBlock({ size = "lg" }: { size?: "lg" | "sm" }) {
  const [failed, setFailed] = useState(false);
  const h = size === "lg" ? "h-12" : "h-8";

  if (!failed) {
    return (
      <img
        src="https://lh3.googleusercontent.com/d/1L4iFSjVY8BNFyga4lHmUnzjdi6yBpExa"
        alt="Fortune World Tour"
        className={`${h} w-auto object-contain`}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          setFailed(true);
        }}
      />
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-gradient-to-br from-[#222468] to-[#1a1c54] shadow-lg",
          size === "lg" ? "h-10 w-10" : "h-7 w-7"
        )}
      >
        <Globe
          className={cn(
            "text-[#EA7218]",
            size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"
          )}
        />
      </span>
      <div className="text-left">
        <p
          className={cn(
            "font-display font-bold leading-none tracking-tight text-[#222468]",
            size === "lg" ? "text-[18px]" : "text-[13px]"
          )}
        >
          F<span className="text-[#EA7218]">O</span>RTUNE
        </p>
        <p
          className={cn(
            "font-bold uppercase tracking-[0.22em] text-[#222468]/60",
            size === "lg" ? "text-[10px]" : "text-[8px]"
          )}
        >
          World Tour
        </p>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Shared input style                                                  */
/* ================================================================== */
const INPUT =
  "h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[13px] font-semibold text-zinc-900 shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-zinc-400 focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none focus-visible:outline-none";

/* ================================================================== */
/*  Auth card — sign-in and sign-up                                    */
/* ================================================================== */
type AuthMode = "signin" | "signup";

function AuthScreen() {
  const { signIn, signUp, supabaseReady } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  /* Focus email field whenever the mode switches */
  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
    emailRef.current?.focus();
  }, [mode]);

  const handleSubmit = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    /* ── Validation ── */
    if (!email.trim()) return setErrorMsg("Email is required.");
    if (!password || password.length < 6)
      return setErrorMsg("Password must be at least 6 characters.");
    if (mode === "signup") {
      if (!fullName.trim()) return setErrorMsg("Full name is required.");
    }

    setLoading(true);

    if (mode === "signin") {
      const err = await signIn(email, password);
      if (err) {
        setErrorMsg(err);
        setLoading(false);
      }
      /* On success the AuthProvider sets `session` → App re-renders Shell */
    } else {
      const err = await signUp(email, password, fullName, roleTitle);
      if (err) {
        setErrorMsg(err);
        setLoading(false);
      } else {
        setSuccessMsg("Account created! Signing you in…");
        /* onAuthStateChange / session update will re-render Shell automatically */
      }
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleSubmit();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121112] p-4">
      {/* ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#222468]/30 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#EA7218]/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[440px]">
        <div className="rounded-[32px] border border-white/[0.06] bg-[#F8F9FA] p-10 shadow-2xl">
          {/* ── Logo ── */}
          <div className="mb-6 flex flex-col items-center gap-2.5">
            <LogoBlock size="lg" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Travel Operations Portal
            </p>
          </div>

          {/* ── Mode pill switcher ── */}
          <div className="mb-6 flex rounded-2xl border border-zinc-200 bg-zinc-100 p-1">
            {(["signin", "signup"] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-xl py-2 text-[12.5px] font-bold transition-all duration-200",
                  mode === m
                    ? "bg-[#222468] text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                {m === "signin" ? "Sign In" : "Create Staff Account"}
              </button>
            ))}
          </div>

          {/* ── Fields ── */}
          <div className="space-y-3">
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="e.g. Himanshu Sharma"
                    autoFocus
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="e.g. Senior Ticketing Consultant"
                    className={INPUT}
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
                Email Address
              </label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKey}
                placeholder="you@fortuneworld.tours"
                className={INPUT}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
                Password{" "}
                {mode === "signup" && (
                  <span className="normal-case font-normal text-zinc-400">
                    (min 6 chars)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKey}
                placeholder="••••••••"
                className={INPUT}
              />
            </div>

            {/* ── Error / success feedback ── */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-[12px] font-semibold leading-snug text-red-700">
                  {errorMsg}
                </p>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-500" />
                <p className="text-[12px] font-semibold text-emerald-700">
                  {successMsg}
                </p>
              </div>
            )}

            {/* ── Supabase not configured notice ── */}
            {!supabaseReady && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-amber-700">
                ⚠️ Supabase is not configured — set{" "}
                <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_URL</code>{" "}
                and{" "}
                <code className="rounded bg-amber-100 px-1">
                  VITE_SUPABASE_ANON_KEY
                </code>{" "}
                in your <code className="rounded bg-amber-100 px-1">.env</code> file.
              </p>
            )}

            <button
              onClick={() => void handleSubmit()}
              disabled={loading || !supabaseReady}
              className={cn(
                "mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#222468] text-[13.5px] font-bold text-white shadow-lg shadow-[#222468]/30 transition-all duration-200 hover:bg-[#1a1c54] active:scale-[0.98]",
                (loading || !supabaseReady) && "cursor-not-allowed opacity-60"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "signin" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "signin" ? (
                "Sign In to CRM"
              ) : (
                "Create Staff Account"
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-[10.5px] font-medium text-zinc-400">
            Powered by Fortune World Tour · Supabase backend
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Splash shown while session check is in-flight                      */
/* ================================================================== */
function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121112]">
      <div className="flex flex-col items-center gap-5">
        <LogoBlock size="lg" />
        <Loader2 className="h-6 w-6 animate-spin text-[#EA7218]" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Loading workspace…
        </p>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main CRM workspace (only rendered when session exists)             */
/* ================================================================== */
function Workspace() {
  const { view } = useApp();
  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] bg-[#F8F9FA] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_60px_-30px_rgba(0,0,0,0.9)]">
      <div className="nice-scroll h-full overflow-y-auto scroll-smooth px-8 pb-10 pt-6">
        <Header />
        {view === "dashboard" && <DashboardView />}
        {view === "customers" && <CustomersView />}
        {view === "tasks" && <TasksView />}
        {view === "activity" && <ActivityView />}
        {view === "flights" && <FlightsView />}
        {view === "settings" && <SettingsView />}
        <footer className="mt-10 flex items-center justify-between border-t border-zinc-200/70 pt-4">
          <p className="text-[10.5px] font-medium text-zinc-400">
            Fortune World Tour CRM · Enterprise Travel Command Center
          </p>
          <p className="text-[10.5px] font-medium text-zinc-300">
            SerpApi · Supabase · WebRTC softphone
          </p>
        </footer>
      </div>
    </main>
  );
}

function Shell() {
  return (
    <div className="flex h-screen w-screen gap-3 overflow-hidden bg-[#121112] p-3">
      <Sidebar />
      <Workspace />
      <LeadDrawer />
      <AddLeadModal />
      <FloatingAssistant />
      <FloatingDialer />
      <Toasts />
    </div>
  );
}

/* ================================================================== */
/*  Root gating component (reads AuthContext)                          */
/* ================================================================== */
function AppGate() {
  const { session, authLoading, authUser } = useAuth();

  /* Still doing the first session check → show splash */
  if (authLoading) return <SplashScreen />;

  /* No active session → show auth screen */
  if (!session || !authUser) return <AuthScreen />;

  /* Authenticated → boot the full CRM with the real user profile */
  return (
    <IntegrationsProvider>
      <AppProvider authProfile={authUser}>
        <Shell />
      </AppProvider>
    </IntegrationsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
