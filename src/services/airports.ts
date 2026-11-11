export interface Airport { iata: string; city: string; name: string; country: string; }

export const AIRPORTS: Airport[] = [
  {iata:"SYD",city:"Sydney",name:"Kingsford Smith",country:"Australia"},
  {iata:"MEL",city:"Melbourne",name:"Tullamarine",country:"Australia"},
  {iata:"BNE",city:"Brisbane",name:"Brisbane Airport",country:"Australia"},
  {iata:"PER",city:"Perth",name:"Perth Airport",country:"Australia"},
  {iata:"ADL",city:"Adelaide",name:"Adelaide Airport",country:"Australia"},
  {iata:"OOL",city:"Gold Coast",name:"Gold Coast Airport",country:"Australia"},
  {iata:"DXB",city:"Dubai",name:"Dubai International",country:"UAE"},
  {iata:"AUH",city:"Abu Dhabi",name:"Zayed International",country:"UAE"},
  {iata:"DOH",city:"Doha",name:"Hamad International",country:"Qatar"},
  {iata:"SIN",city:"Singapore",name:"Changi",country:"Singapore"},
  {iata:"KUL",city:"Kuala Lumpur",name:"KLIA",country:"Malaysia"},
  {iata:"BKK",city:"Bangkok",name:"Suvarnabhumi",country:"Thailand"},
  {iata:"HKT",city:"Phuket",name:"Phuket International",country:"Thailand"},
  {iata:"DPS",city:"Bali / Denpasar",name:"Ngurah Rai",country:"Indonesia"},
  {iata:"CMB",city:"Colombo",name:"Bandaranaike",country:"Sri Lanka"},
  {iata:"MLE",city:"Malé",name:"Velana International",country:"Maldives"},
  {iata:"DEL",city:"New Delhi",name:"Indira Gandhi Intl",country:"India"},
  {iata:"BOM",city:"Mumbai",name:"Chhatrapati Shivaji",country:"India"},
  {iata:"BLR",city:"Bengaluru",name:"Kempegowda Intl",country:"India"},
  {iata:"CCJ",city:"Kozhikode",name:"Calicut Intl",country:"India"},
  {iata:"LHR",city:"London",name:"Heathrow",country:"United Kingdom"},
  {iata:"CDG",city:"Paris",name:"Charles de Gaulle",country:"France"},
  {iata:"FRA",city:"Frankfurt",name:"Frankfurt am Main",country:"Germany"},
  {iata:"AMS",city:"Amsterdam",name:"Schiphol",country:"Netherlands"},
  {iata:"IST",city:"Istanbul",name:"Istanbul Airport",country:"Türkiye"},
  {iata:"JFK",city:"New York",name:"John F. Kennedy",country:"USA"},
  {iata:"LAX",city:"Los Angeles",name:"Los Angeles Intl",country:"USA"},
  {iata:"HND",city:"Tokyo",name:"Haneda",country:"Japan"},
  {iata:"ICN",city:"Seoul",name:"Incheon Intl",country:"South Korea"},
  {iata:"HKG",city:"Hong Kong",name:"Hong Kong Intl",country:"Hong Kong"},
  {iata:"AKL",city:"Auckland",name:"Auckland Airport",country:"New Zealand"},
  {iata:"NAN",city:"Nadi",name:"Nadi International",country:"Fiji"},
  {iata:"JNB",city:"Johannesburg",name:"OR Tambo Intl",country:"South Africa"},
  {iata:"MNL",city:"Manila",name:"Ninoy Aquino Intl",country:"Philippines"},
  {iata:"SGN",city:"Ho Chi Minh City",name:"Tan Son Nhat",country:"Vietnam"},
  {iata:"FCO",city:"Rome",name:"Fiumicino",country:"Italy"},
  {iata:"ZRH",city:"Zurich",name:"Zurich Airport",country:"Switzerland"},
];

export function searchAirports(q: string): Airport[] {
  const s = q.trim().toLowerCase();
  if (!s) return AIRPORTS.slice(0, 8);
  return AIRPORTS.filter(a =>
    a.iata.toLowerCase().includes(s) || a.city.toLowerCase().includes(s) ||
    a.name.toLowerCase().includes(s) || a.country.toLowerCase().includes(s)
  ).slice(0, 8);
}

export function airportLabel(iata: string): string {
  const a = AIRPORTS.find(x => x.iata === iata.toUpperCase());
  return a ? `${a.city} (${a.iata})` : iata.toUpperCase();
}
