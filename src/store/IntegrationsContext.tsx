/**
 * IntegrationsContext — single source of truth for all third-party
 * API credentials and config.
 *
 * Persistence layer (in priority order):
 *  1. Supabase `system_settings` table (key-value, admin-gated RLS)
 *  2. localStorage fallback under `fwt_system_settings`
 *
 * On mount we hydrate from both sources.
 * On `saveTab` / `saveAll` we persist to both.
 */

import {
  createContext, useCallback, useContext, useEffect, useRef,
  useState, type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_INTEGRATIONS, type IntegrationSettings } from "@/types/integrations";

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                                */
/* ------------------------------------------------------------------ */
const LS_KEY = "fwt_system_settings";

function loadFromLS(): Partial<IntegrationSettings> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<IntegrationSettings>;
  } catch {
    return null;
  }
}

function saveToLS(cfg: IntegrationSettings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  } catch {
    /* quota exceeded — silently skip */
  }
}

/* ------------------------------------------------------------------ */
/*  Supabase helpers (system_settings table: key TEXT PK, value JSONB)  */
/* ------------------------------------------------------------------ */
async function loadFromSupabase(): Promise<Partial<IntegrationSettings> | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["flight", "meta", "whatsapp", "telephony", "email", "ai"]);
    if (!data?.length) return null;
    const out: Record<string, unknown> = {};
    for (const row of data) {
      out[row.key as string] = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
    }
    return out as Partial<IntegrationSettings>;
  } catch {
    return null;
  }
}

async function saveTabToSupabase(key: string, value: unknown) {
  if (!supabase) return;
  try {
    await supabase.from("system_settings").upsert(
      { key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch {
    /* table may not exist — localStorage fallback still works */
  }
}

/* ------------------------------------------------------------------ */
/*  Deep-merge helper (one level)                                       */
/* ------------------------------------------------------------------ */
function merge(base: IntegrationSettings, patch: Partial<IntegrationSettings>): IntegrationSettings {
  return {
    flight:    { ...base.flight,    ...(patch.flight    ?? {}) },
    meta:      { ...base.meta,      ...(patch.meta      ?? {}) },
    whatsapp:  { ...base.whatsapp,  ...(patch.whatsapp  ?? {}) },
    telephony: { ...base.telephony, ...(patch.telephony ?? {}) },
    email:     { ...base.email,     ...(patch.email     ?? {}) },
    ai:        { ...base.ai,        ...(patch.ai        ?? {}) },
  };
}

/* ------------------------------------------------------------------ */
/*  Tab keys                                                             */
/* ------------------------------------------------------------------ */
export type IntegrationTabKey = "flight" | "meta" | "whatsapp" | "telephony" | "email" | "ai";

/* ------------------------------------------------------------------ */
/*  Context value                                                        */
/* ------------------------------------------------------------------ */
interface IntegrationsContextValue {
  cfg: IntegrationSettings;
  updateFlight:    (patch: Partial<IntegrationSettings["flight"]>)    => void;
  updateMeta:      (patch: Partial<IntegrationSettings["meta"]>)      => void;
  updateWhatsApp:  (patch: Partial<IntegrationSettings["whatsapp"]>)  => void;
  updateTelephony: (patch: Partial<IntegrationSettings["telephony"]>) => void;
  updateEmail:     (patch: Partial<IntegrationSettings["email"]>)     => void;
  updateAI:        (patch: Partial<IntegrationSettings["ai"]>)        => void;
  /** Persist a single tab's data to localStorage + Supabase. Returns a promise. */
  saveTab:  (tab: IntegrationTabKey) => Promise<void>;
  /** Persist ALL tabs at once. */
  saveAll:  () => Promise<void>;
  /** True after the first hydration from storage completes. */
  hydrated: boolean;
  /** Per-tab dirty flags (any in-memory edit since last save sets the tab dirty). */
  dirty: Record<IntegrationTabKey, boolean>;
}

const Ctx = createContext<IntegrationsContextValue | null>(null);

export function useIntegrations(): IntegrationsContextValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useIntegrations must be inside <IntegrationsProvider>");
  return c;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                             */
/* ------------------------------------------------------------------ */
export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<IntegrationSettings>(DEFAULT_INTEGRATIONS);
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState<Record<IntegrationTabKey, boolean>>({
    flight: false, meta: false, whatsapp: false, telephony: false, email: false, ai: false,
  });
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  /* ── Hydrate on mount ────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. try Supabase first
      const fromDb = await loadFromSupabase();
      if (cancelled) return;
      if (fromDb && Object.keys(fromDb).length) {
        setCfg(prev => merge(prev, fromDb));
        setHydrated(true);
        return;
      }
      // 2. fall back to localStorage
      const fromLs = loadFromLS();
      if (cancelled) return;
      if (fromLs && Object.keys(fromLs).length) {
        setCfg(prev => merge(prev, fromLs));
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Updaters (set dirty on every change) ────────────────────── */
  const markDirty = useCallback((tab: IntegrationTabKey) => {
    setDirty(d => ({ ...d, [tab]: true }));
  }, []);

  const updateFlight = useCallback(
    (patch: Partial<IntegrationSettings["flight"]>) => {
      setCfg(s => ({ ...s, flight: { ...s.flight, ...patch } }));
      markDirty("flight");
    }, [markDirty]);
  const updateMeta = useCallback(
    (patch: Partial<IntegrationSettings["meta"]>) => {
      setCfg(s => ({ ...s, meta: { ...s.meta, ...patch } }));
      markDirty("meta");
    }, [markDirty]);
  const updateWhatsApp = useCallback(
    (patch: Partial<IntegrationSettings["whatsapp"]>) => {
      setCfg(s => ({ ...s, whatsapp: { ...s.whatsapp, ...patch } }));
      markDirty("whatsapp");
    }, [markDirty]);
  const updateTelephony = useCallback(
    (patch: Partial<IntegrationSettings["telephony"]>) => {
      setCfg(s => ({ ...s, telephony: { ...s.telephony, ...patch } }));
      markDirty("telephony");
    }, [markDirty]);
  const updateEmail = useCallback(
    (patch: Partial<IntegrationSettings["email"]>) => {
      setCfg(s => ({ ...s, email: { ...s.email, ...patch } }));
      markDirty("email");
    }, [markDirty]);
  const updateAI = useCallback(
    (patch: Partial<IntegrationSettings["ai"]>) => {
      setCfg(s => ({ ...s, ai: { ...s.ai, ...patch } }));
      markDirty("ai");
    }, [markDirty]);

  /* ── Persistence ─────────────────────────────────────────────── */
  const saveTab = useCallback(async (tab: IntegrationTabKey) => {
    const current = cfgRef.current;
    // Always persist full state to LS
    saveToLS(current);
    // Explicit OpenRouter key mirror for immediate AI widget pickup
    if (tab === "ai") {
      // Required by AI widget: immediate direct-key persistence on Save Settings
      localStorage.setItem('fwt_openrouter_key', (current.ai.openrouterApiKey || "").trim());
    }
    if (tab === "flight") {
      localStorage.setItem('fwt_serpapi_key', (current.flight.serpApiKey || "").trim());
      localStorage.setItem('serpapi_api_key', (current.flight.serpApiKey || "").trim());
    }
    // Persist single tab to Supabase
    await saveTabToSupabase(tab, current[tab]);
    setDirty(d => ({ ...d, [tab]: false }));
  }, []);

  const saveAll = useCallback(async () => {
    const current = cfgRef.current;
    saveToLS(current);
    // Explicit OpenRouter key mirror for immediate AI widget pickup
    localStorage.setItem('fwt_openrouter_key', (current.ai.openrouterApiKey || "").trim());
    const tabs: IntegrationTabKey[] = ["flight", "meta", "whatsapp", "telephony", "email", "ai"];
    await Promise.all(tabs.map(t => saveTabToSupabase(t, current[t])));
    setDirty({ flight: false, meta: false, whatsapp: false, telephony: false, email: false, ai: false });
  }, []);

  return (
    <Ctx.Provider value={{
      cfg, updateFlight, updateMeta, updateWhatsApp, updateTelephony, updateEmail, updateAI,
      saveTab, saveAll, hydrated, dirty,
    }}>
      {children}
    </Ctx.Provider>
  );
}
