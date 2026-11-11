import { uid } from "@/lib/utils";
import type { FlightOffer, FlightSearchParams, IFlightProvider } from "./types";

/* ------------------------------------------------------------------ */
/*  Live SerpApi browser search — no AbortController, no demo fares     */
/* ------------------------------------------------------------------ */

interface SerpApiLeg {
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
  duration?: number;
  airplane?: string;
  departure_airport?: { id?: string; time?: string; name?: string };
  arrival_airport?: { id?: string; time?: string; name?: string };
}
interface SerpApiFlightGroup {
  flights?: SerpApiLeg[];
  layovers?: { id?: string; duration?: number }[];
  total_duration?: number;
  price?: number;
  booking_token?: string;
}
interface SerpApiResponse {
  best_flights?: SerpApiFlightGroup[];
  other_flights?: SerpApiFlightGroup[];
  error?: string;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

/** Guaranteed YYYY-MM-DD output regardless of input format */
const formatDate = (d: string | Date): string => {
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return String(d);
  }
};

const hhmm = (isoish?: string): string => {
  if (!isoish) return "--:--";
  const t = isoish.split(" ")[1] ?? isoish.split("T")[1] ?? isoish;
  return t.slice(0, 5);
};

function parseGroups(
  groups: SerpApiFlightGroup[],
  params: FlightSearchParams
): FlightOffer[] {
  return groups
    .filter(g => (g.flights?.length ?? 0) > 0 && typeof g.price === "number")
    .map(g => {
      const legs = g.flights ?? [];
      const first = legs[0];
      const last = legs[legs.length - 1];
      return {
        id: uid(),
        provider: "serpapi" as const,
        airline: first.airline ?? "Multi-carrier",
        airlineCode: (first.flight_number ?? "XX").slice(0, 2).toUpperCase(),
        airlineLogo: first.airline_logo,
        flightNumbers: legs.map(l => l.flight_number ?? "—"),
        legs: legs.map(l => ({
          airline: l.airline ?? "",
          airlineCode: (l.flight_number ?? "XX").slice(0, 2).toUpperCase(),
          flightNumber: l.flight_number ?? "—",
          from: l.departure_airport?.id ?? params.origin,
          to: l.arrival_airport?.id ?? params.destination,
          departTime: hhmm(l.departure_airport?.time),
          arriveTime: hhmm(l.arrival_airport?.time),
          durationMin: l.duration ?? 0,
          aircraft: l.airplane,
        })),
        stops: Math.max(0, legs.length - 1),
        stopAirports: (g.layovers ?? []).map(l => l.id ?? "").filter(Boolean),
        totalDurationMin:
          g.total_duration ?? legs.reduce((sum, l) => sum + (l.duration ?? 0), 0),
        departTime: hhmm(first.departure_airport?.time),
        arriveTime: hhmm(last.arrival_airport?.time),
        netPrice: Math.round(g.price ?? 0),
        currency: params.currency,
        cabin: params.cabin,
        deepLink: g.booking_token,
        isDemo: false,
      };
    })
    .sort((a, b) => a.netPrice - b.netPrice);
}

/* ── Provider ─────────────────────────────────────────────────────── */

export class SerpApiFlightProvider implements IFlightProvider {
  readonly name = "serpapi" as const;

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    // 1. Read key: Supabase first (subdomain-independent), then localStorage
    let apiKey = "";
    try {
      const { supabase } = await import("@/lib/supabase");
      if (supabase) {
        const { data } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "flight")
          .single();
        const parsed = typeof data?.value === "string" ? JSON.parse(data.value) : data?.value;
        apiKey = (parsed?.serpApiKey || "").trim();
        if (apiKey) {
          // Mirror to localStorage for speed on next search
          localStorage.setItem("fwt_serpapi_key", apiKey);
          localStorage.setItem("serpapi_api_key", apiKey);
        }
      }
    } catch { /* Supabase unavailable — fall through */ }

    if (!apiKey) {
      apiKey = (
        localStorage.getItem("fwt_serpapi_key") ||
        localStorage.getItem("serpapi_api_key") ||
        ""
      ).trim();
    }

    if (!apiKey) {
      throw new Error("Please save your SerpApi key in Settings → Flight API & GDS.");
    }

    // 2. Strict 300-day horizon check
    const departMs = new Date(params.departDate).getTime() - Date.now();
    if (departMs > 300 * 86400000) {
      throw new Error(
        "⚠️ Schedule Not Available: Airlines only release seats up to 300 days in advance. Please select a date within the next 10 months."
      );
    }

    // 3. Enforce ISO date format (YYYY-MM-DD)
    const outboundDate = formatDate(params.departDate);
    const returnDate = params.returnDate ? formatDate(params.returnDate) : undefined;

    // 4. Build SerpApi URL
    const qs = new URLSearchParams({
      engine: "google_flights",
      departure_id: params.origin,
      arrival_id: params.destination,
      outbound_date: outboundDate,
      currency: params.currency,
      type: returnDate ? "1" : "2",
      api_key: apiKey,
    });
    if (returnDate) qs.set("return_date", returnDate);
    if (params.adults > 1) qs.set("adults", String(params.adults));

    const serpApiUrl = `https://serpapi.com/search.json?${qs.toString()}`;

    // 5. Primary proxy: AllOrigins — Fallback: CodeTabs
    const primaryUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(serpApiUrl)}`;
    const fallbackUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(serpApiUrl)}`;

    // 6. Fetch — NO AbortController
    try {
      let res: Response | null = null;
      let rawText = "";

      try {
        res = await fetch(primaryUrl);
        if (res.ok) rawText = await res.text();
      } catch {
        // Primary proxy unreachable
      }

      if (!rawText) {
        try {
          res = await fetch(fallbackUrl);
          if (res && res.ok) rawText = await res.text();
        } catch { /* both down */ }
      }

      if (!rawText) {
        // Try to extract the real error from the last response
        if (res && !res.ok) {
          try {
            const errBody = JSON.parse(await res.text());
            if (errBody.error) throw new Error(errBody.error);
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected") throw e;
          }
        }
        throw new Error("Could not reach SerpApi. Please check your API key and try again.");
      }

      let json: SerpApiResponse;
      try {
        json = JSON.parse(rawText) as SerpApiResponse;
      } catch {
        throw new Error("Invalid response from SerpApi. The proxy may be returning an error page.");
      }

      // Surface the EXACT SerpApi error message (e.g. "Invalid API key", "No flights found")
      if (json.error) throw new Error(json.error);

      const offers = parseGroups([
        ...(json.best_flights ?? []),
        ...(json.other_flights ?? []),
      ], params);

      if (!offers.length) {
        throw new Error(
          "No flights found for this route/date. Try a major hub airport (like DXB, LHR, or DEL)."
        );
      }

      return offers;
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error(String(err));
    }
  }
}
