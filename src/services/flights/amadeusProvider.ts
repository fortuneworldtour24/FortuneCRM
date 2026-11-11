import type { FlightOffer, FlightSearchParams, IFlightProvider } from "./types";

export class AmadeusFlightProvider implements IFlightProvider {
  readonly name = "amadeus" as const;
  async searchFlights(_params: FlightSearchParams): Promise<FlightOffer[]> {
    console.warn("[Flights] Amadeus provider not configured.");
    return [];
  }
}
