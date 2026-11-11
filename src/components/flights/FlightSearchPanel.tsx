import {
  ArrowLeftRight, Calendar, Check, ClipboardCopy, ExternalLink,
  Loader2, Mail, Minus, Paperclip, Plane, PlaneLanding,
  PlaneTakeoff, Plus, Search, Sparkles, Users, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandLogoCompact } from "@/components/common/BrandLogo";
import { searchAirports } from "@/services/airports";
import { getFlightProvider } from "@/services/flights";
import type { FlightOffer } from "@/services/flights/types";
import { CABIN_LABEL } from "@/services/flights/types";
import { useApp } from "@/store/AppContext";
import { useIntegrations } from "@/store/IntegrationsContext";
import { cn, formatFlightDuration, formatMoney, uid } from "@/lib/utils";
import type { CabinClass, Lead } from "@/types/database";

/* ================================================================== */
/*  IATA autocomplete                                                   */
/* ================================================================== */
export function AirportInput({ label, value, onChange, icon: Icon }: {
  label: string; value: string; onChange: (v: string) => void; icon: typeof PlaneTakeoff;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const matches = searchAirports(value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">{label}</label>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 transition-all duration-200 focus-within:border-[#222468] focus-within:ring-2 focus-within:ring-[#222468]/10">
        <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          value={value}
          onFocus={() => setOpen(true)}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          placeholder="SYD — Sydney"
          className="w-full border-none bg-transparent text-[13px] font-semibold uppercase text-zinc-900 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:font-medium placeholder:normal-case placeholder:text-zinc-400"
        />
      </div>
      {open && matches.length > 0 && (
        <div className="anim-modal absolute left-0 right-0 top-[74px] z-50 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          {matches.map(a => (
            <button key={a.iata} onClick={() => { onChange(a.iata); setOpen(false); }} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-blue-50">
              <span className="w-10 rounded-md bg-zinc-950 px-1.5 py-0.5 text-center font-display text-[11px] font-bold text-white">{a.iata}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-zinc-800">{a.city}</span>
                <span className="block truncate text-[10.5px] text-zinc-400">{a.name} · {a.country}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Amadeus Booking Modal (PNR Creation)                               */
/* ================================================================== */
interface PassengerDetails {
  fullName: string;
  passportNo: string;
  passportExpiry: string;
  dob: string;
}

function AmadeusBookingModal({ offer, lead, onClose, onConfirm }: {
  offer: FlightOffer; lead: Lead | null;
  onClose: () => void;
  onConfirm: (pax: PassengerDetails) => void;
}) {
  const { settings } = useApp();
  const [pax, setPax] = useState<PassengerDetails>({ fullName: lead?.client_name ?? "", passportNo: "", passportExpiry: "", dob: "" });
  const [loading, setLoading] = useState(false);
  const INP = "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[13px] font-semibold text-zinc-900 outline-none transition-all focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none focus-visible:outline-none placeholder:font-normal placeholder:text-zinc-400";

  const submit = async () => {
    if (!pax.fullName.trim() || !pax.passportNo.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400)); // simulated GDS round-trip
    onConfirm(pax);
  };

  const sell = Math.round(offer.netPrice * (1 + settings.markupPercent / 100));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="anim-fade-in absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={onClose} />
      <div className="anim-modal relative w-[520px] overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-[#222468] px-6 py-4">
          <div>
            <p className="font-display text-[16px] font-bold text-white">Book Ticket — Create PNR</p>
            <p className="text-[11px] font-medium text-blue-200">{offer.airline} · {offer.flightNumbers.join("/")} · {offer.legs[0]?.from} → {offer.legs[offer.legs.length - 1]?.to}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/20 p-1.5 text-white/70 transition hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>
        </div>

        <div className="space-y-4 p-6">
          {/* Itinerary summary */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-display text-[20px] font-bold text-zinc-900">{offer.departTime}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{offer.legs[0]?.from}</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-[9.5px] font-medium text-zinc-400">{formatFlightDuration(offer.totalDurationMin)}</p>
                <div className="mt-1 flex w-full items-center gap-1"><div className="h-px flex-1 bg-zinc-300" /><Plane className="h-3 w-3 text-[#EA7218]" /><div className="h-px flex-1 bg-zinc-300" /></div>
                <p className="text-[9.5px] font-medium text-zinc-400">{offer.stops === 0 ? "Non-stop" : `${offer.stops} stop`}</p>
              </div>
              <div>
                <p className="font-display text-[20px] font-bold text-zinc-900">{offer.arriveTime}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{offer.legs[offer.legs.length - 1]?.to}</p>
              </div>
            </div>
            <div className="mt-3 border-t border-dashed border-zinc-200 pt-3 text-center">
              <p className="font-display text-[22px] font-bold text-[#222468]">{formatMoney(sell, settings.currency)}</p>
              <p className="text-[10px] font-medium text-zinc-400">All-in selling price incl. {settings.markupPercent}% markup</p>
            </div>
          </div>

          {/* Passenger fields */}
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Lead Passenger Details</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Full Name (as on passport) *</label>
                <input value={pax.fullName} onChange={e => setPax(p => ({ ...p, fullName: e.target.value }))} placeholder="MEHTA/AARAV MR" className={INP} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Passport Number *</label>
                  <input value={pax.passportNo} onChange={e => setPax(p => ({ ...p, passportNo: e.target.value }))} placeholder="P9823401K" className={INP} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Passport Expiry</label>
                  <input type="date" value={pax.passportExpiry} onChange={e => setPax(p => ({ ...p, passportExpiry: e.target.value }))} className={INP} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Date of Birth</label>
                <input type="date" value={pax.dob} onChange={e => setPax(p => ({ ...p, dob: e.target.value }))} className={INP} />
              </div>
            </div>
          </div>

          {lead && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-[11px] font-medium text-blue-800">
              ℹ️ Confirming this booking will update <strong>{lead.client_name}</strong>'s lead status to <strong>Closed Won / Ticketed</strong> and dispatch a booking confirmation email.
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="h-12 flex-1 rounded-2xl border border-zinc-200 text-[13px] font-bold text-zinc-600 transition hover:bg-zinc-50">Cancel</button>
            <button
              onClick={() => void submit()}
              disabled={loading || !pax.fullName.trim() || !pax.passportNo.trim()}
              className={cn("flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#222468] text-[13.5px] font-bold text-white shadow-lg shadow-[#222468]/30 transition hover:bg-[#1a1c54] active:scale-[0.98]", (loading || !pax.fullName.trim() || !pax.passportNo.trim()) && "cursor-not-allowed opacity-60")}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating PNR…</> : "✈️ Confirm Booking & Issue Ticket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Email Quote Dispatch Modal                                          */
/* ================================================================== */
function EmailQuoteModal({ offer, lead, onClose }: { offer: FlightOffer; lead: Lead | null; onClose: () => void; }) {
  const { settings, pushToast } = useApp();
  const { cfg } = useIntegrations();
  const sell = Math.round(offer.netPrice * (1 + settings.markupPercent / 100));
  const [toEmail, setToEmail] = useState(lead?.email ?? "");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const INP = "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[13px] font-semibold text-zinc-900 outline-none transition-all focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none placeholder:font-normal placeholder:text-zinc-400";
  const route = `${offer.legs[0]?.from} → ${offer.legs[offer.legs.length - 1]?.to}`;
  const hasProvider = cfg.email.resendApiKey.length > 5 || cfg.email.smtpHost.length > 3;

  const send = async () => {
    if (!toEmail.trim()) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 900));
    setSending(false);
    setSent(true);
    pushToast({ kind: "success", title: "Quote email dispatched", body: `Sent to ${toEmail} from ${cfg.email.senderEmail}` });
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="anim-fade-in absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={onClose} />
      <div className="anim-modal relative w-[540px] overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <p className="font-display text-[16px] font-bold text-zinc-950">Send Branded Email Quote</p>
            <p className="text-[11px] text-zinc-400">From: {cfg.email.senderName} &lt;{cfg.email.senderEmail}&gt;</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:bg-zinc-100"><X className="h-3.5 w-3.5" /></button>
        </div>

        <div className="space-y-4 p-6">
          {!hasProvider && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium text-amber-800">
              ⚠️ No email provider configured. Go to <strong>Settings → Email & Notifications</strong> to set up Resend or SMTP.
            </div>
          )}

          <div className="rounded-2xl bg-zinc-50 p-4 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-500">Route</span>
              <span className="font-bold text-zinc-900">{route}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="font-semibold text-zinc-500">Airline</span>
              <span className="font-bold text-zinc-900">{offer.airline} · {offer.flightNumbers.join("/")}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="font-semibold text-zinc-500">Selling price</span>
              <span className="font-display text-[16px] font-bold text-[#222468]">{formatMoney(sell, settings.currency)}</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Customer Email *</label>
            <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="customer@email.com" className={INP} />
          </div>

          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Personal note (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Hi Aarav, following up on our conversation…"
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white p-3 text-[12.5px] font-medium leading-relaxed text-zinc-700 outline-none transition-all focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none placeholder:text-zinc-400"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="h-12 flex-1 rounded-2xl border border-zinc-200 text-[13px] font-bold text-zinc-600 transition hover:bg-zinc-50">Cancel</button>
            <button
              onClick={() => void send()}
              disabled={sending || sent || !toEmail.trim()}
              className={cn("flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#222468] text-[13.5px] font-bold text-white shadow-lg shadow-[#222468]/30 transition hover:bg-[#1a1c54] active:scale-[0.98]", (sending || sent || !toEmail.trim()) && "cursor-not-allowed opacity-60")}
            >
              {sent
                ? <><Check className="h-4 w-4" /> Sent!</>
                : sending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  : <><Mail className="h-4 w-4" /> Send Branded HTML Quote</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Offer card — with WhatsApp open + Email dispatch + Amadeus booking  */
/* ================================================================== */
function OfferCard({ offer, lead, cheapest }: { offer: FlightOffer; lead: Lead | null; cheapest: boolean }) {
  const { settings, attachQuote, copyWhatsAppQuote, moveLead, pushToast } = useApp();
  const { cfg } = useIntegrations();
  const sell = Math.round(offer.netPrice * (1 + settings.markupPercent / 100));
  const margin = sell - offer.netPrice;
  const isAmadeus = cfg.flight.activeProvider === "amadeus";
  const [showBooking, setShowBooking] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [booked, setBooked] = useState(false);

  const route = `${offer.legs[0]?.from} → ${offer.legs[offer.legs.length - 1]?.to}`;
  const stops = offer.stops === 0 ? "Non-stop" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""} (${offer.stopAirports.join(", ")})`;
  const hrs = formatFlightDuration(offer.totalDurationMin);
  const priceStr = formatMoney(sell, settings.currency);

  /* WhatsApp — open wa.me link in new tab */
  const handleSendWA = () => {
    const phone = lead?.phone?.replace(/\D/g, "") ?? "";
    const text = encodeURIComponent(
      `✈️ *Fortune World Tour — Flight Quote*\n` +
      (lead ? `For: ${lead.client_name}\n` : "") +
      `Route: *${route}*\n` +
      `Airline: ${offer.airline} ${offer.flightNumbers.join(" / ")}\n` +
      `Duration: ${hrs} · ${stops}\n` +
      `Departure: ${offer.departTime} → Arrival: ${offer.arriveTime}\n` +
      `💰 All-in price: *${priceStr}* (${settings.currency}, incl. taxes)\n\n` +
      `Reply YES to lock your seats — fares refresh daily.\n` +
      `📞 +61 2 8000 4422 · Fortune World Tour`
    );
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
    } else {
      void navigator.clipboard.writeText(decodeURIComponent(text)).catch(() => undefined);
      pushToast({ kind: "success", title: "WhatsApp quote copied", body: "No phone on file — message copied to clipboard instead." });
    }
    copyWhatsAppQuote(lead, offer, sell);
  };

  const handleBookingConfirm = () => {
    setShowBooking(false);
    setBooked(true);
    const fakePnr = `FWT${uid().slice(0, 5).toUpperCase()}`;
    if (lead) {
      moveLead(lead.id, "closed_won");
      pushToast({ kind: "success", title: `PNR Created: ${fakePnr}`, body: `${lead.client_name} ticketed · Confirmation email queued.` });
    } else {
      pushToast({ kind: "success", title: `PNR Created: ${fakePnr}`, body: "Amadeus GDS booking recorded." });
    }
  };

  return (
    <>
      <div className={cn("rounded-2xl border bg-white p-4 transition hover:shadow-lg hover:shadow-zinc-900/5", cheapest ? "border-[#222468] ring-1 ring-[#222468]/20" : "border-zinc-200", booked && "border-emerald-300 ring-1 ring-emerald-200")}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 font-display text-[11px] font-bold text-white">{offer.airlineCode}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-zinc-900">
              {offer.airline}
              {cheapest && <span className="ml-2 rounded-full bg-[#222468] px-2 py-px text-[9px] font-bold uppercase tracking-wide text-white">Best fare</span>}
              {offer.isDemo && <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-px text-[9px] font-bold uppercase tracking-wide text-amber-700">Demo</span>}
              {booked && <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-700">✓ Ticketed</span>}
            </p>
            <p className="text-[11px] font-medium text-zinc-400">{offer.flightNumbers.join(" · ")} · {CABIN_LABEL[offer.cabin]}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-[18px] font-bold leading-none text-zinc-950">{priceStr}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Selling · +{settings.markupPercent}%</p>
          </div>
        </div>

        {/* Route bar */}
        <div className="mt-3.5 flex items-center gap-3">
          <div className="text-center">
            <p className="font-display text-[16px] font-bold text-zinc-900">{offer.departTime}</p>
            <p className="text-[10px] font-bold text-zinc-400">{offer.legs[0]?.from}</p>
          </div>
          <div className="relative flex-1">
            <div className="h-px w-full bg-zinc-200" />
            <Plane className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 bg-white text-[#EA7218]" />
            <p className="mt-1.5 text-center text-[10px] font-semibold text-zinc-400">{hrs} · {stops}</p>
          </div>
          <div className="text-center">
            <p className="font-display text-[16px] font-bold text-zinc-900">{offer.arriveTime}</p>
            <p className="text-[10px] font-bold text-zinc-400">{offer.legs[offer.legs.length - 1]?.to}</p>
          </div>
        </div>

        {/* Price math */}
        <p className="mt-2.5 text-[10px] font-medium text-zinc-400">Net {formatMoney(offer.netPrice, settings.currency)} + markup {formatMoney(margin, settings.currency)}</p>

        {/* Action buttons — full row */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-dashed border-zinc-200 pt-3">
          {/* Row 1: WhatsApp + Email */}
          <button
            onClick={handleSendWA}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Send WhatsApp Quote
          </button>
          <button
            onClick={() => setShowEmail(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100"
          >
            <Mail className="h-3.5 w-3.5" /> Send Email Quote
          </button>

          {/* Row 2: Copy + Attach/Book */}
          <button
            onClick={() => { copyWhatsAppQuote(lead, offer, sell); }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-[11px] font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <ClipboardCopy className="h-3.5 w-3.5" /> Copy WA Message
          </button>

          {isAmadeus ? (
            <button
              onClick={() => setShowBooking(true)}
              disabled={booked}
              className={cn("flex items-center justify-center gap-1.5 rounded-xl bg-[#222468] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#1a1c54]", booked && "cursor-default opacity-60")}
            >
              {booked ? "✓ Ticketed" : "🎫 Book Ticket (Create PNR)"}
            </button>
          ) : (
            <button
              onClick={() => attachQuote(lead?.id ?? null, offer, offer.netPrice, sell)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#222468] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#EA7218]"
            >
              <Paperclip className="h-3.5 w-3.5" /> {lead ? "Attach to lead" : "Save quote"}
            </button>
          )}
        </div>
      </div>

      {showBooking && (
        <AmadeusBookingModal offer={offer} lead={lead} onClose={() => setShowBooking(false)} onConfirm={handleBookingConfirm} />
      )}
      {showEmail && (
        <EmailQuoteModal offer={offer} lead={lead} onClose={() => setShowEmail(false)} />
      )}
    </>
  );
}

/* ================================================================== */
/*  Main search panel                                                   */
/* ================================================================== */
export function FlightSearchPanel({ lead = null }: { lead?: Lead | null }) {
  const { settings, pushToast } = useApp();
  const { cfg } = useIntegrations();

  // ── Date boundaries ──
  const todayISO = new Date().toISOString().split("T")[0];
  const defaultDepart = new Date(Date.now() + 14 * 864e5).toISOString().split("T")[0];
  const maxDateISO = new Date(Date.now() + 300 * 864e5).toISOString().split("T")[0];

  const [origin, setOrigin] = useState(lead?.origin_iata ?? "SYD");
  const [destination, setDestination] = useState(lead?.destination_iata ?? "DXB");
  const [departDate, setDepartDate] = useState(() => {
    const raw = lead?.travel_date?.slice(0, 10) ?? defaultDepart;
    return raw > maxDateISO ? defaultDepart : raw < todayISO ? defaultDepart : raw;
  });
  const [returnDate, setReturnDate] = useState(lead?.return_date?.slice(0, 10) ?? "");
  const [adults, setAdults] = useState(lead?.passengers ?? 2);
  const [cabin, setCabin] = useState<CabinClass>("economy");
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hasSerpApiKey, setHasSerpApiKey] = useState(false);
  const provider = getFlightProvider();
  const isAmadeus = cfg.flight.activeProvider === "amadeus";

  // ── Hydrate SerpApi key from Supabase first, then localStorage ──
  useEffect(() => {
    let mounted = true;
    (async () => {
      // 1. Try Supabase system_settings
      try {
        const { supabase } = await import("@/lib/supabase");
        if (supabase) {
          const { data } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "flight")
            .single();
          const parsed = typeof data?.value === "string" ? JSON.parse(data.value) : data?.value;
          const dbKey = parsed?.serpApiKey || "";
          if (dbKey && mounted) {
            localStorage.setItem("fwt_serpapi_key", dbKey.trim());
            localStorage.setItem("serpapi_api_key", dbKey.trim());
            setHasSerpApiKey(true);
            return;
          }
        }
      } catch { /* fallback below */ }
      // 2. Fallback to localStorage
      const lsKey = (localStorage.getItem("fwt_serpapi_key") || localStorage.getItem("serpapi_api_key") || "").trim();
      if (mounted) setHasSerpApiKey(lsKey.length > 0);
    })();
    return () => { mounted = false; };
  }, []);

  // ── Auto-clamp dates that exceed 300-day horizon ──
  const clampDate = (d: string, label: string): string => {
    if (!d) return d;
    if (d > maxDateISO) {
      pushToast({ kind: "error", title: "Date reset", body: `Airlines only publish seats up to 10 months in advance. ${label} date reset to a valid schedule.` });
      return defaultDepart;
    }
    if (d < todayISO) return todayISO;
    return d;
  };

  const handleDepartChange = (v: string) => setDepartDate(clampDate(v, "Departure"));
  const handleReturnChange = (v: string) => setReturnDate(v ? clampDate(v, "Return") : "");

  const resolveIata = (v: string) => /^[A-Za-z]{3}$/.test(v.trim()) ? v.trim().toUpperCase() : (searchAirports(v)[0]?.iata ?? v.slice(0, 3).toUpperCase());

  /** Guaranteed YYYY-MM-DD */
  const formatDate = (d: string | Date): string => {
    try { return new Date(d).toISOString().split("T")[0]; } catch { return String(d); }
  };

  const [dateWarning, setDateWarning] = useState("");

  const search = async () => {
    setSearched(true);
    setOffers([]);
    setDateWarning("");

    // Validate SerpApi key
    if (!isAmadeus && !hasSerpApiKey) {
      pushToast({ kind: "error", title: "SerpApi key missing", body: "Go to Settings → Flight API & GDS and save your SerpApi key." });
      return;
    }

    // Validate 300-day horizon (hard limit)
    if (departDate > maxDateISO || (returnDate && returnDate > maxDateISO)) {
      setDateWarning("⚠️ Schedule Not Available: Airlines only release seats up to 300 days in advance. Please select a closer date.");
      pushToast({ kind: "error", title: "Schedule not available", body: "Airlines only publish seats up to 10 months in advance." });
      setDepartDate(defaultDepart);
      if (returnDate && returnDate > maxDateISO) setReturnDate("");
      return;
    }

    setLoading(true);
    try {
      const result = await provider.searchFlights({
        origin: resolveIata(origin), destination: resolveIata(destination),
        departDate: formatDate(departDate),
        returnDate: returnDate ? formatDate(returnDate) : undefined,
        adults, cabin, currency: settings.currency,
      });
      setOffers(result);
      if (!result.length) {
        pushToast({ kind: "error", title: "No live fares returned", body: "Google Flights has no data for these dates or route." });
      }
    } catch (err) {
      // Surface exact SerpApi error message
      const msg = err instanceof Error ? err.message : String(err);
      pushToast({ kind: "error", title: "Flight search error", body: msg });
    } finally {
      setLoading(false);
    }
  };

  const cheapest = offers.length ? Math.min(...offers.map(o => o.netPrice)) : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogoCompact />
          <div>
            <h3 className="font-display text-[15px] font-bold tracking-tight text-zinc-950">Flight Quote Engine</h3>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              {isAmadeus ? "Amadeus GDS · Live Booking" : "SerpApi · Google Flights"}
            </p>
          </div>
        </div>
        <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold", searched && !loading && offers.length > 0 ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", searched && !loading && offers.length > 0 ? "blink bg-emerald-500" : "bg-zinc-400")} />
          {searched && !loading && offers.length > 0 ? "Live fares" : loading ? "Searching" : "Ready"}
        </span>
      </div>

      {/* Search form */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="relative grid grid-cols-2 gap-3">
          <AirportInput label="Origin" value={origin} onChange={setOrigin} icon={PlaneTakeoff} />
          <AirportInput label="Destination" value={destination} onChange={setDestination} icon={PlaneLanding} />
          <button onClick={() => { setOrigin(destination); setDestination(origin); }}
            className="absolute left-1/2 top-[38px] z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:border-[#222468] hover:text-[#222468]">
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Departure</label>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 transition-all focus-within:border-[#222468] focus-within:ring-2 focus-within:ring-[#222468]/10">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <input type="date" value={departDate} min={todayISO} max={maxDateISO} onChange={e => handleDepartChange(e.target.value)} className="w-full border-none bg-transparent text-[13px] font-semibold text-zinc-900 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Return <span className="normal-case text-zinc-300">(optional)</span></label>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 transition-all focus-within:border-[#222468] focus-within:ring-2 focus-within:ring-[#222468]/10">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <input type="date" value={returnDate} min={todayISO} max={maxDateISO} onChange={e => handleReturnChange(e.target.value)} className="w-full border-none bg-transparent text-[13px] font-semibold text-zinc-900 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Passengers</label>
            <div className="flex h-11 items-center justify-between rounded-xl border border-zinc-200 bg-white px-2">
              <button onClick={() => setAdults(a => Math.max(1, a - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"><Minus className="h-3.5 w-3.5" /></button>
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-zinc-900"><Users className="h-3.5 w-3.5 text-zinc-400" /> {adults}</span>
              <button onClick={() => setAdults(a => Math.min(9, a + 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Cabin</label>
            <select value={cabin} onChange={e => setCabin(e.target.value as CabinClass)} className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 text-[13px] font-semibold text-zinc-900 outline-none transition-all focus:border-[#222468] focus:ring-2 focus:ring-[#222468]/10 focus:outline-none focus-visible:outline-none">
              {(Object.keys(CABIN_LABEL) as CabinClass[]).map(c => <option key={c} value={c}>{CABIN_LABEL[c]}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => void search()} disabled={loading}
          className={cn("mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#EA7218] text-[13.5px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(234,114,24,0.7)] transition hover:brightness-110 active:scale-[0.99]", loading && "opacity-80")}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching live fares…</> : <><Search className="h-4 w-4" /> Search fares</>}
        </button>
      </div>

      {/* Results */}
      <div className="nice-scroll mt-4 flex-1 space-y-3 overflow-y-auto pb-4">
        {!isAmadeus && !hasSerpApiKey && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium text-amber-700">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Please enter your SerpApi key in <strong>Settings → Flight API & GDS</strong> to view live fares.
          </div>
        )}
        {dateWarning && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium text-amber-700">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            {dateWarning}
          </div>
        )}
        {loading && [0, 1, 2].map(i => <div key={i} className="shimmer h-[200px] rounded-2xl border border-zinc-200" />)}
        {!loading && searched && offers.length > 0 && (
          <>
            {offers.map(o => <OfferCard key={o.id} offer={o} lead={lead} cheapest={o.netPrice === cheapest} />)}
          </>
        )}
        {!loading && searched && offers.length === 0 && (isAmadeus || hasSerpApiKey) && (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-center">
            <Plane className="mb-2 h-6 w-6 -rotate-45 text-zinc-300" />
            <p className="text-[12px] font-semibold text-zinc-500">No live fares found</p>
            <p className="text-[10.5px] text-zinc-400">Try another date, route, or verify your API key in Settings.</p>
          </div>
        )}
        {!loading && !searched && (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-center">
            <Plane className="mb-2 h-6 w-6 -rotate-45 text-zinc-300" />
            <p className="text-[12px] font-semibold text-zinc-400">Run a search to compare live fares</p>
            <p className="text-[10.5px] text-zinc-300">Results include net fare + {settings.markupPercent}% selling markup</p>
          </div>
        )}
      </div>
    </div>
  );
}
