import type { FlightOffer } from "@/services/flights/types";

export type Role = "admin" | "staff";
export type Presence = "online" | "busy" | "offline";
export type Stage = "contacted" | "negotiation" | "offer_sent" | "closed_won" | "closed_lost";
export type LeadSource = "meta_ads" | "whatsapp" | "manual" | "walk_in";
export type CabinClass = "economy" | "premium_economy" | "business" | "first";
export type CallDirection = "inbound" | "outbound";
export type CallDisposition = "connected" | "busy" | "no_answer" | "wrong_number";
export type ViewKey = "dashboard" | "tasks" | "activity" | "customers" | "flights" | "settings";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  title: string;
  avatar_color: string;
  avatar_url?: string;
  status: Presence;
  suspended?: boolean;
}

export interface ChatMessage {
  id: string;
  from: "client" | "agent";
  text: string;
  at: string;
}

export interface Lead {
  id: string;
  client_name: string;
  email: string;
  phone: string;
  origin_iata: string;
  destination_iata: string;
  travel_date: string;
  return_date?: string;
  passengers: number;
  budget: number;
  stage: Stage;
  source: LeadSource;
  assigned_to: string;
  progress: number;
  comments: number;
  summary: string;
  notes: string;
  whatsapp: ChatMessage[];
  created_at: string;
}

export type NewLeadInput = {
  client_name: string;
  phone: string;
  email?: string;
  origin_iata: string;
  destination_iata: string;
  travel_date: string;
  passengers: number;
  budget: number;
  source: LeadSource;
  stage?: Stage;
  summary?: string;
  assigned_to?: string;
};

export interface Quote {
  id: string;
  lead_id: string | null;
  provider: "serpapi" | "amadeus";
  flight_details: FlightOffer;
  route: string;
  net_price: number;
  selling_price: number;
  markup_percent: number;
  created_by: string;
  created_at: string;
}

export interface CallLog {
  id: string;
  lead_id: string | null;
  lead_name: string;
  staff_id: string;
  direction: CallDirection;
  phone: string;
  duration_seconds: number;
  disposition: CallDisposition;
  notes: string;
  created_at: string;
}

export interface TaskItem {
  id: string;
  title: string;
  tag: string;
  dueLabel: string;
  tone: "amber" | "red" | "slate" | "blue" | "green";
  done: boolean;
  assignee: string;
  progress: number;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  kind: "call" | "quote" | "lead" | "stage" | "task" | "webhook";
  text: string;
  at: string;
}
