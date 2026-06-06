// SerpAPI Google Flights Integration

export interface SerpApiOneWayParams {
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD
  adults?: number;
  cabin?: string;
  limit?: number;
  currency?: string;
}

export interface SerpApiRoundTripParams extends SerpApiOneWayParams {
  return_date: string; // YYYY-MM-DD
}

const CABIN_MAP: Record<string, string> = {
  economy: '1',
  premium_economy: '2',
  business: '3',
  first: '4',
};

function formatIsoTime(timeStr: string) {
  // timeStr is like "2026-07-03 14:05"
  // Needs to be ISO or parseable, we can just replace space with T
  if (!timeStr) return '';
  return timeStr.replace(' ', 'T') + ':00';
}

function parseSerpApiResponse(raw: any) {
  const combinations: any[] = [];
  const flights = [...(raw?.best_flights || []), ...(raw?.other_flights || [])];

  for (const item of flights) {
    const legs: any[] = [];
    const segments = item.flights || [];
    let stops = segments.length > 0 ? segments.length - 1 : 0;
    
    // For single Google Flights option, we treat all its segments as one "Leg" in our UI, 
    // or we can map it to our ParsedLeg format. 
    // Actually, our UI expects one ParsedLeg per user-requested route leg.
    // A route leg can have layovers (stops > 0).
    // In RapidAPI, leg.segments contains the detailed segments, but the leg itself has origin/dest/duration.
    
    if (segments.length === 0) continue;

    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    const airlineNames = segments.map((s: any) => s.airline).join(', ');
    const flightNos = segments.map((s: any) => s.flight_number).join(', ');

    legs.push({
      origin: firstSegment.departure_airport?.id,
      dest: lastSegment.arrival_airport?.id,
      airline: airlineNames,
      flightNo: flightNos,
      departTime: formatIsoTime(firstSegment.departure_airport?.time),
      arrivalTime: formatIsoTime(lastSegment.arrival_airport?.time),
      durationMin: item.total_duration,
      price: item.price,
      airlineLogo: firstSegment.airline_logo,
      stops: stops,
    });

    combinations.push({
      id: `c-${Math.random().toString(36).substr(2, 9)}`,
      totalPrice: item.price,
      totalDurationMin: item.total_duration,
      legs,
    });
  }

  // Deduplicate by ID or just return (IDs are random anyway, but maybe limit)
  return combinations;
}

export async function searchOneWaySerp(params: SerpApiOneWayParams) {
  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey) throw new Error("SERPAPI_KEY is not configured");

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.append('engine', 'google_flights');
  url.searchParams.append('departure_id', params.origin);
  url.searchParams.append('arrival_id', params.destination);
  url.searchParams.append('outbound_date', params.date);
  url.searchParams.append('type', '2'); // one way
  url.searchParams.append('hl', 'zh-TW');
  url.searchParams.append('gl', 'tw');

  if (params.adults) url.searchParams.append('adults', String(params.adults));
  if (params.cabin) url.searchParams.append('travel_class', CABIN_MAP[params.cabin] || '1');
  if (params.currency) url.searchParams.append('currency', params.currency);
  url.searchParams.append('api_key', serpApiKey);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SerpAPI search failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const combinations = parseSerpApiResponse(data);
  return { combinations };
}

// For Round Trip in SerpAPI, since type=1 only gives outbound and requires tokens for return,
// we will simulate round trip by doing two one-way searches and doing cartesian combination.
export async function searchRoundTripSerp(params: SerpApiRoundTripParams) {
  const [outboundRes, returnRes] = await Promise.all([
    searchOneWaySerp({
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      adults: params.adults,
      cabin: params.cabin,
      currency: params.currency,
      limit: params.limit
    }),
    searchOneWaySerp({
      origin: params.destination,
      destination: params.origin,
      date: params.return_date,
      adults: params.adults,
      cabin: params.cabin,
      currency: params.currency,
      limit: params.limit
    })
  ]);

  const combined = [];
  for (const outComb of outboundRes.combinations) {
    for (const retComb of returnRes.combinations) {
      combined.push({
        id: `c-${Math.random().toString(36).substr(2, 9)}`,
        totalPrice: outComb.totalPrice + retComb.totalPrice,
        totalDurationMin: outComb.totalDurationMin + retComb.totalDurationMin,
        legs: [...outComb.legs, ...retComb.legs]
      });
    }
  }

  // Sort by price
  combined.sort((a, b) => a.totalPrice - b.totalPrice);

  return { combinations: combined };
}
