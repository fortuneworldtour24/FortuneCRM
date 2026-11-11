import type { Lead, NewLeadInput, Profile } from "@/types/database";
import { searchAirports } from "@/services/airports";
import { daysFromNow } from "@/lib/utils";

export interface MetaLeadPayload {
  full_name: string; phone_number: string; email?: string;
  travel_destination?: string; departure_date?: string; campaign_name?: string;
}

export function metaLeadToInput(p: MetaLeadPayload): NewLeadInput {
  const dest = p.travel_destination?.trim() ?? "";
  const match = dest ? searchAirports(dest)[0] : undefined;
  return {
    client_name: p.full_name || "Meta Lead", phone: p.phone_number || "—", email: p.email ?? "",
    origin_iata: "SYD", destination_iata: match?.iata ?? (dest ? dest.slice(0,3).toUpperCase() : "DPS"),
    travel_date: p.departure_date || daysFromNow(30).slice(0,10),
    passengers: 2, budget: 5000, source: "meta_ads",
    summary: `Meta Lead Ads intake${p.campaign_name ? ` — campaign "${p.campaign_name}"` : ""}. Destination: ${dest||"unspecified"}.`,
  };
}

export interface WhatsAppInboundPayload { wa_id: string; profile_name?: string; message: string; }

export function whatsappToInput(p: WhatsAppInboundPayload): NewLeadInput {
  const destMatch = searchAirports(p.message)[0];
  return {
    client_name: p.profile_name || "WhatsApp Inquiry", phone: p.wa_id,
    origin_iata: "SYD", destination_iata: destMatch?.iata ?? "SIN",
    travel_date: daysFromNow(35).slice(0,10), passengers: 2, budget: 4000, source: "whatsapp",
    summary: `New Inquiry via WhatsApp: "${p.message.slice(0,90)}${p.message.length>90?"…":""}"`,
  };
}

const ACTIVE_STAGES = new Set(["contacted","negotiation","offer_sent"]);

export function pickRoundRobin(staff: Profile[], leads: Lead[]): Profile | undefined {
  const agents = staff.filter(s => s.role === "staff" && !s.suspended);
  if (!agents.length) return staff.find(s => !s.suspended) ?? staff[0];
  const load = new Map<string,number>(agents.map(a => [a.id, 0]));
  for (const l of leads) {
    if (ACTIVE_STAGES.has(l.stage) && load.has(l.assigned_to))
      load.set(l.assigned_to, (load.get(l.assigned_to) ?? 0) + 1);
  }
  return agents.reduce((best,cur) => (load.get(cur.id)??0) < (load.get(best.id)??0) ? cur : best);
}
