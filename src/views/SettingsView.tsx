import {
  BadgeCheck, Ban, Camera, Check, CheckCircle2, ClipboardCopy, Globe,
  Loader2, Lock, Mail, Megaphone, MessageCircle, Phone,
  PhoneCall, PhoneIncoming, Plus, Save,
  ShieldCheck, Trash2, UserCog, X, Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/store/AppContext";
import { useIntegrations, type IntegrationTabKey } from "@/store/IntegrationsContext";
import { SUPER_ADMIN_EMAIL } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";
import type {
  AIProvider, AmadeusEnv, AssignmentMode, DialerMode,
  EmailProvider, FlightProvider, WhatsAppProvider,
} from "@/types/integrations";

/* ------------------------------------------------------------------ */
/*  Primitives                                                           */
/* ------------------------------------------------------------------ */


const INP = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[12.5px] font-semibold text-zinc-900 outline-none transition-all focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none focus-visible:outline-none placeholder:font-normal placeholder:text-zinc-400";
const SEL = "h-10 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 text-[12.5px] font-semibold text-zinc-900 outline-none transition-all focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none focus-visible:outline-none";

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">{children}</p>;
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[10px] font-medium text-zinc-400">{hint}</p>}
    </div>
  );
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "sk-…"}
        className={cn(INP, "pr-20")}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-zinc-400 hover:text-zinc-700"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    void navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <code className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-zinc-600">{value}</code>
        <button onClick={doCopy} className="flex shrink-0 items-center gap-1 rounded-lg bg-zinc-200 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide text-zinc-600 transition hover:bg-zinc-300">
          <ClipboardCopy className="h-3 w-3" />{copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold", ok ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-500" : "bg-zinc-400")} />
      {label}
    </span>
  );
}

/** Sticky save bar rendered at the bottom of each tab */
function SaveBar({ tab }: { tab: IntegrationTabKey }) {
  const { saveTab, dirty } = useIntegrations();
  const { pushToast } = useApp();
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const isDirty = dirty[tab];

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTab(tab);
      setJustSaved(true);
      pushToast({ kind: "success", title: "Settings saved successfully!", body: `${tab.charAt(0).toUpperCase() + tab.slice(1)} configuration persisted.` });
      setTimeout(() => setJustSaved(false), 2500);
    } catch {
      pushToast({ kind: "error", title: "Save failed", body: "Check your network and try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sticky bottom-0 mt-6 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/95 px-5 py-3.5 shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.08)] backdrop-blur-md">
      <div className="flex items-center gap-2">
        {isDirty ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Unsaved changes
          </span>
        ) : justSaved ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        ) : (
          <span className="text-[11px] font-medium text-zinc-400">No pending changes</span>
        )}
      </div>
      <button
        onClick={() => void handleSave()}
        disabled={saving || (!isDirty && !justSaved)}
        className={cn(
          "flex items-center gap-2 rounded-xl px-6 py-2.5 text-[12.5px] font-bold text-white shadow-lg transition-all active:scale-[0.97]",
          saving ? "cursor-wait bg-zinc-400" : isDirty ? "bg-[#EA7218] hover:bg-[#d4670f] shadow-[#EA7218]/30" : justSaved ? "bg-emerald-600" : "bg-zinc-300 cursor-not-allowed"
        )}
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
        ) : justSaved ? (
          <><Check className="h-4 w-4" /> Saved</>
        ) : (
          <><Save className="h-4 w-4" /> Save Settings</>
        )}
      </button>
    </div>
  );
}

/** Compact "Save All" button for the top-right page header */
function SaveAllButton() {
  const { saveAll, dirty } = useIntegrations();
  const { pushToast } = useApp();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const anyDirty = Object.values(dirty).some(Boolean);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await saveAll();
      setDone(true);
      pushToast({ kind: "success", title: "All settings saved!", body: "Flight, Meta, WhatsApp, Telephony & Email persisted." });
      setTimeout(() => setDone(false), 2500);
    } catch {
      pushToast({ kind: "error", title: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={() => void handleSaveAll()}
      disabled={saving || (!anyDirty && !done)}
      className={cn(
        "ml-2 flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-bold transition-all active:scale-[0.97]",
        saving ? "cursor-wait bg-zinc-300 text-zinc-500"
        : done ? "bg-emerald-600 text-white"
        : anyDirty ? "bg-[#EA7218] text-white shadow-md shadow-[#EA7218]/25 hover:bg-[#d4670f]"
        : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
      )}
    >
      {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
       : done ? <><Check className="h-3.5 w-3.5" /> Saved</>
       : <><Save className="h-3.5 w-3.5" /> Save All Settings</>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB A — Flight API                                                   */
/* ------------------------------------------------------------------ */
function TabFlight() {
  const { cfg, updateFlight } = useIntegrations();
  const { updateSettings } = useApp();
  const f = cfg.flight;
  const supaUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const proxyUrl = `${supaUrl}/functions/v1/search-flights`;
  const isAmadeus = f.activeProvider === "amadeus";
  const hasSerpKey = f.serpApiKey.length > 10;
  const hasAmadeusKeys = f.amadeusClientId.length > 3 && f.amadeusClientSecret.length > 3;

  return (
    <div className="space-y-5">
      <SectionCard title="Active GDS / Search Engine">
        <FieldRow label="Select Search Engine" hint="Switching engine reloads the Flight Quote panel instantly — no restart needed.">
          <select value={f.activeProvider} onChange={e => { updateFlight({ activeProvider: e.target.value as FlightProvider }); updateSettings({ provider: e.target.value }); }} className={SEL}>
            <option value="serpapi">SerpApi (Google Flights — real-time web scrape)</option>
            <option value="amadeus">Amadeus GDS (Live Booking & NDC Fares)</option>
          </select>
        </FieldRow>
        <div className="flex items-center gap-3 pt-1">
          <StatusPill ok={isAmadeus ? hasAmadeusKeys : hasSerpKey} label={isAmadeus ? (hasAmadeusKeys ? "Amadeus configured" : "Amadeus keys missing") : (hasSerpKey ? "SerpApi key set" : "Using proxy / no key")} />
          <StatusPill ok={!!supaUrl} label={supaUrl ? "Edge proxy configured" : "Supabase URL missing"} />
        </div>
      </SectionCard>

      {!isAmadeus && (
        <SectionCard title="SerpApi Configuration">
          <CopyField value={proxyUrl} label="Edge Function Proxy (browser → server)" />
          <FieldRow label="SerpApi API Key" hint="Stored server-side via Supabase vault — never exposed to the browser.">
            <SecretInput value={f.serpApiKey} onChange={v => updateFlight({ serpApiKey: v })} placeholder="7d33311ea6e22051…" />
          </FieldRow>
        </SectionCard>
      )}

      {isAmadeus && (
        <SectionCard title="Amadeus GDS Configuration">
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Client ID">
              <SecretInput value={f.amadeusClientId} onChange={v => updateFlight({ amadeusClientId: v })} placeholder="Amadeus Client ID" />
            </FieldRow>
            <FieldRow label="Client Secret">
              <SecretInput value={f.amadeusClientSecret} onChange={v => updateFlight({ amadeusClientSecret: v })} placeholder="Amadeus Client Secret" />
            </FieldRow>
          </div>
          <FieldRow label="Office ID (OID)" hint="Required for PNR creation & ticket issuance via GDS.">
            <input value={f.amadeusOfficeId} onChange={e => updateFlight({ amadeusOfficeId: e.target.value })} placeholder="SYDQF2500" className={INP} />
          </FieldRow>
          <FieldRow label="Environment">
            <select value={f.amadeusEnv} onChange={e => updateFlight({ amadeusEnv: e.target.value as AmadeusEnv })} className={SEL}>
              <option value="sandbox">Sandbox / Test (test.api.amadeus.com)</option>
              <option value="production">Production (api.amadeus.com)</option>
            </select>
          </FieldRow>
          <div className={cn("rounded-xl border px-3.5 py-3 text-[11px] font-medium", f.amadeusEnv === "production" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-800")}>
            {f.amadeusEnv === "production" ? "⚠️ Production mode — real bookings & charges will be made." : "ℹ️ Sandbox mode — test PNRs only, no real charges."}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Pricing Defaults">
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Agency Markup %" hint="Added on top of net fare to calculate selling price.">
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={40} value={f.defaultMarkupPercent}
                onChange={e => { updateFlight({ defaultMarkupPercent: Number(e.target.value) }); updateSettings({ markupPercent: Number(e.target.value) }); }}
                className={cn(INP, "w-24 text-center font-display text-[16px] font-bold")} />
              <span className="text-[14px] font-bold text-zinc-500">%</span>
            </div>
          </FieldRow>
          <FieldRow label="Default Currency">
            <select value={f.defaultCurrency} onChange={e => { updateFlight({ defaultCurrency: e.target.value }); updateSettings({ currency: e.target.value }); }} className={SEL}>
              {["AUD", "USD", "EUR", "GBP", "INR", "AED", "SGD", "NZD"].map(c => <option key={c}>{c}</option>)}
            </select>
          </FieldRow>
        </div>
      </SectionCard>
      <SaveBar tab="flight" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB B — Meta Lead Ads                                               */
/* ------------------------------------------------------------------ */
function TabMeta() {
  const { cfg, updateMeta } = useIntegrations();
  const { ingestMetaLead } = useApp();
  const m = cfg.meta;
  const supaUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const webhookUrl = `${supaUrl}/functions/v1/meta-lead-webhook`;

  return (
    <div className="space-y-5">
      <SectionCard title="Meta App Credentials">
        <CopyField value={webhookUrl} label="Webhook Callback URL (paste in Meta App Dashboard → Webhooks)" />
        <FieldRow label="Verify Token" hint="Must match the value set in your Meta App → Webhooks configuration.">
          <input value={m.verifyToken} onChange={e => updateMeta({ verifyToken: e.target.value })} className={INP} placeholder="fwt-verify-token" />
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Meta App ID">
            <input value={m.appId} onChange={e => updateMeta({ appId: e.target.value })} className={INP} placeholder="1234567890" />
          </FieldRow>
          <FieldRow label="Page Access Token">
            <SecretInput value={m.pageAccessToken} onChange={v => updateMeta({ pageAccessToken: v })} placeholder="EAABwzLixnjYB…" />
          </FieldRow>
        </div>
      </SectionCard>

      <SectionCard title="Lead Assignment">
        <FieldRow label="Assignment Mode">
          <select value={m.assignmentMode} onChange={e => updateMeta({ assignmentMode: e.target.value as AssignmentMode })} className={SEL}>
            <option value="round_robin">Round-Robin (auto-balance load across active consultants)</option>
            <option value="manual">Manual Assignment (lead lands in Unassigned queue)</option>
          </select>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Webhook Simulation">
        <p className="text-[11px] leading-relaxed text-zinc-500">Fire a simulated Meta Lead Ads payload against the ingestion pipeline. The lead will land in the <em>Contacted</em> stage and be assigned according to the mode above.</p>
        <button
          onClick={() => ingestMetaLead({ full_name: "Demo Lead", phone_number: "+61 400 000 000", travel_destination: "Bali", departure_date: new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10), campaign_name: "Test Campaign" })}
          className="flex items-center gap-2 rounded-xl bg-[#222468] px-4 py-2.5 text-[11.5px] font-bold text-white transition hover:brightness-110"
        >
          <Megaphone className="h-3.5 w-3.5" /> Simulate Meta Lead
        </button>
      </SectionCard>
      <SaveBar tab="meta" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB C — WhatsApp                                                    */
/* ------------------------------------------------------------------ */
function TabWhatsApp() {
  const { cfg, updateWhatsApp } = useIntegrations();
  const { ingestWhatsApp } = useApp();
  const w = cfg.whatsapp;
  const supaUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const webhookUrl = `${supaUrl}/functions/v1/whatsapp-webhook`;
  const isMeta = w.provider === "meta";

  return (
    <div className="space-y-5">
      <SectionCard title="WhatsApp Provider">
        <FieldRow label="Active Provider">
          <select value={w.provider} onChange={e => updateWhatsApp({ provider: e.target.value as WhatsAppProvider })} className={SEL}>
            <option value="meta">Meta Cloud API (official WhatsApp Business API)</option>
            <option value="twilio">Twilio WhatsApp (Twilio sandbox & production)</option>
          </select>
        </FieldRow>
      </SectionCard>

      {isMeta ? (
        <SectionCard title="Meta Cloud API Credentials">
          <CopyField value={webhookUrl} label="Webhook URL (Meta App → WhatsApp → Configuration)" />
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Phone Number ID">
              <input value={w.phoneNumberId} onChange={e => updateWhatsApp({ phoneNumberId: e.target.value })} className={INP} placeholder="1234567890" />
            </FieldRow>
            <FieldRow label="Business Account ID">
              <input value={w.businessAccountId} onChange={e => updateWhatsApp({ businessAccountId: e.target.value })} className={INP} placeholder="9876543210" />
            </FieldRow>
          </div>
          <FieldRow label="System Access Token">
            <SecretInput value={w.accessToken} onChange={v => updateWhatsApp({ accessToken: v })} placeholder="EAABwzLixnjYB…" />
          </FieldRow>
        </SectionCard>
      ) : (
        <SectionCard title="Twilio WhatsApp Credentials">
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Account SID">
              <input value={w.twilioAccountSid} onChange={e => updateWhatsApp({ twilioAccountSid: e.target.value })} className={INP} placeholder="ACxxxxxxxxxxxxxxx" />
            </FieldRow>
            <FieldRow label="Auth Token">
              <SecretInput value={w.twilioAuthToken} onChange={v => updateWhatsApp({ twilioAuthToken: v })} placeholder="your_auth_token" />
            </FieldRow>
          </div>
          <FieldRow label="Twilio WhatsApp Number" hint="e.g. +14155238886 (sandbox) or your approved number.">
            <input value={w.twilioWhatsAppNumber} onChange={e => updateWhatsApp({ twilioWhatsAppNumber: e.target.value })} className={INP} placeholder="+14155238886" />
          </FieldRow>
        </SectionCard>
      )}

      <SectionCard title="Quick Quote Template">
        <FieldRow label="Template Message" hint="Variables: {{name}}, {{route}}, {{airline}}, {{depart}}, {{arrive}}, {{duration}}, {{price}}, {{agencyPhone}}">
          <textarea
            value={w.quickTemplate}
            onChange={e => updateWhatsApp({ quickTemplate: e.target.value })}
            rows={8}
            className="w-full resize-none rounded-xl border border-zinc-200 bg-white p-3 font-mono text-[11.5px] leading-relaxed text-zinc-700 outline-none focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none"
          />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Webhook Simulation">
        <button
          onClick={() => ingestWhatsApp({ wa_id: "+61 400 123 456", profile_name: "Demo WhatsApp User", message: "Hi! Looking for flights to Tokyo in October for 2 people" })}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[11.5px] font-bold text-white transition hover:brightness-110"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Simulate WhatsApp Inquiry
        </button>
      </SectionCard>
      <SaveBar tab="whatsapp" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB D — Telephony                                                   */
/* ------------------------------------------------------------------ */
function TabTelephony() {
  const { cfg, updateTelephony } = useIntegrations();
  const { simulateInbound, toggleDialer } = useApp();
  const t = cfg.telephony;
  const isTwilio = t.dialerMode === "twilio";
  const isSip = t.dialerMode === "sip";

  return (
    <div className="space-y-5">
      <SectionCard title="Dialer Mode">
        <FieldRow label="Active Calling System" hint="WebRTC runs entirely in the browser — no install required.">
          <select value={t.dialerMode} onChange={e => updateTelephony({ dialerMode: e.target.value as DialerMode })} className={SEL}>
            <option value="webrtc">Browser WebRTC Softphone (built-in)</option>
            <option value="tel">Click-to-Call (tel: protocol — opens native phone app)</option>
            <option value="twilio">Twilio Voice (server-side PSTN bridge)</option>
            <option value="sip">Custom PBX / SIP Gateway</option>
          </select>
        </FieldRow>
      </SectionCard>

      {isTwilio && (
        <SectionCard title="Twilio Voice Credentials">
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Account SID">
              <input value={t.twilioAccountSid} onChange={e => updateTelephony({ twilioAccountSid: e.target.value })} className={INP} placeholder="ACxxxxxxxxxxxxxxx" />
            </FieldRow>
            <FieldRow label="API Key / Auth Token">
              <SecretInput value={t.twilioApiKey} onChange={v => updateTelephony({ twilioApiKey: v })} placeholder="your_auth_token" />
            </FieldRow>
          </div>
        </SectionCard>
      )}

      {isSip && (
        <SectionCard title="SIP Gateway Configuration">
          <FieldRow label="SIP Endpoint / Host">
            <input value={t.sipEndpoint} onChange={e => updateTelephony({ sipEndpoint: e.target.value })} className={INP} placeholder="sip.yourpbx.com" />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="SIP Username">
              <input value={t.sipUsername} onChange={e => updateTelephony({ sipUsername: e.target.value })} className={INP} placeholder="1001@sip.yourpbx.com" />
            </FieldRow>
            <FieldRow label="SIP Password">
              <SecretInput value={t.sipPassword} onChange={v => updateTelephony({ sipPassword: v })} placeholder="••••••••" />
            </FieldRow>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Test & Simulation">
        <div className="flex flex-wrap gap-2">
          <button onClick={toggleDialer} className="flex items-center gap-2 rounded-xl bg-[#222468] px-4 py-2.5 text-[11.5px] font-bold text-white transition hover:brightness-110">
            <Phone className="h-3.5 w-3.5" /> Open Softphone Dialer
          </button>
          <button onClick={simulateInbound} className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-[11.5px] font-bold text-zinc-700 transition hover:border-zinc-400">
            <PhoneIncoming className="h-3.5 w-3.5" /> Simulate Inbound Call
          </button>
        </div>
        <p className="text-[10px] font-medium text-zinc-400">WebRTC uses your browser's microphone. Ensure permissions are granted. Click-to-Call opens your OS default phone app.</p>
      </SectionCard>
      <SaveBar tab="telephony" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB E — Email                                                        */
/* ------------------------------------------------------------------ */
function TabEmail() {
  const { cfg, updateEmail } = useIntegrations();
  const e = cfg.email;
  const isResend = e.provider === "resend";
  const [previewTemplate, setPreviewTemplate] = useState<"quote" | "booking" | null>(null);

  return (
    <div className="space-y-5">
      <SectionCard title="Email Provider">
        <FieldRow label="Active Email Gateway">
          <select value={e.provider} onChange={ev => updateEmail({ provider: ev.target.value as EmailProvider })} className={SEL}>
            <option value="resend">Resend API (recommended — developer-first, 100k/mo free)</option>
            <option value="smtp">Custom SMTP Server (SendGrid, Mailgun, AWS SES, Postfix…)</option>
          </select>
        </FieldRow>
      </SectionCard>

      {isResend ? (
        <SectionCard title="Resend API">
          <FieldRow label="Resend API Key" hint="Create at resend.com/api-keys — requires a verified domain.">
            <SecretInput value={e.resendApiKey} onChange={v => updateEmail({ resendApiKey: v })} placeholder="re_xxxxxxxxxxxxxxxxxxxx" />
          </FieldRow>
          <StatusPill ok={e.resendApiKey.length > 5} label={e.resendApiKey.length > 5 ? "API key set" : "API key missing"} />
        </SectionCard>
      ) : (
        <SectionCard title="SMTP Server">
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <FieldRow label="SMTP Host">
              <input value={e.smtpHost} onChange={ev => updateEmail({ smtpHost: ev.target.value })} className={INP} placeholder="smtp.sendgrid.net" />
            </FieldRow>
            <FieldRow label="Port">
              <input value={e.smtpPort} onChange={ev => updateEmail({ smtpPort: ev.target.value })} className={INP} placeholder="587" />
            </FieldRow>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Username">
              <input value={e.smtpUser} onChange={ev => updateEmail({ smtpUser: ev.target.value })} className={INP} placeholder="apikey" />
            </FieldRow>
            <FieldRow label="Password / API Key">
              <SecretInput value={e.smtpPassword} onChange={v => updateEmail({ smtpPassword: v })} placeholder="SG.xxxxxxxxxxxxxxx" />
            </FieldRow>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Sender Identity">
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Sender Name">
            <input value={e.senderName} onChange={ev => updateEmail({ senderName: ev.target.value })} className={INP} />
          </FieldRow>
          <FieldRow label="Sender Email" hint="Must be verified on your domain.">
            <input type="email" value={e.senderEmail} onChange={ev => updateEmail({ senderEmail: ev.target.value })} className={INP} />
          </FieldRow>
        </div>
      </SectionCard>

      <SectionCard title="Email Templates">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setPreviewTemplate("quote")} className="rounded-2xl border border-zinc-200 p-4 text-left transition hover:border-[#222468]/40 hover:bg-[#222468]/5">
            <Mail className="mb-2 h-5 w-5 text-[#222468]" />
            <p className="text-[12.5px] font-bold text-zinc-900">Instant Flight Quote</p>
            <p className="mt-1 text-[10.5px] text-zinc-500">Branded HTML itinerary table with net/sell price breakdown</p>
          </button>
          <button onClick={() => setPreviewTemplate("booking")} className="rounded-2xl border border-zinc-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40">
            <Zap className="mb-2 h-5 w-5 text-emerald-600" />
            <p className="text-[12.5px] font-bold text-zinc-900">Booking Confirmation & E-Ticket</p>
            <p className="mt-1 text-[10.5px] text-zinc-500">PNR, passengers, itinerary and PDF attachment trigger</p>
          </button>
        </div>
      </SectionCard>

      {previewTemplate && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div className="anim-fade-in absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={() => setPreviewTemplate(null)} />
          <div className="anim-modal relative max-h-[90vh] w-[680px] overflow-y-auto rounded-[26px] border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <div>
                <h3 className="font-display text-[16px] font-bold text-zinc-950">
                  {previewTemplate === "quote" ? "Instant Flight Quote" : "Booking Confirmation & E-Ticket"}
                </h3>
                <p className="text-[11px] text-zinc-400">Branded HTML email preview — sent from {e.senderName} &lt;{e.senderEmail}&gt;</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:bg-zinc-100"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="p-6">
              {previewTemplate === "quote" ? <QuoteEmailPreview senderName={e.senderName} /> : <BookingEmailPreview senderName={e.senderName} />}
            </div>
          </div>
        </div>
      )}
      <SaveBar tab="email" />
    </div>
  );
}

function QuoteEmailPreview({ senderName }: { senderName: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white font-sans text-[13px] text-zinc-800 shadow-sm">
      <div className="rounded-t-2xl bg-[#222468] p-6 text-center text-white">
        <p className="text-[22px] font-bold tracking-tight">{senderName}</p>
        <p className="mt-1 text-[13px] font-medium text-blue-200">Your Personalised Flight Quote</p>
      </div>
      <div className="p-6">
        <p className="text-[13px] text-zinc-600">Hi <strong>Aarav</strong>,</p>
        <p className="mt-2 text-[12.5px] text-zinc-500">Thank you for your enquiry! Here is your personalised quote:</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-[12px]">
            <thead className="bg-zinc-50">
              <tr>
                {["Route", "Airline", "Departure", "Arrival", "Duration", "Class"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-zinc-100">
                <td className="px-3 py-2.5 font-semibold text-zinc-900">SYD → DXB</td>
                <td className="px-3 py-2.5 text-zinc-600">Emirates EK413</td>
                <td className="px-3 py-2.5 text-zinc-600">08:45</td>
                <td className="px-3 py-2.5 text-zinc-600">14:20+1</td>
                <td className="px-3 py-2.5 text-zinc-600">13h 35m</td>
                <td className="px-3 py-2.5 text-zinc-600">Economy</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-xl bg-[#222468]/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-zinc-600">Total (all-in, incl. taxes)</span>
            <span className="font-display text-[22px] font-bold text-[#222468]">AUD 2,480</span>
          </div>
          <p className="mt-1 text-[10.5px] text-zinc-400">Price valid for 24 hours · Subject to seat availability</p>
        </div>
        <div className="mt-5 rounded-xl bg-[#EA7218] p-3.5 text-center text-white">
          <p className="text-[13px] font-bold">Reply YES to this email or call us to confirm your booking</p>
          <p className="mt-1 text-[11px] font-medium text-orange-100">+61 2 8000 4422 · quotes@fortuneworldtours.com</p>
        </div>
      </div>
      <div className="rounded-b-2xl bg-zinc-50 px-6 py-4 text-center text-[10px] text-zinc-400">
        © {new Date().getFullYear()} {senderName} · This quote is confidential and intended only for the named recipient.
      </div>
    </div>
  );
}

function BookingEmailPreview({ senderName }: { senderName: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white font-sans text-[13px] text-zinc-800 shadow-sm">
      <div className="rounded-t-2xl bg-emerald-700 p-6 text-center text-white">
        <p className="text-[22px] font-bold tracking-tight">{senderName}</p>
        <p className="mt-1 text-[13px] font-medium text-emerald-200">✅ Booking Confirmed — E-Ticket Receipt</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="rounded-xl bg-zinc-50 p-4">
          <div className="grid grid-cols-3 gap-3 text-[12px]">
            <div><p className="font-bold text-zinc-500 uppercase text-[9.5px] tracking-wider">PNR / Booking Ref</p><p className="mt-1 font-display text-[18px] font-bold text-zinc-900 tracking-wider">FWT7K2M</p></div>
            <div><p className="font-bold text-zinc-500 uppercase text-[9.5px] tracking-wider">Ticket Number</p><p className="mt-1 font-semibold text-zinc-700">176-4291038764</p></div>
            <div><p className="font-bold text-zinc-500 uppercase text-[9.5px] tracking-wider">Status</p><p className="mt-1"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">CONFIRMED</span></p></div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-[12px]">
            <thead className="bg-zinc-50">
              <tr>{["Passenger", "Passport", "DOB", "Seat"].map(h => <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr className="border-t border-zinc-100">
                <td className="px-3 py-2.5 font-semibold">MEHTA/AARAV MR</td>
                <td className="px-3 py-2.5 text-zinc-600">P9823401K</td>
                <td className="px-3 py-2.5 text-zinc-600">15 Mar 1988</td>
                <td className="px-3 py-2.5 font-semibold text-[#222468]">32A</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-[12px] font-bold text-emerald-800">📎 E-Ticket PDF attached to this email</p>
          <p className="mt-1 text-[10.5px] text-emerald-600">Please print or save to your device — required at check-in</p>
        </div>
      </div>
      <div className="rounded-b-2xl bg-zinc-50 px-6 py-4 text-center text-[10px] text-zinc-400">
        © {new Date().getFullYear()} {senderName} · Operated by Fortune World Tour Pty Ltd · ABN 12 345 678 901
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Team Management — with role picker on add + role toggle on row      */
/* ------------------------------------------------------------------ */
const ACTIVE_STAGES = ["contacted", "negotiation", "offer_sent"];

function RoleBadgeDropdown({ member, isSelf }: { member: Profile; isSelf: boolean }) {
  const { promoteStaff, isSuperAdminUser } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const isProtected = isSelf || (member.email === SUPER_ADMIN_EMAIL && !isSuperAdminUser);
  const isCurrentAdmin = member.role === "admin";

  if (isProtected) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide",
        isCurrentAdmin
          ? "border-[#222468]/30 bg-[#222468]/10 text-[#222468]"
          : "border-zinc-200 bg-zinc-100 text-zinc-500"
      )}>
        {isCurrentAdmin ? "Admin" : "Staff"}
        {member.email === SUPER_ADMIN_EMAIL && " ⭐"}
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide transition hover:brightness-105",
          isCurrentAdmin
            ? "border-[#222468]/40 bg-[#222468]/10 text-[#222468]"
            : "border-zinc-200 bg-zinc-100 text-zinc-600"
        )}
      >
        {isCurrentAdmin ? "Admin" : "Staff"}
        <svg className="h-2.5 w-2.5 opacity-60" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="anim-modal absolute right-0 top-[32px] z-50 w-[190px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="border-b border-zinc-100 px-3 py-2">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-400">Change role for {member.full_name.split(" ")[0]}</p>
          </div>
          {(["staff", "admin"] as const).map(r => (
            <button
              key={r}
              onClick={() => { promoteStaff(member.id, r); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-zinc-50",
                member.role === r && "bg-[#222468]/5"
              )}
            >
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold",
                r === "admin" ? "bg-[#222468] text-white" : "bg-zinc-200 text-zinc-600"
              )}>
                {r === "admin" ? "A" : "S"}
              </span>
              <span>
                <span className="block text-[12px] font-bold text-zinc-900 capitalize">
                  {r === "admin" ? "Administrator" : "Staff Consultant"}
                </span>
                <span className="block text-[9.5px] text-zinc-400">
                  {r === "admin" ? "Full access + settings" : "Own leads only"}
                </span>
              </span>
              {member.role === r && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-[#222468]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamCard() {
  const { staff, addStaff, toggleStaffSuspended, removeStaff, leads, role, currentUser } = useApp();
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newRole, setNewRole] = useState<"staff" | "admin">("staff");
  const [pendingRemove, setPendingRemove] = useState<Profile | null>(null);
  const [reassign, setReassign] = useState(true);
  const isAdmin = role === "admin";
  const pendingActive = pendingRemove ? leads.filter(l => l.assigned_to === pendingRemove.id && ACTIVE_STAGES.includes(l.stage)) : [];

  return (
    <>
      <div className="space-y-2">
        {staff.map(s => {
          const activeCount = leads.filter(l => l.assigned_to === s.id && ACTIVE_STAGES.includes(l.stage)).length;
          const isSelf = s.id === currentUser.id;
          return (
            <div key={s.id} className={cn("flex items-center gap-3 rounded-2xl border p-2.5 transition", s.suspended ? "border-amber-200/70 bg-amber-50/40" : "border-zinc-100")}>
              <Avatar person={s} size="sm" showStatus />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[12.5px] font-bold text-zinc-900">
                  {s.full_name}
                  {s.email === SUPER_ADMIN_EMAIL && <span className="rounded-full bg-orange-100 px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-orange-700">⭐ Super Admin</span>}
                  {s.suspended && <span className="rounded-full bg-amber-100 px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-amber-700">Suspended</span>}
                </p>
                <p className="truncate text-[10.5px] text-zinc-400">{s.title} · {activeCount} active lead{activeCount === 1 ? "" : "s"}</p>
              </div>
              {isAdmin ? (
                <div className="flex shrink-0 items-center gap-2">
                  {/* Role badge dropdown */}
                  <RoleBadgeDropdown member={s} isSelf={isSelf} />
                  {/* Suspend toggle */}
                  <button onClick={() => toggleStaffSuspended(s.id)} disabled={isSelf || s.email === SUPER_ADMIN_EMAIL}
                    className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide transition",
                      s.suspended ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                      (isSelf || s.email === SUPER_ADMIN_EMAIL) && "cursor-not-allowed opacity-40")}>
                    {s.suspended ? <><Ban className="h-2.5 w-2.5" /> Suspended</> : <><CheckCircle2 className="h-2.5 w-2.5" /> Active</>}
                  </button>
                  {/* Remove */}
                  <button onClick={() => { setReassign(true); setPendingRemove(s); }}
                    disabled={isSelf || s.email === SUPER_ADMIN_EMAIL}
                    className={cn("flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-500",
                      (isSelf || s.email === SUPER_ADMIN_EMAIL) && "cursor-not-allowed opacity-30 hover:border-zinc-200 hover:bg-transparent hover:text-zinc-400")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-300" />}
            </div>
          );
        })}
      </div>

      {isAdmin ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-dashed border-zinc-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Add new team member</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" className={INP} />
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Job title (e.g. Ticketing)" className={INP} />
          </div>
          {/* Role selection */}
          <div>
            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Role</p>
            <div className="grid grid-cols-2 gap-2">
              {(["staff", "admin"] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewRole(r)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-3 text-left transition",
                    newRole === r ? "border-[#222468] bg-[#222468]/5" : "border-zinc-200 hover:border-zinc-300"
                  )}
                >
                  <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold", r === "admin" ? "bg-[#222468] text-white" : "bg-zinc-200 text-zinc-600")}>
                    {r === "admin" ? "A" : "S"}
                  </span>
                  <span>
                    <span className="block text-[12px] font-bold text-zinc-900">
                      {r === "admin" ? "Administrator" : "Staff Consultant"}
                    </span>
                    <span className="block text-[9.5px] leading-tight text-zinc-400">
                      {r === "admin" ? "Full access + API settings" : "Assigned leads only"}
                    </span>
                  </span>
                  {newRole === r && <Check className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-[#222468]" />}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              if (newName.trim()) {
                addStaff(newName.trim(), newTitle.trim(), newRole);
                setNewName(""); setNewTitle(""); setNewRole("staff");
              }
            }}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#222468] text-[12px] font-bold text-white transition hover:bg-[#EA7218]"
          >
            <Plus className="h-3.5 w-3.5" /> Add {newRole === "admin" ? "Administrator" : "Staff Consultant"}
          </button>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-zinc-50 px-3 py-2.5 text-[10.5px] font-semibold text-zinc-500">
          <Lock className="h-3 w-3" /> Only administrators can add or remove team members.
        </p>
      )}

      {pendingRemove && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div className="anim-fade-in absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={() => setPendingRemove(null)} />
          <div className="anim-modal relative w-[440px] overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <Avatar person={pendingRemove} size="lg" />
                <div>
                  <h3 className="font-display text-[16px] font-bold tracking-tight text-zinc-950">Remove {pendingRemove.full_name}?</h3>
                  <p className="text-[11px] font-medium text-zinc-400">{pendingRemove.title} · {pendingRemove.email}</p>
                </div>
              </div>
              <button onClick={() => setPendingRemove(null)} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 transition hover:bg-zinc-100"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="space-y-3 p-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[12px] font-bold text-amber-800">Reassign active leads before deleting?</p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                  {pendingRemove.full_name.split(" ")[0]} owns <strong>{pendingActive.length}</strong> active lead{pendingActive.length === 1 ? "" : "s"}
                  {pendingActive.length > 0 && ` (${pendingActive.map(l => l.client_name.split(" ")[0]).slice(0, 3).join(", ")}${pendingActive.length > 3 ? "…" : ""})`}
                  . Their row will be deleted from Supabase <code className="rounded bg-amber-100 px-1">profiles</code>.
                </p>
              </div>
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition", reassign ? "border-[#222468] bg-[#222468]/5" : "border-zinc-200 hover:border-zinc-300")}>
                <input type="checkbox" checked={reassign} onChange={e => setReassign(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-[#222468]" />
                <span>
                  <span className="block text-[12px] font-bold text-zinc-900">Reassign {pendingActive.length} active lead{pendingActive.length === 1 ? "" : "s"} to the team</span>
                  <span className="block text-[10.5px] leading-snug text-zinc-500">Balanced handover to lowest-load consultants.</span>
                </span>
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setPendingRemove(null)} className="h-11 flex-1 rounded-xl border border-zinc-200 text-[12.5px] font-bold text-zinc-600 transition hover:bg-zinc-50">Cancel</button>
                <button onClick={() => { removeStaff(pendingRemove.id, reassign); setPendingRemove(null); }}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 text-[12.5px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(239,68,68,0.6)] transition hover:bg-red-600 active:scale-[0.98]">
                  <Trash2 className="h-4 w-4" /> Remove member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB META — Access Control (always visible)                          */
/* ------------------------------------------------------------------ */
function TabAI() {
  const { cfg, updateAI } = useIntegrations();
  const a = cfg.ai;
  const isGemini = a.provider === "gemini";
  const isOpenRouter = a.provider === "openrouter";
  const activeKey = isOpenRouter ? (a.openrouterApiKey || a.apiKey) : isGemini ? (a.geminiApiKey || a.apiKey) : a.apiKey;
  const hasKey = activeKey.trim().length > 0;

  const providerHints: Record<string, string> = {
    openrouter: "🌟 100% Free. Uses google/gemini-2.0-flash-lite-preview-02-05:free via OpenRouter.",
    gemini: "✅ Free tier — no credit card required. Get your key at aistudio.google.com in under 60 seconds.",
    groq: "⚡ 100% free & very fast. Uses Groq's OpenAI-compatible endpoint with llama-3.1-8b-instant.",
    openai: "Requires an OpenAI account with billing enabled. GPT-4o usage is charged per token.",
    anthropic: "Requires an Anthropic API key. Claude 3.5 Sonnet is currently scaffolded — coming soon.",
    arena: "Arena.ai experimental integration — contact support for access.",
  };

  return (
    <div className="space-y-5">
      <SectionCard title="AI Provider Configuration">
        <FieldRow label="Select AI Provider" hint="Determines which LLM engine powers the Floating Staff Co-Pilot.">
          <select
            value={a.provider}
            onChange={e => updateAI({ provider: e.target.value as AIProvider })}
            className={SEL}
          >
            <option value="openrouter">OpenRouter (100% Free - Recommended)</option>
            <option value="gemini">Google Gemini 1.5 Flash (Free Tier)</option>
            <option value="groq">Groq (100% Free & Fast)</option>
            <option value="openai">OpenAI (GPT-4o — standard choice)</option>
            <option value="anthropic">Anthropic (Claude 3.5 Sonnet — best for reasoning)</option>
            <option value="arena">Arena.ai Agent (experimental)</option>
          </select>
        </FieldRow>

        {/* Provider-specific hint */}
        <div className={cn(
          "rounded-xl border px-3.5 py-2.5 text-[11px] font-medium",
          isGemini || isOpenRouter
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-zinc-200 bg-zinc-50 text-zinc-600"
        )}>
          {providerHints[a.provider]}
        </div>

        {/* OpenRouter-specific key field */}
        {isOpenRouter ? (
          <FieldRow
            label="OpenRouter API Key"
            hint="Stored in localStorage / Supabase under fwt_openrouter_key. Never sent to any third party."
          >
            <SecretInput
              value={a.openrouterApiKey}
              onChange={v => updateAI({ openrouterApiKey: v })}
              placeholder="sk-or-v1-…"
            />
          </FieldRow>
        ) : isGemini ? (
          <FieldRow
            label="Gemini API Key"
            hint="Stored in localStorage / Supabase under gemini_api_key. Never sent to any third party."
          >
            <SecretInput
              value={a.geminiApiKey}
              onChange={v => updateAI({ geminiApiKey: v })}
              placeholder="Paste your Gemini API key…"
            />
          </FieldRow>
        ) : (
          <FieldRow label={a.provider === "groq" ? "Groq API Key" : "API Key"} hint={a.provider === "groq" ? "Used as GROQ_API_KEY for https://api.groq.com/openai/v1/chat/completions" : "Used for all staff AI interactions. Never shared with clients."}>
            <SecretInput
              value={a.apiKey}
              onChange={v => updateAI({ apiKey: v })}
              placeholder={a.provider === "groq" ? "gsk_…" : "sk-…"}
            />
          </FieldRow>
        )}

        {/* Status badge */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <StatusPill
            ok={hasKey}
            label={
              hasKey
                ? isOpenRouter
                  ? "openrouter armed (free tier)"
                  : isGemini
                    ? "gemini armed (free tier)"
                    : a.provider === "groq"
                      ? "groq armed (free & fast)"
                      : `${a.provider} armed`
                : "API key missing"
            }
          />
          {isGemini && !hasKey && (
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10.5px] font-semibold text-[#222468] underline hover:text-[#EA7218] transition-colors"
            >
              Get free key →
            </a>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Assistant Personalisation">
        <FieldRow label="AI System Prompt" hint="Defines the persona and boundaries of your staff co-pilot.">
          <textarea
            value={a.systemPrompt}
            onChange={e => updateAI({ systemPrompt: e.target.value })}
            rows={6}
            className="w-full resize-none rounded-xl border border-zinc-200 bg-white p-3 font-sans text-[12.5px] leading-relaxed text-zinc-700 outline-none transition-all focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none"
          />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Capabilities & Tools">
        <div className="space-y-2">
          {[
            { label: "search_flights", desc: "AI parses flight intent from natural language and fetches live fares via SerpApi/Amadeus" },
            { label: "summarize_lead", desc: "Reads journey notes and WhatsApp history to generate lead summaries" },
            { label: "format_quote", desc: "Generates copy-paste ready WhatsApp quote messages with agency branding" },
          ].map(t => (
            <div key={t.label} className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 border border-zinc-100">
              <div>
                <p className="font-mono text-[11px] font-bold text-[#222468]">{t.label}</p>
                <p className="text-[10px] text-zinc-500">{t.desc}</p>
              </div>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-3 w-3" />
              </span>
            </div>
          ))}
        </div>
        {isGemini && (
          <p className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[10.5px] font-medium text-blue-700">
            ℹ️ Gemini uses smart prompt-engineering to extract flight search intent — no native function-calling API needed.
          </p>
        )}
      </SectionCard>

      <SaveBar tab="ai" />
    </div>
  );
}

function TabAccess() {
  const { role, setRole, supabaseLive, remoteHydrated } = useApp();
  return (
    <div className="space-y-5">
      <SectionCard title="Role-Based Access Control">
        <div className="grid grid-cols-2 gap-3">
          {(["admin", "staff"] as const).map(r => (
            <button key={r} onClick={() => setRole(r)} className={cn("rounded-2xl border-2 p-4 text-left transition", role === r ? "border-[#222468] bg-[#222468]/5" : "border-zinc-200 hover:border-zinc-300")}>
              <div className="mb-2 flex items-center gap-2">
                {r === "admin" ? <ShieldCheck className={cn("h-4 w-4", role === r ? "text-[#222468]" : "text-zinc-400")} /> : <UserCog className={cn("h-4 w-4", role === r ? "text-[#222468]" : "text-zinc-400")} />}
                <p className="text-[13px] font-bold capitalize text-zinc-900">{r}</p>
                {role === r && <BadgeCheck className="ml-auto h-4 w-4 text-[#222468]" />}
              </div>
              <p className="text-[10.5px] leading-relaxed text-zinc-500">{r === "admin" ? "Full visibility, team add/remove, reassignment, markup & integrations control." : "Own leads only, call logging, quote creation. Integrations locked."}</p>
            </button>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-zinc-50 px-3.5 py-2.5 text-[10.5px] font-medium leading-relaxed text-zinc-500">
          Postgres RLS: staff scope <code className="rounded bg-zinc-200 px-1">leads.assigned_to = auth.uid()</code>; profile deletion restricted to admin policy.
        </p>
      </SectionCard>
      <SectionCard title="Supabase Connection">
        <div className="flex items-center gap-3">
          <StatusPill ok={supabaseLive} label={supabaseLive ? "Connected" : "Not configured"} />
          {supabaseLive && <StatusPill ok={remoteHydrated} label={remoteHydrated ? "Data hydrated" : "Connecting…"} />}
        </div>
        <p className="text-[11px] font-medium text-zinc-500 mt-2">Project: <code className="rounded bg-zinc-100 px-1">{import.meta.env.VITE_SUPABASE_URL?.replace("https://", "").split(".")[0] ?? "—"}</code></p>
      </SectionCard>
      <SectionCard title="Team Management">
        <TeamCard />
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  My Profile tab (visible to all roles)                               */
/* ------------------------------------------------------------------ */
function TabMyProfile() {
  const { currentUser, leads, quotes, pushToast, updateCurrentUserProfile } = useApp();
  const [fullName, setFullName] = useState(currentUser.full_name);
  const [jobTitle, setJobTitle] = useState(currentUser.title);
  const [saving, setSaving] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myLeads = leads.filter(l => l.assigned_to === currentUser.id);
  const activeLeads = myLeads.filter(l => l.stage === "contacted" || l.stage === "negotiation").length;
  const quotesSent = myLeads.filter(l => l.stage === "offer_sent").length;
  const dealsWon = myLeads.filter(l => l.stage === "closed_won").length;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { patchRow } = await import("@/lib/supabase");
      await patchRow("profiles", currentUser.id, { full_name: fullName.trim(), title: jobTitle.trim() });
      updateCurrentUserProfile({ full_name: fullName.trim(), title: jobTitle.trim() });
      pushToast({ kind: "success", title: "Profile updated", body: `${fullName.trim()} · ${jobTitle.trim()}` });
    } catch {
      pushToast({ kind: "error", title: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      pushToast({ kind: "error", title: "Invalid file", body: "Please select an image file (JPG, PNG, WebP)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      pushToast({ kind: "error", title: "File too large", body: "Maximum 5 MB allowed." });
      return;
    }

    setUploading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      if (!supabase) throw new Error("Supabase not configured");

      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${currentUser.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const { patchRow } = await import("@/lib/supabase");
      await patchRow("profiles", currentUser.id, { avatar_url: publicUrl });

      updateCurrentUserProfile({ avatar_url: publicUrl });

      pushToast({ kind: "success", title: "Avatar updated", body: "Your new profile photo is live across the CRM." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      pushToast({ kind: "error", title: "Avatar upload failed", body: msg });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar + Identity */}
      <div className="flex items-center gap-6 rounded-3xl border border-zinc-200 bg-white p-6">
        <div
          className="relative cursor-pointer"
          onMouseEnter={() => setAvatarHover(true)}
          onMouseLeave={() => setAvatarHover(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <Avatar person={currentUser} size="lg" />
          {(avatarHover || uploading) && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              {uploading
                ? <Loader2 className="h-4 w-4 animate-spin text-white" />
                : <Camera className="h-4 w-4 text-white" />
              }
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => void handleAvatarUpload(e)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[18px] font-bold tracking-tight text-zinc-950">{currentUser.full_name}</p>
          <p className="text-[12px] font-medium text-zinc-500">{currentUser.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
              currentUser.role === "admin" ? "bg-[#222468]/10 text-[#222468]" : "bg-zinc-100 text-zinc-600")}>
              {currentUser.role}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Online</span>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <SectionCard title="Edit Profile">
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Full Name">
            <input value={fullName} onChange={e => setFullName(e.target.value)} className={INP} placeholder="Your full name" />
          </FieldRow>
          <FieldRow label="Job Title">
            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className={INP} placeholder="e.g. Senior Ticketing Consultant" />
          </FieldRow>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => void handleSaveProfile()}
            disabled={saving}
            className={cn("flex items-center gap-2 rounded-xl px-6 py-2.5 text-[12.5px] font-bold text-white shadow-lg transition-all active:scale-[0.97]",
              saving ? "cursor-wait bg-zinc-400" : "bg-[#EA7218] hover:bg-[#d4670f] shadow-[#EA7218]/30")}
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save Profile</>}
          </button>
        </div>
      </SectionCard>

      {/* Performance metrics */}
      <SectionCard title="My Performance Dashboard">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#222468] to-[#1a1c54] p-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">My Active Leads</p>
            <p className="mt-2 font-display text-[36px] font-bold leading-none">{activeLeads}</p>
            <p className="mt-1 text-[10px] font-medium text-blue-300">Contacted & Negotiation</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-[#EA7218] to-[#d4670f] p-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-200">Quotes Sent</p>
            <p className="mt-2 font-display text-[36px] font-bold leading-none">{quotesSent}</p>
            <p className="mt-1 text-[10px] font-medium text-orange-200">Offer Sent stage</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Deals Won</p>
            <p className="mt-2 font-display text-[36px] font-bold leading-none">{dealsWon}</p>
            <p className="mt-1 text-[10px] font-medium text-emerald-200">Closed Won / Ticketed</p>
          </div>
        </div>
      </SectionCard>

      {/* Quotes authored */}
      <SectionCard title="My Recent Quotes">
        {quotes.filter(q => q.created_by === currentUser.id).length === 0 ? (
          <p className="rounded-xl bg-zinc-50 p-4 text-center text-[11.5px] font-medium text-zinc-400">No quotes created yet — search fares in the Flight Engine to get started.</p>
        ) : (
          <div className="space-y-2">
            {quotes.filter(q => q.created_by === currentUser.id).slice(0, 5).map(q => (
              <div key={q.id} className="flex items-center justify-between rounded-xl bg-zinc-50 p-3">
                <div>
                  <p className="text-[12px] font-bold text-zinc-900">{q.route} · {q.flight_details.airline}</p>
                  <p className="text-[10px] text-zinc-400">Selling: {q.selling_price.toLocaleString()} {q.flight_details.currency}</p>
                </div>
                <span className="rounded-full bg-[#222468]/10 px-2 py-0.5 text-[9px] font-bold uppercase text-[#222468]">{q.provider}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main settings page                                                  */
/* ------------------------------------------------------------------ */
type TabKey = "flight" | "meta" | "whatsapp" | "telephony" | "email" | "ai" | "access" | "profile";

const TABS: { key: TabKey; label: string; icon: typeof Globe; adminOnly: boolean }[] = [
  { key: "flight",     label: "Flight API & GDS",    icon: Globe,         adminOnly: true  },
  { key: "meta",       label: "Meta Lead Ads",        icon: Megaphone,     adminOnly: true  },
  { key: "whatsapp",   label: "WhatsApp / Twilio",    icon: MessageCircle, adminOnly: true  },
  { key: "telephony",  label: "Calling & Telephony",  icon: PhoneCall,     adminOnly: true  },
  { key: "email",      label: "Email & Notifications",icon: Mail,          adminOnly: true  },
  { key: "ai",         label: "AI & Automation",      icon: Zap,           adminOnly: true  },
  { key: "access",     label: "Access & Team",        icon: ShieldCheck,   adminOnly: true  },
  { key: "profile",    label: "My Profile",           icon: UserCog,       adminOnly: false },
];

export function SettingsView() {
  const { role } = useApp();
  const isAdmin = role === "admin";
  const [activeTab, setActiveTab] = useState<TabKey>(isAdmin ? "flight" : "profile");

  // Staff sees ONLY "My Profile". Admins see everything.
  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="anim-fade-up mt-6">
      {!isAdmin && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <UserCog className="h-4 w-4 shrink-0 text-blue-600" />
          <p className="text-[12px] font-semibold text-blue-800">Staff view — you can manage your profile and view your performance. Integration settings are available to administrators only.</p>
        </div>
      )}

      <div className="flex gap-6">
        {/* Vertical tab rail */}
        <nav className="flex w-[220px] shrink-0 flex-col gap-1">
          {visibleTabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[12.5px] font-semibold transition-all",
                  active ? "bg-[#222468] text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900"
                )}
              >
                <tab.icon className={cn("h-4 w-4 shrink-0", active ? "text-[#EA7218]" : "text-zinc-400")} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Tab panel */}
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center gap-3">
            {(() => {
              const t = TABS.find(t => t.key === activeTab)!;
              return (
                <>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#222468] text-white">
                    <t.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h2 className="font-display text-[18px] font-bold tracking-tight text-zinc-950">{t.label}</h2>
                    {t.adminOnly && <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Admin-only configuration</p>}
                    {t.key === "profile" && <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Personal settings & performance</p>}
                  </div>
                  {t.adminOnly && <span className="ml-auto rounded-full bg-[#222468]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#222468]">Admin</span>}
                  {isAdmin && <SaveAllButton />}
                </>
              );
            })()}
          </div>

          <div className="nice-scroll max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            {activeTab === "flight"    && <TabFlight />}
            {activeTab === "meta"      && <TabMeta />}
            {activeTab === "whatsapp"  && <TabWhatsApp />}
            {activeTab === "telephony" && <TabTelephony />}
            {activeTab === "email"     && <TabEmail />}
            {activeTab === "ai"        && <TabAI />}
            {activeTab === "access"    && <TabAccess />}
            {activeTab === "profile"   && <TabMyProfile />}
          </div>
        </div>
      </div>
    </div>
  );
}
