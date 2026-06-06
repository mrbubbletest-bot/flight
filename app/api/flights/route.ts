import { NextResponse } from 'next/server';
import { addDays, format, parseISO } from 'date-fns';
import {
  searchOneWay,
  searchRoundTrip,
  searchMultiCity,
  expandLocation,
  delay,
} from '@/lib/flightApi';
import { searchOneWaySerp, searchRoundTripSerp } from '@/lib/serpApi';

// --- Shared types for the frontend ---
interface ParsedLeg {
  origin: string;
  dest: string;
  airline: string;
  flightNo: string;
  departTime: string;   // ISO datetime
  arrivalTime: string;  // ISO datetime
  durationMin: number;
  price: number;
  airlineLogo: string;
  stops: number;
}

interface Combination {
  id: string;
  totalPrice: number;
  totalDurationMin: number;
  legs: ParsedLeg[];
}

function safeNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  // If it's an object (like { raw: ... }), try to extract common properties or fail gracefully
  if (typeof val === 'object') {
    val = val.raw ?? val.amount ?? val.total ?? 0;
  }
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g, '')) : Number(val);
  return isNaN(num) ? 0 : num;
}

// --- Skyscanner response parser ---
function parseSkyscannerResponse(raw: any): Combination[] {
  const combinations: Combination[] = [];
  const results = raw?.results || [];

  if (Array.isArray(results) && results.length > 0) {
    for (const res of results) {
      const price = safeNumber(res.price_raw ?? res.price);
      
      const legs: ParsedLeg[] = [];
      const resLegs = res.legs || [];

      for (const leg of resLegs) {
        const originCode = leg.from || leg.origin || '';
        const destCode = leg.to || leg.destination || '';
        const departure = leg.dep || leg.departure || '';
        const arrival = leg.arr || leg.arrival || '';
        const durationMin = safeNumber(leg.dur_min ?? leg.durationInMinutes ?? leg.duration);
        const stopCount = safeNumber(leg.stops ?? leg.stopCount);

        const carriers = res.carriers || [];
        const airline = Array.isArray(carriers) && carriers.length > 0 ? carriers.join(', ') : 'Unknown Airline';

        const segments = leg.segments || [];
        const flightNos = segments.length > 0 
          ? segments.map((s: any) => s.flight || s.flightNumber || s.number || '').filter(Boolean).join(', ')
          : '';

        legs.push({
          origin: originCode,
          dest: destCode,
          airline,
          flightNo: flightNos,
          departTime: departure,
          arrivalTime: arrival,
          durationMin,
          price: price / Math.max(resLegs.length, 1),
          airlineLogo: `https://www.gstatic.com/flights/airline_logos/70px/${(flightNos.slice(0, 2) || 'XX')}.png`,
          stops: stopCount,
        });
      }

      if (legs.length > 0) {
        const totalDuration = legs.reduce((sum, l) => sum + l.durationMin, 0);
        combinations.push({
          id: `c-${Math.random().toString(36).substr(2, 9)}`,
          totalPrice: price,
          totalDurationMin: totalDuration,
          legs,
        });
      }
    }
  } else {
    console.warn('[Skyscanner] Unexpected or empty response:', JSON.stringify(raw).slice(0, 500));
  }

  return combinations;
}

function addDaysToDate(dateStr: string, days: number): string {
  try {
    return format(addDays(parseISO(dateStr), days), 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
}

// --- Cabin mapping ---
const CABIN_MAP: Record<string, string> = {
  economy: 'economy',
  premium_economy: 'premium_economy',
  business: 'business',
  first: 'first',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const destMode = searchParams.get('destMode') || 'single';
    const tripType = searchParams.get('tripType') || 'roundtrip';
    const pax = parseInt(searchParams.get('pax') || '1');
    const provider = searchParams.get('provider') || 'rapidapi';

    console.log(`[API] /api/flights  mode=${destMode}  trip=${tripType}  pax=${pax} provider=${provider}`);

    // =========================================================
    // Single Destination
    // =========================================================
    if (destMode === 'single') {
      const originRaw = searchParams.get('origin') || '';
      const destRaw = searchParams.get('destination') || '';
      const departDate = searchParams.get('departDate') || '';
      const returnDate = searchParams.get('returnDate') || '';
      const cabin = searchParams.get('cabin') || 'economy';

      if (!originRaw || !destRaw || !departDate) {
        return NextResponse.json(
          { error: 'Missing required: origin, destination, departDate' },
          { status: 400 }
        );
      }

      // Expand country codes → airport codes
      const origins = expandLocation(originRaw);
      const destinations = expandLocation(destRaw);
      const skyCabin = CABIN_MAP[cabin] || 'economy';
      const maxStopsRaw = searchParams.get('maxStops');
      const maxStops = maxStopsRaw !== null ? parseInt(maxStopsRaw) : null;

      // Helper: filter combinations by max stops per leg
      const filterByMaxStops = (combs: Combination[], limit: number | null): Combination[] => {
        if (limit === null || isNaN(limit as number)) return combs;
        return combs.filter(c => c.legs.every(leg => leg.stops <= limit));
      };

      if (tripType === 'oneway') {
        // --- One-way: search origin×dest pairs sequentially with delay ---
        type ResultT = { combs: Combination[], rl: any };
        const results: ResultT[] = [];
        for (const o of origins) {
          for (const d of destinations) {
            if (results.length > 0) await delay(1000);
            try {
              let resCombs: Combination[] = [];
              let rl = null;
              if (provider === 'serpapi') {
                const res = await searchOneWaySerp({
                  origin: o, destination: d, date: departDate,
                  adults: pax, cabin: skyCabin, limit: 50, currency: 'TWD'
                });
                resCombs = res.combinations;
              } else {
                const res = await searchOneWay({
                  origin: o, destination: d, date: departDate,
                  adults: pax, cabin: skyCabin, limit: 50, currency: 'TWD'
                });
                resCombs = parseSkyscannerResponse(res.data);
                rl = res.rateLimit;
              }
              results.push({ combs: resCombs, rl });
            } catch (err: any) {
              console.error(`Search ${o}→${d} failed:`, err.message);
              results.push({ combs: [], rl: null });
            }
          }
        }

        let allCombinations = results.flatMap(r => r.combs);
        allCombinations = filterByMaxStops(allCombinations, maxStops);
        allCombinations.sort((a, b) => a.totalPrice - b.totalPrice);
        const rateLimit = results.find(r => r.rl)?.rl || null;
        return NextResponse.json({ combinations: allCombinations.slice(0, 150), rateLimit });

      } else {
        // --- Round-trip: sequential with delay ---
        type ResultT = { combs: Combination[], rl: any };
        const results: ResultT[] = [];
        for (const o of origins) {
          for (const d of destinations) {
            if (results.length > 0) await delay(1000);
            try {
              let resCombs: Combination[] = [];
              let rl = null;
              if (provider === 'serpapi') {
                const res = await searchRoundTripSerp({
                  origin: o, destination: d, date: departDate,
                  return_date: returnDate || addDaysToDate(departDate, 7),
                  adults: pax, cabin: skyCabin, limit: 50, currency: 'TWD'
                });
                resCombs = res.combinations;
              } else {
                const res = await searchRoundTrip({
                  origin: o, destination: d, date: departDate,
                  return_date: returnDate || addDaysToDate(departDate, 7),
                  adults: pax, cabin: skyCabin, limit: 50, currency: 'TWD'
                });
                resCombs = parseSkyscannerResponse(res.data);
                rl = res.rateLimit;
              }
              results.push({ combs: resCombs, rl });
            } catch (err: any) {
              console.error(`RT search ${o}→${d} failed:`, err.message);
              results.push({ combs: [], rl: null });
            }
          }
        }

        let allCombinations = results.flatMap(r => r.combs);
        allCombinations = filterByMaxStops(allCombinations, maxStops);
        allCombinations.sort((a, b) => a.totalPrice - b.totalPrice);
        const rateLimit = results.find(r => r.rl)?.rl || null;
        return NextResponse.json({ combinations: allCombinations.slice(0, 150), rateLimit });
      }
    }

    // =========================================================
    // Multi-city
    // =========================================================
    const legsJson = searchParams.get('legs');
    const departDate = searchParams.get('departDate') || '';

    if (!legsJson || !departDate) {
      return NextResponse.json(
        { error: 'Missing required: legs, departDate' },
        { status: 400 }
      );
    }

    const inputLegs = JSON.parse(legsJson);
    if (!Array.isArray(inputLegs) || inputLegs.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 legs' }, { status: 400 });
    }

    // Calculate departure dates for outbound journey
    const outDates = [departDate];
    for (let i = 1; i < inputLegs.length; i++) {
      const stay = parseInt(inputLegs[i - 1].maxDays) || 0;
      outDates.push(addDaysToDate(outDates[i - 1], Math.max(1, stay)));
    }

    const retDates = [];
    if (tripType === 'roundtrip') {
      const lastStay = parseInt(inputLegs[inputLegs.length - 1].maxDays) || 7;
      let currentRetDate = addDaysToDate(outDates[outDates.length - 1], Math.max(1, lastStay));
      
      // Calculate return dates in reverse order
      const revRetDates = [currentRetDate];
      for (let i = inputLegs.length - 2; i >= 0; i--) {
        const stay = parseInt(inputLegs[i].maxDays) || 0;
        currentRetDate = addDaysToDate(currentRetDate, Math.max(1, stay));
        revRetDates.push(currentRetDate);
      }
      retDates.push(...revRetDates.reverse());
    }

    console.log('[Multi] Out dates:', outDates, 'Ret dates:', retDates);

    // Fetch tickets for each input leg
    const ticketResults: Combination[][] = [];
    let lastRl = null;

    for (let i = 0; i < inputLegs.length; i++) {
      const leg = inputLegs[i];
      const originCode = expandLocation(leg.origin, 1)[0] || leg.origin;
      const destCode = expandLocation(leg.dest, 1)[0] || leg.dest;
      
      if (i > 0) await delay(1000);
      try {
        let resCombs: Combination[] = [];
        if (provider === 'serpapi') {
          if (tripType === 'roundtrip') {
            const res = await searchRoundTripSerp({
              origin: originCode, destination: destCode,
              date: outDates[i], return_date: retDates[i],
              adults: pax, cabin: leg.cabin, limit: 50, currency: 'TWD'
            });
            resCombs = res.combinations;
          } else {
            const res = await searchOneWaySerp({
              origin: originCode, destination: destCode,
              date: outDates[i], adults: pax, cabin: leg.cabin, limit: 50, currency: 'TWD'
            });
            resCombs = res.combinations;
          }
        } else {
          let res;
          if (tripType === 'roundtrip') {
            res = await searchRoundTrip({
              origin: originCode, destination: destCode,
              date: outDates[i], return_date: retDates[i],
              adults: pax, cabin: CABIN_MAP[leg.cabin] || 'economy', limit: 50, currency: 'TWD'
            });
          } else {
            res = await searchOneWay({
              origin: originCode, destination: destCode,
              date: outDates[i], adults: pax, cabin: CABIN_MAP[leg.cabin] || 'economy', limit: 50, currency: 'TWD'
            });
          }
          resCombs = parseSkyscannerResponse(res.data);
          lastRl = res.rateLimit;
        }
        ticketResults.push(resCombs);
        const legMaxStops = leg.maxStops !== undefined && leg.maxStops !== 'any' ? parseInt(leg.maxStops) : null;
        if (legMaxStops !== null && !isNaN(legMaxStops)) {
          const lastIdx = ticketResults.length - 1;
          ticketResults[lastIdx] = ticketResults[lastIdx].filter(c =>
            c.legs.every(l => l.stops <= legMaxStops)
          );
        }


      } catch (err: any) {
        console.error(`Multi leg ${i} search failed:`, err.message);
        ticketResults.push([]);
      }
    }

    // Cartesian combination of all tickets
    let combinedTickets: Combination[][] = ticketResults[0].map(t => [t]);
    
    for (let i = 1; i < ticketResults.length; i++) {
      const nextCombined: Combination[][] = [];
      for (const existing of combinedTickets) {
        for (const newTicket of ticketResults[i]) {
          nextCombined.push([...existing, newTicket]);
        }
      }
      combinedTickets = nextCombined;
    }

    // Reassemble legs chronologically, validate connection times, and sum prices
    const finalCombinations: Combination[] = [];

    for (const tickets of combinedTickets) {
      let totalPrice = 0;
      let totalDurationMin = 0;
      const chronologicalLegs: ParsedLeg[] = [];

      // Add all outbound legs in order
      for (let i = 0; i < tickets.length; i++) {
        totalPrice += tickets[i].totalPrice;
        totalDurationMin += tickets[i].totalDurationMin;
        if (tickets[i].legs.length > 0) {
          chronologicalLegs.push(tickets[i].legs[0]); // Outbound is always first leg of the ticket
        }
      }

      // Add all return legs in reverse order
      if (tripType === 'roundtrip') {
        for (let i = tickets.length - 1; i >= 0; i--) {
          if (tickets[i].legs.length > 1) {
            chronologicalLegs.push(tickets[i].legs[1]); // Return is the second leg of the ticket
          }
        }
      }

      // Validate connection times between legs
      let isValidConnection = true;
      for (let i = 0; i < chronologicalLegs.length - 1; i++) {
        const currentLeg = chronologicalLegs[i];
        const nextLeg = chronologicalLegs[i + 1];

        // Only validate if it's a physical connection (arrival city/airport matches next departure)
        if (currentLeg.dest === nextLeg.origin) {
          const arrTime = new Date(currentLeg.arrivalTime).getTime();
          const depTime = new Date(nextLeg.departTime).getTime();

          if (isNaN(arrTime) || isNaN(depTime)) {
            isValidConnection = false;
            break;
          }

          const diffHours = (depTime - arrTime) / (1000 * 60 * 60);

          // Check if they are operated by different airlines (split comma-separated lists to check overlap)
          const airlines1 = currentLeg.airline.split(', ').map(a => a.trim().toLowerCase());
          const airlines2 = nextLeg.airline.split(', ').map(a => a.trim().toLowerCase());
          const hasCommonAirline = airlines1.some(a => airlines2.includes(a));
          const isDiffAirline = !hasCommonAirline;

          if (isDiffAirline) {
            // Different airlines: require at least 3 hours
            if (diffHours < 3.0) {
              console.log(`[API] Filtering out combination due to <3hr connection between different airlines (${currentLeg.airline} at ${currentLeg.dest} to ${nextLeg.airline} in ${diffHours.toFixed(2)} hours)`);
              isValidConnection = false;
              break;
            }
          } else {
            // Same airline: require at least 0 hours (departure after arrival)
            if (diffHours < 0.0) {
              console.log(`[API] Filtering out combination due to negative connection time on same airline (${currentLeg.airline} at ${currentLeg.dest} in ${diffHours.toFixed(2)} hours)`);
              isValidConnection = false;
              break;
            }
          }
        }
      }

      if (isValidConnection) {
        finalCombinations.push({
          id: `c-${Math.random().toString(36).substr(2, 9)}`,
          totalPrice,
          totalDurationMin,
          legs: chronologicalLegs
        });
      }
    }

    finalCombinations.sort((a, b) => a.totalPrice - b.totalPrice);
    
    return NextResponse.json({
      combinations: finalCombinations.slice(0, 150),
      rateLimit: lastRl
    });
  } catch (error: any) {
    console.error('[API] Fatal error:', error);
    return NextResponse.json(
      {
        error: error.message || 'An error occurred',
        combinations: [],
      },
      { status: 500 }
    );
  }
}
