/**
 * AI Service — multi-provider chat orchestrator.
 *
 * Supported providers:
 *  • gemini   → Google Gemini 1.5 Flash (free tier, no credit card)
 *  • groq     → Groq OpenAI-compatible endpoint (free & very fast)
 *  • openai   → GPT-4o (function-calling, structured tool use)
 *  • anthropic → Claude 3.5 (scaffold — not yet implemented)
 *  • arena    → Arena.ai (scaffold)
 *
 * Flight search is triggered in two ways:
 *  - OpenAI / Groq: native function-calling (tool_calls in response)
 *  - Gemini:        intent extraction from the response text via regex +
 *                   a heuristic date resolver (Gemini Free tier does not
 *                   support function declarations with the v1beta endpoint
 *                   in all regions, so we use a robust prompt-engineering
 *                   approach instead)
 */

import type { FlightOffer, FlightSearchParams } from "@/services/flights/types";
import { getFlightProvider } from "@/services/flights";
import type { AISettings } from "@/types/integrations";

/* ------------------------------------------------------------------ */
/*  Shared types                                                        */
/* ------------------------------------------------------------------ */

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIServiceResponse {
  /** Text reply from the model */
  message: string;
  /** OpenAI-style tool calls (present only for openai provider) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolCalls?: any[];
  /** Gemini-extracted flight search params (present only for gemini provider) */
  flightSearch?: FlightSearchParams;
}

/* ------------------------------------------------------------------ */
/*  Entry point                                                         */
/* ------------------------------------------------------------------ */

export async function chatWithAI(
  messages: Message[],
  settings: AISettings,
  currency: string
): Promise<AIServiceResponse> {
  const activeKey = resolveActiveKey(settings);
  if (!activeKey) {
    throw new Error(
      settings.provider === "openrouter"
        ? "Connection Error: Check if your OpenRouter key is saved in Settings."
        : settings.provider === "gemini"
          ? "Gemini API key is missing. Get a free key at aistudio.google.com — no credit card needed."
          : "AI API key is missing. Please configure it in Settings › AI & Automation."
    );
  }

  if (settings.provider === "openrouter") {
    return callOpenRouter(messages, settings, activeKey);
  }
  if (settings.provider === "gemini") {
    return callGemini(messages, settings, activeKey, currency);
  }
  if (settings.provider === "groq") {
    return callGroq(messages, settings, activeKey);
  }
  if (settings.provider === "openai") {
    return callOpenAI(messages, settings, activeKey);
  }

  throw new Error(
    `Provider "${settings.provider}" is not yet implemented.`
  );
}

/** Returns the correct API key for the active provider */
function resolveActiveKey(settings: AISettings): string {
  let key = "";
  if (settings.provider === "openrouter") key = settings.openrouterApiKey || settings.apiKey;
  else if (settings.provider === "gemini") key = settings.geminiApiKey || settings.apiKey;
  else key = settings.apiKey;

  if (!key || key.trim().length === 0) {
    key = localStorage.getItem("fwt_openrouter_key") || "";
    if (!key) {
      try {
        const lsData = localStorage.getItem("fwt_system_settings");
        if (lsData) {
          const parsed = JSON.parse(lsData);
          if (settings.provider === "openrouter" && parsed?.ai?.openrouterApiKey) {
            key = parsed.ai.openrouterApiKey;
          }
        }
      } catch { /* ignore */ }
    }
  }
  return key;
}

/* ------------------------------------------------------------------ */
/*  Google Gemini 1.5 Flash                                             */
/* ------------------------------------------------------------------ */

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

/** Month name → 2-digit month number */
const MONTH_MAP: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

/** IATA codes that map to airport city names / common abbreviations */
const CITY_TO_IATA: Record<string, string> = {
  sydney: "SYD", melbourne: "MEL", brisbane: "BNE", perth: "PER", adelaide: "ADL",
  dubai: "DXB", "abu dhabi": "AUH", doha: "DOH", singapore: "SIN",
  "kuala lumpur": "KUL", kl: "KUL", bangkok: "BKK", bali: "DPS", denpasar: "DPS",
  colombo: "CMB", male: "MLE", maldives: "MLE",
  delhi: "DEL", "new delhi": "DEL", mumbai: "BOM", bombay: "BOM",
  bengaluru: "BLR", bangalore: "BLR", hyderabad: "HYD", chennai: "MAA", madras: "MAA",
  kozhikode: "CCJ", calicut: "CCJ",
  london: "LHR", paris: "CDG", frankfurt: "FRA", amsterdam: "AMS",
  istanbul: "IST", rome: "FCO", zurich: "ZRH",
  "new york": "JFK", "los angeles": "LAX", "san francisco": "SFO",
  toronto: "YYZ", vancouver: "YVR",
  tokyo: "HND", seoul: "ICN", "hong kong": "HKG",
  auckland: "AKL", nadi: "NAN", fiji: "NAN",
  johannesburg: "JNB",
};

function resolveIataFromText(text: string): string | null {
  const t = text.trim().toLowerCase();
  // Already a 3-letter IATA code?
  if (/^[a-z]{3}$/i.test(text.trim())) return text.trim().toUpperCase();
  for (const [city, iata] of Object.entries(CITY_TO_IATA)) {
    if (t.includes(city)) return iata;
  }
  return null;
}

/** Parse a rough month/year reference into the nearest future YYYY-MM-DD */
function parseDateHint(hint: string): string {
  const lower = hint.toLowerCase().trim();
  const monthMatch = Object.entries(MONTH_MAP).find(([name]) => lower.includes(name));
  const yearMatch = lower.match(/20\d{2}/);

  const now = new Date();
  let year = yearMatch ? parseInt(yearMatch[0]) : now.getFullYear();
  let month = monthMatch ? parseInt(monthMatch[1]) - 1 : now.getMonth();

  // If the target month is already past, assume next year
  const target = new Date(year, month, 15);
  if (target < now && !yearMatch) {
    year += 1;
  }
  target.setFullYear(year);

  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-15`;
}

/**
 * Heuristic intent extraction — returns FlightSearchParams if the
 * assistant's response or the user's latest message signals a flight search.
 */
function extractFlightIntent(
  userMessages: Message[],
  aiText: string,
  currency: string
): FlightSearchParams | null {
  const userText = userMessages
    .filter(m => m.role === "user")
    .map(m => m.content)
    .join(" ");
  const combined = `${userText} ${aiText}`.toLowerCase();

  // Must mention flight-related intent
  const flightKeywords = [
    "flight", "fly", "flying", "ticket", "airline", "depart", "departing",
    "book a flight", "find flights", "search flights", "cheapest flight", "cheap flight",
  ];
  if (!flightKeywords.some(k => combined.includes(k))) return null;

  // Extract origin & destination
  const fromMatch = combined.match(/(?:from|departing|origin)[:\s]+([a-z\s]+?)(?:\s+to\b|\s+airport|\s+in\b|,|\.|$)/i);
  const toMatch = combined.match(/(?:to|destination)[:\s]+([a-z\s]+?)(?:\s+in\b|\s+on\b|\s+during\b|,|\.|$)/i);

  const originRaw = fromMatch?.[1]?.trim() ?? "";
  const destRaw = toMatch?.[1]?.trim() ?? "";

  // Try to find IATA codes inline
  const iataPattern = /\b([A-Z]{3})\b/g;
  const inlineIata = [...(userText + " " + aiText).matchAll(iataPattern)].map(m => m[1]);

  let origin = resolveIataFromText(originRaw) ?? (inlineIata[0] ?? "SYD");
  let destination = resolveIataFromText(destRaw) ?? (inlineIata[1] ?? null);

  if (!destination) return null; // need at least a destination

  // Extract date
  const monthWords = Object.keys(MONTH_MAP).join("|");
  const dateRegex = new RegExp(`(${monthWords})[\\s\\w]*(?:20\\d{2})?`, "i");
  const dateMatch = combined.match(dateRegex);
  const departDate = dateMatch ? parseDateHint(dateMatch[0]) : parseDateHint("next month");

  // Adults
  const adultsMatch = combined.match(/(\d+)\s+(?:adult|passenger|pax|people|person)/i);
  const adults = adultsMatch ? Math.min(9, Math.max(1, parseInt(adultsMatch[1]))) : 2;

  // Cabin
  let cabin: FlightSearchParams["cabin"] = "economy";
  if (combined.includes("business")) cabin = "business";
  else if (combined.includes("first class")) cabin = "first";
  else if (combined.includes("premium")) cabin = "premium_economy";

  return { origin, destination, departDate, adults, cabin, currency };
}

async function callGemini(
  messages: Message[],
  settings: AISettings,
  apiKey: string,
  currency: string
): Promise<AIServiceResponse> {
  // Build Gemini content array — system prompt prepended to first user turn
  const contents = messages.map((m, i) => {
    const role = m.role === "user" ? "user" : "model";
    // Inject system prompt as the very first user turn prefix
    const text =
      m.role === "user" && i === 0
        ? `[SYSTEM INSTRUCTIONS — follow strictly]\n${settings.systemPrompt}\n\n[USER MESSAGE]\n${m.content}`
        : m.content;
    return { role, parts: [{ text }] };
  });

  // If the first message is assistant (shouldn't happen but guard)
  if (contents[0]?.role === "model") {
    contents.unshift({ role: "user", parts: [{ text: settings.systemPrompt }] });
  }

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      topP: 0.9,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    ],
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  
  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey.trim()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try { const e = await res.json(); detail = e?.error?.message ?? detail; } catch { /* skip */ }
      return { message: `Gemini API error (${detail})` };
    }

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };

    if (data.error) {
      return { message: `Gemini API error: ${data.error.message ?? "Unknown error"}` };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) {
      return { message: "Empty response from Gemini." };
    }

    // Success
    const flightSearchOrNull = extractFlightIntent(messages, text, currency);
    const flightSearch = flightSearchOrNull ?? undefined;
    return { message: text, flightSearch };
  } catch (err) {
    const lastError = err instanceof Error ? err.message : String(err);
    if (lastError.includes("aborted")) {
      return { message: "AI connection timed out. Please try again." };
    }
    return { message: `AI Error: ${lastError}` };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/*  Shared tool schema for OpenAI-compatible providers                  */
/* ------------------------------------------------------------------ */

function openAITools() {
  return [
    {
      type: "function",
      function: {
        name: "search_flights",
        description: "Search for live flight fares and routes.",
        parameters: {
          type: "object",
          properties: {
            origin:      { type: "string", description: "IATA code of origin airport (e.g. SYD)" },
            destination: { type: "string", description: "IATA code of destination airport (e.g. DXB)" },
            departDate:  { type: "string", description: "Departure date in YYYY-MM-DD format" },
            returnDate:  { type: "string", description: "Optional return date in YYYY-MM-DD format" },
            adults:      { type: "number", description: "Number of adult passengers", default: 2 },
            cabin:       { type: "string", enum: ["economy", "premium_economy", "business", "first"], default: "economy" },
          },
          required: ["origin", "destination", "departDate"],
        },
      },
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Groq — OpenAI-compatible free endpoint                              */
/* ------------------------------------------------------------------ */

async function callGroq(
  messages: Message[],
  settings: AISettings,
  apiKey: string
): Promise<AIServiceResponse> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: settings.systemPrompt }, ...messages],
      tools: openAITools(),
      tool_choice: "auto",
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message ?? `HTTP ${response.status}`;
    if (response.status === 404 || String(msg).toLowerCase().includes("not found")) {
      return { message: "Model not found. Please check your API key type or try switching to the Groq provider in Settings." };
    }
    return { message: `Groq API error: ${msg}` };
  }

  const data = await response.json() as {
    choices: { message: { content: string | null; tool_calls?: unknown[] } }[];
  };
  const choice = data.choices?.[0]?.message;
  if (!choice) return { message: "Groq returned an empty response." };
  if (choice.tool_calls) {
    return { message: choice.content ?? "", toolCalls: choice.tool_calls };
  }
  return { message: choice.content ?? "" };
}

/* ------------------------------------------------------------------ */
/*  OpenRouter (Free Tier)                                              */
/* ------------------------------------------------------------------ */

async function callOpenRouter(
  messages: Message[],
  settings: AISettings,
  apiKey: string
): Promise<AIServiceResponse> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey.trim()}`,
      "HTTP-Referer": "https://fortuneworldtours.com",
      "X-Title": "Fortune World Tour CRM",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-lite-preview-02-05:free",
      messages: [{ role: "system", content: settings.systemPrompt }, ...messages],
      tools: openAITools(),
      tool_choice: "auto",
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    return { message: "Connection Error: Check if your OpenRouter key is saved in Settings." };
  }

  const data = await response.json() as {
    choices: { message: { content: string | null; tool_calls?: unknown[] } }[];
  };
  const choice = data.choices?.[0]?.message;
  if (!choice) return { message: "Connection Error: Check if your OpenRouter key is saved in Settings." };
  if (choice.tool_calls) {
    return { message: choice.content ?? "", toolCalls: choice.tool_calls };
  }
  return { message: choice.content ?? "" };
}

/* ------------------------------------------------------------------ */
/*  OpenAI GPT-4o (function calling)                                    */
/* ------------------------------------------------------------------ */

async function callOpenAI(
  messages: Message[],
  settings: AISettings,
  apiKey: string
): Promise<AIServiceResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "system", content: settings.systemPrompt }, ...messages],
      tools: openAITools(),
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const err = await response.json() as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "OpenAI API error");
  }

  const data = await response.json() as {
    choices: { message: { content: string | null; tool_calls?: unknown[] } }[];
  };
  const choice = data.choices[0].message;

  if (choice.tool_calls) {
    return { message: choice.content ?? "", toolCalls: choice.tool_calls };
  }
  return { message: choice.content ?? "" };
}

/* ------------------------------------------------------------------ */
/*  Shared: execute the flight search tool                              */
/* ------------------------------------------------------------------ */

export async function executeSearchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
  const provider = getFlightProvider();
  return provider.searchFlights(params);
}

/* ------------------------------------------------------------------ */
/*  Provider display metadata (used in UI)                              */
/* ------------------------------------------------------------------ */

export interface ProviderMeta {
  label: string;
  badge: string;
  color: "green" | "blue" | "violet" | "zinc";
  free: boolean;
}

export const PROVIDER_META: Record<AIProvider, ProviderMeta> = {
  openrouter: {
    label: "OpenRouter · Gemini 2.0 Flash Lite",
    badge: "openrouter armed (free tier)",
    color: "green",
    free: true,
  },
  gemini: {
    label: "Gemini 1.5 Flash Latest",
    badge: "gemini armed (free tier)",
    color: "green",
    free: true,
  },
  groq: {
    label: "Groq · Llama 3.1 8B Instant",
    badge: "groq armed (free & fast)",
    color: "green",
    free: true,
  },
  openai: {
    label: "GPT-4o",
    badge: "openai armed",
    color: "blue",
    free: false,
  },
  anthropic: {
    label: "Claude 3.5",
    badge: "anthropic armed",
    color: "violet",
    free: false,
  },
  arena: {
    label: "Arena.ai",
    badge: "arena armed",
    color: "zinc",
    free: false,
  },
};

type AIProvider = import("@/types/integrations").AIProvider;
