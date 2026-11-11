/**
 * Integration settings stored in-memory (and optionally persisted to
 * Supabase `agency_settings` table).  Every field is optional so the
 * form can be populated incrementally.
 */

export type FlightProvider = "serpapi" | "amadeus";
export type AmadeusEnv = "sandbox" | "production";
export type DialerMode = "webrtc" | "tel" | "twilio" | "sip";
export type WhatsAppProvider = "meta" | "twilio";
export type EmailProvider = "resend" | "smtp";
export type AssignmentMode = "round_robin" | "manual";
export type AIProvider = "openrouter" | "gemini" | "groq" | "openai" | "anthropic" | "arena";

export interface FlightAPISettings {
  activeProvider: FlightProvider;
  serpApiKey: string;
  amadeusClientId: string;
  amadeusClientSecret: string;
  amadeusOfficeId: string;
  amadeusEnv: AmadeusEnv;
  defaultMarkupPercent: number;
  defaultCurrency: string;
}

export interface MetaLeadSettings {
  verifyToken: string;
  appId: string;
  pageAccessToken: string;
  assignmentMode: AssignmentMode;
}

export interface WhatsAppSettings {
  provider: WhatsAppProvider;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioWhatsAppNumber: string;
  quickTemplate: string;
}

export interface TelephonySettings {
  dialerMode: DialerMode;
  twilioAccountSid: string;
  twilioApiKey: string;
  sipEndpoint: string;
  sipUsername: string;
  sipPassword: string;
}

export interface EmailSettings {
  provider: EmailProvider;
  resendApiKey: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  senderName: string;
  senderEmail: string;
}

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  /** Dedicated Gemini API key — stored separately so users can keep one key per provider */
  geminiApiKey: string;
  openrouterApiKey: string;
  systemPrompt: string;
}

export interface IntegrationSettings {
  flight: FlightAPISettings;
  meta: MetaLeadSettings;
  whatsapp: WhatsAppSettings;
  telephony: TelephonySettings;
  email: EmailSettings;
  ai: AISettings;
}

export const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  flight: {
    activeProvider: "serpapi",
    serpApiKey: import.meta.env.VITE_SERPAPI_API_KEY ?? "",
    amadeusClientId: "",
    amadeusClientSecret: "",
    amadeusOfficeId: "",
    amadeusEnv: "sandbox",
    defaultMarkupPercent: Number(import.meta.env.VITE_DEFAULT_MARKUP_PERCENT ?? 5),
    defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY ?? "AUD",
  },
  meta: {
    verifyToken: "fwt-verify-token",
    appId: "",
    pageAccessToken: "",
    assignmentMode: "round_robin",
  },
  whatsapp: {
    provider: "meta",
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioWhatsAppNumber: "",
    quickTemplate:
      "✈️ *Fortune World Tour — Your Flight Quote*\n\nHi {{name}}, here is your personalised quote:\n\nRoute: *{{route}}*\nAirline: {{airline}}\nDeparture: {{depart}} → Arrival: {{arrive}}\nDuration: {{duration}}\n💰 All-in price: *{{price}}* (incl. taxes)\n\nReply *YES* to lock your seats.\n📞 {{agencyPhone}}",
  },
  telephony: {
    dialerMode: "webrtc",
    twilioAccountSid: "",
    twilioApiKey: "",
    sipEndpoint: "",
    sipUsername: "",
    sipPassword: "",
  },
  email: {
    provider: "resend",
    resendApiKey: "",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    senderName: "Fortune World Tour",
    senderEmail: "quotes@fortuneworldtours.com",
  },
  ai: {
    provider: "openrouter",
    apiKey: "",
    geminiApiKey: "",
    openrouterApiKey: "",
    systemPrompt:
      "You are the Fortune World Tour AI Co-Pilot. Your job is to help staff find flights, format WhatsApp quotes, and summarize lead histories. When a user asks to find or search for flights, extract origin, destination, and travel dates from the query and call search_flights. Always respond in concise, friendly, professional language.",
  },
};
