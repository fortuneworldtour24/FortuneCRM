import { cn } from "@/utils/cn";
import type { LeadSource, Presence, Stage } from "@/types/database";

export { cn };

export const STAGES: { key: Stage; label: string; short: string; dot: string; chip: string }[] = [
  { key: "contacted",   label: "Contacted",             short: "Contacted",  dot: "#222468", chip: "bg-blue-50 text-blue-700 border-blue-100" },
  { key: "negotiation", label: "Negotiation / In Review",short: "Negotiation",dot: "#F59E0B", chip: "bg-amber-50 text-amber-700 border-amber-100" },
  { key: "offer_sent",  label: "Offer Sent",            short: "Offer Sent", dot: "#8B5CF6", chip: "bg-violet-50 text-violet-700 border-violet-100" },
  { key: "closed_won",  label: "Deal Closed / Ticketed", short: "Ticketed",  dot: "#10B981", chip: "bg-emerald-50 text-emerald-700 border-emerald-100" },
];

export const stageMeta = (s: Stage) => STAGES.find((x) => x.key === s) ?? STAGES[0];

export const SOURCES: Record<LeadSource, { label: string; tint: string }> = {
  meta_ads: { label: "Meta Ads",        tint: "#1877F2" },
  whatsapp: { label: "WhatsApp",        tint: "#25D366" },
  walk_in:  { label: "Walk-in / Phone", tint: "#F59E0B" },
  manual:   { label: "Manual",          tint: "#71717A" },
};

export const PRESENCE_DOT: Record<Presence, string> = {
  online: "bg-emerald-500", busy: "bg-amber-500", offline: "bg-zinc-500",
};

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;

export function formatMoney(value: number, currency = import.meta.env.VITE_DEFAULT_CURRENCY || "AUD"): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function formatDuration(s: number): string {
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

export function formatFlightDuration(min: number): string {
  return `${Math.floor(min/60)}h ${String(min%60).padStart(2,"0")}m`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff/60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min/60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h/24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day:"numeric", month:"short" });
}

export function initials(name: string): string {
  return name.split(" ").map(p => p[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
}

export function daysFromNow(days: number): string {
  return new Date(Date.now() + days*86400000).toISOString();
}

export function prettyDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { weekday:"short", day:"numeric", month:"short" });
}

export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
