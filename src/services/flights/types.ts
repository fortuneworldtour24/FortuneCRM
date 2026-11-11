import type { CabinClass } from "@/types/database";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults: number;
  cabin: CabinClass;
  currency: string;
}

export interface FlightLeg {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  from: string;
  to: string;
  departTime: string;
  arriveTime: string;
  durationMin: number;
  aircraft?: string;
}

export interface FlightOffer {
  id: string;
  provider: "serpapi" | "amadeus";
  airline: string;
  airlineCode: string;
  airlineLogo?: string;
  flightNumbers: string[];
  legs: FlightLeg[];
  stops: number;
  stopAirports: string[];
  totalDurationMin: number;
  departTime: string;
  arriveTime: string;
  netPrice: number;
  currency: string;
  cabin: CabinClass;
  deepLink?: string;
  isDemo?: boolean;
}

export interface IFlightProvider {
  readonly name: "serpapi" | "amadeus";
  searchFlights(params: FlightSearchParams): Promise<FlightOffer[]>;
}

export const CABIN_TO_SERPAPI: Record<CabinClass, number> = {
  economy: 1, premium_economy: 2, business: 3, first: 4,
};

export const CABIN_LABEL: Record<CabinClass, string> = {
  economy: "Economy", premium_economy: "Premium Economy", business: "Business", first: "First",
};
