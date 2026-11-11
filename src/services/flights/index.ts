import { AmadeusFlightProvider } from "./amadeusProvider";
import { SerpApiFlightProvider } from "./serpApiProvider";
import type { IFlightProvider } from "./types";

export type { FlightOffer, FlightSearchParams, IFlightProvider } from "./types";
export { CABIN_LABEL } from "./types";

const cache: Partial<Record<string, IFlightProvider>> = {};

export function getFlightProvider(): IFlightProvider {
  const key = (import.meta.env.VITE_FLIGHT_PROVIDER || "serpapi").toLowerCase();
  if (!cache[key]) {
    cache[key] = key === "amadeus" ? new AmadeusFlightProvider() : new SerpApiFlightProvider();
  }
  return cache[key]!;
}
