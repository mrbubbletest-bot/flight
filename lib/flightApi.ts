// Skyscanner Flight API Integration
// This module provides functions to call Skyscanner's RapidAPI endpoints for seat classes, trip types, and flight searches.

// --- Location → Airport code expansion ---
const LOCATION_AIRPORTS: Record<string, string[]> = {
  // Countries
  TW: ["TPE", "TSA", "KHH", "RMQ", "TNN"],
  "TAIWAN": ["TPE", "TSA", "KHH", "RMQ", "TNN"],
  "台灣": ["TPE", "TSA", "KHH", "RMQ", "TNN"],
  "臺灣": ["TPE", "TSA", "KHH", "RMQ", "TNN"],

  JP: ["NRT", "HND", "KIX", "CTS", "FUK", "NGO", "OKA"],
  "JAPAN": ["NRT", "HND", "KIX", "CTS", "FUK", "NGO", "OKA"],
  "日本": ["NRT", "HND", "KIX", "CTS", "FUK", "NGO", "OKA"],

  TH: ["BKK", "DMK", "HKT", "CNX", "USM"],
  "THAILAND": ["BKK", "DMK", "HKT", "CNX", "USM"],
  "泰國": ["BKK", "DMK", "HKT", "CNX", "USM"],

  US: ["JFK", "EWR", "LGA", "LAX", "SFO", "ORD", "SEA", "LAS"],
  "USA": ["JFK", "EWR", "LGA", "LAX", "SFO", "ORD", "SEA", "LAS"],
  "美國": ["JFK", "EWR", "LGA", "LAX", "SFO", "ORD", "SEA", "LAS"],

  UK: ["LHR", "LGW", "STN", "LTN", "LCY", "MAN"],
  "UNITED KINGDOM": ["LHR", "LGW", "STN", "LTN", "LCY", "MAN"],
  "英國": ["LHR", "LGW", "STN", "LTN", "LCY", "MAN"],

  KR: ["ICN", "GMP", "CJU", "PUS"],
  "KOREA": ["ICN", "GMP", "CJU", "PUS"],
  "韓國": ["ICN", "GMP", "CJU", "PUS"],
  "南韓": ["ICN", "GMP", "CJU", "PUS"],

  MY: ["KUL", "SZB", "PEN", "BKI"],
  "MALAYSIA": ["KUL", "SZB", "PEN", "BKI"],
  "馬來西亞": ["KUL", "SZB", "PEN", "BKI"],

  SG: ["SIN"],
  "SINGAPORE": ["SIN"],
  "新加坡": ["SIN"],

  HK: ["HKG"],
  "HONG KONG": ["HKG"],
  "香港": ["HKG"],

  VN: ["SGN", "HAN", "DAD", "CXR"],
  "VIETNAM": ["SGN", "HAN", "DAD", "CXR"],
  "越南": ["SGN", "HAN", "DAD", "CXR"],

  PH: ["MNL", "CEB", "KLO"],
  "PHILIPPINES": ["MNL", "CEB", "KLO"],
  "菲律賓": ["MNL", "CEB", "KLO"],

  AU: ["SYD", "MEL", "BNE", "PER", "ADL"],
  "AUSTRALIA": ["SYD", "MEL", "BNE", "PER", "ADL"],
  "澳洲": ["SYD", "MEL", "BNE", "PER", "ADL"],
  "澳大利亞": ["SYD", "MEL", "BNE", "PER", "ADL"],

  // Cities (Code, English, Chinese)
  "TPE": ["TPE", "TSA"],
  "TAIPEI": ["TPE", "TSA"],
  "台北": ["TPE", "TSA"],
  "臺北": ["TPE", "TSA"],

  "TYO": ["NRT", "HND"],
  "TOKYO": ["NRT", "HND"],
  "東京": ["NRT", "HND"],

  "OSA": ["KIX", "ITM", "UKB"],
  "OSAKA": ["KIX", "ITM", "UKB"],
  "大阪": ["KIX", "ITM", "UKB"],

  "BKK": ["BKK", "DMK"],
  "BANGKOK": ["BKK", "DMK"],
  "曼谷": ["BKK", "DMK"],

  "NYC": ["JFK", "EWR", "LGA"],
  "NEW YORK": ["JFK", "EWR", "LGA"],
  "紐約": ["JFK", "EWR", "LGA"],

  "LON": ["LHR", "LGW", "STN", "LTN", "LCY"],
  "LONDON": ["LHR", "LGW", "STN", "LTN", "LCY"],
  "倫敦": ["LHR", "LGW", "STN", "LTN", "LCY"],

  "SEL": ["ICN", "GMP"],
  "SEOUL": ["ICN", "GMP"],
  "首爾": ["ICN", "GMP"],

  "PAR": ["CDG", "ORY", "BVA"],
  "PARIS": ["CDG", "ORY", "BVA"],
  "巴黎": ["CDG", "ORY", "BVA"],

  "BJS": ["PEK", "PKX"],
  "BEIJING": ["PEK", "PKX"],
  "北京": ["PEK", "PKX"],

  "SHA": ["PVG", "SHA"],
  "SHANGHAI": ["PVG", "SHA"],
  "上海": ["PVG", "SHA"],

  "KUL": ["KUL", "SZB"],
  "KUALA LUMPUR": ["KUL", "SZB"],
  "吉隆坡": ["KUL", "SZB"],

  // Top 50 Busiest Airports Additions & Aliases
  "ATL": ["ATL"], "ATLANTA": ["ATL"], "亞特蘭大": ["ATL"],
  "DXB": ["DXB", "DWC"], "DUBAI": ["DXB", "DWC"], "杜拜": ["DXB", "DWC"],
  "ORD": ["ORD", "MDW"], "CHICAGO": ["ORD", "MDW"], "芝加哥": ["ORD", "MDW"],
  "DFW": ["DFW", "DAL"], "DALLAS": ["DFW", "DAL"], "達拉斯": ["DFW", "DAL"],
  "CAN": ["CAN"], "GUANGZHOU": ["CAN"], "廣州": ["CAN"],
  "AMS": ["AMS"], "AMSTERDAM": ["AMS"], "阿姆斯特丹": ["AMS"],
  "FRA": ["FRA"], "FRANKFURT": ["FRA"], "法蘭克福": ["FRA"],
  "IST": ["IST", "SAW"], "ISTANBUL": ["IST", "SAW"], "伊斯坦堡": ["IST", "SAW"],
  "DEL": ["DEL"], "NEW DELHI": ["DEL"], "新德里": ["DEL"],
  "CGK": ["CGK", "HLP"], "JAKARTA": ["CGK", "HLP"], "雅加達": ["CGK", "HLP"],
  "DEN": ["DEN"], "DENVER": ["DEN"], "丹佛": ["DEN"],
  "MAD": ["MAD"], "MADRID": ["MAD"], "馬德里": ["MAD"],
  "SFO": ["SFO", "OAK", "SJC"], "SAN FRANCISCO": ["SFO", "OAK", "SJC"], "舊金山": ["SFO", "OAK", "SJC"],
  "CTU": ["CTU", "TFU"], "CHENGDU": ["CTU", "TFU"], "成都": ["CTU", "TFU"],
  "LAS": ["LAS"], "LAS VEGAS": ["LAS"], "拉斯維加斯": ["LAS"],
  "BCN": ["BCN"], "BARCELONA": ["BCN"], "巴塞隆納": ["BCN"],
  "BOM": ["BOM"], "MUMBAI": ["BOM"], "孟買": ["BOM"],
  "YYZ": ["YYZ", "YTZ"], "TORONTO": ["YYZ", "YTZ"], "多倫多": ["YYZ", "YTZ"],
  "SEA": ["SEA"], "SEATTLE": ["SEA"], "西雅圖": ["SEA"],
  "CLT": ["CLT"], "CHARLOTTE": ["CLT"], "夏洛特": ["CLT"],
  "MCO": ["MCO"], "ORLANDO": ["MCO"], "奧蘭多": ["MCO"],
  "MIA": ["MIA", "FLL"], "MIAMI": ["MIA", "FLL"], "邁阿密": ["MIA", "FLL"],
  "PHX": ["PHX"], "PHOENIX": ["PHX"], "鳳凰城": ["PHX"],
  "IAH": ["IAH", "HOU"], "HOUSTON": ["IAH", "HOU"], "休士頓": ["IAH", "HOU"],
  "SZX": ["SZX"], "SHENZHEN": ["SZX"], "深圳": ["SZX"],
  "MEX": ["MEX", "NLU"], "MEXICO CITY": ["MEX", "NLU"], "墨西哥城": ["MEX", "NLU"],
  "MUC": ["MUC"], "MUNICH": ["MUC"], "慕尼黑": ["MUC"],
  "FCO": ["FCO", "CIA"], "ROME": ["FCO", "CIA"], "羅馬": ["FCO", "CIA"],
  "KMG": ["KMG"], "KUNMING": ["KMG"], "昆明": ["KMG"],
  "SVO": ["SVO", "DME", "VKO"], "MOSCOW": ["SVO", "DME", "VKO"], "莫斯科": ["SVO", "DME", "VKO"],
  "CKG": ["CKG"], "CHONGQING": ["CKG"], "重慶": ["CKG"],
  "HGH": ["HGH"], "HANGZHOU": ["HGH"], "杭州": ["HGH"],
  "LAX": ["LAX"], "LOS ANGELES": ["LAX", "BUR", "ONT", "SNA"], "洛杉磯": ["LAX", "BUR", "ONT", "SNA"],
};

export function expandLocation(loc: string, maxAirports: number = 2): string[] {
  if (!loc) return [];
  const clean = loc.trim().toUpperCase();
  const airports = LOCATION_AIRPORTS[clean] ? LOCATION_AIRPORTS[clean] : [clean];
  // Cap the number of airports to avoid combinatorial explosion of API calls
  return airports.slice(0, maxAirports);
}

// Helper: delay between API calls to avoid 429 rate-limit
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- RapidAPI configuration ---
const SKYSCANNER_RAPIDAPI_HOST = 'skyscanner-flights4.p.rapidapi.com';
const SKYSCANNER_RAPIDAPI_KEY = '3b254fe3f8msh8a3f8f9644a62e3p18ebb3jsn02bf856339f6';

function rapidHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-rapidapi-host': SKYSCANNER_RAPIDAPI_HOST,
    'x-rapidapi-key': SKYSCANNER_RAPIDAPI_KEY,
  };
}

// --- Metadata endpoints ---
export async function fetchSeatClasses() {
  const url = `https://${SKYSCANNER_RAPIDAPI_HOST}/api/v1/meta/seat-classes`;
  const res = await fetch(url, { method: 'GET', headers: rapidHeaders() });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Skyscanner seat classes fetch failed: ${res.status} ${err}`);
  }
  return await res.json();
}

export async function fetchTripTypes() {
  const url = `https://${SKYSCANNER_RAPIDAPI_HOST}/api/v1/meta/trip-types`;
  const res = await fetch(url, { method: 'GET', headers: rapidHeaders() });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Skyscanner trip types fetch failed: ${res.status} ${err}`);
  }
  return await res.json();
}

// --- Flight search interfaces ---
export interface SkyscannerOneWayParams {
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD
  adults?: number;
  cabin?: string;
  limit?: number;
  market?: string;
  locale?: string;
  currency?: string;
}

export interface SkyscannerRoundTripParams extends SkyscannerOneWayParams {
  return_date: string; // YYYY-MM-DD
}

export interface SkyscannerMultiCitySegment {
  date: string;
  origin: string;
  destination: string;
}

export interface SkyscannerMultiCityParams {
  segments: SkyscannerMultiCitySegment[]; // at least 2
  adults?: number;
  cabin?: string;
  limit?: number;
  market?: string;
  locale?: string;
  currency?: string;
}

export interface SkyscannerApiResponse {
  data: any;
  rateLimit: {
    limit: string | null;
    remaining: string | null;
    reset: string | null;
  };
}

export function extractRateLimit(res: Response) {
  return {
    limit: res.headers.get("x-ratelimit-requests-limit"),
    remaining: res.headers.get("x-ratelimit-requests-remaining"),
    reset: res.headers.get("x-ratelimit-requests-reset"),
  };
}

// --- Flight search functions ---
export async function searchOneWay(params: SkyscannerOneWayParams): Promise<SkyscannerApiResponse> {
  const url = new URL(`https://${SKYSCANNER_RAPIDAPI_HOST}/api/v1/search`);
  url.searchParams.append('origin', params.origin);
  url.searchParams.append('destination', params.destination);
  url.searchParams.append('date', params.date);
  if (params.adults) url.searchParams.append('adults', String(params.adults));
  if (params.cabin) url.searchParams.append('cabin', params.cabin);
  if (params.limit) url.searchParams.append('limit', String(params.limit));
  if (params.market) url.searchParams.append('market', params.market);
  if (params.locale) url.searchParams.append('locale', params.locale);
  if (params.currency) url.searchParams.append('currency', params.currency);

  const res = await fetch(url.toString(), { method: 'GET', headers: rapidHeaders() });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Skyscanner one‑way search failed: ${res.status} ${err}`);
  }
  return { data: await res.json(), rateLimit: extractRateLimit(res) };
}

export async function searchRoundTrip(params: SkyscannerRoundTripParams): Promise<SkyscannerApiResponse> {
  const url = new URL(`https://${SKYSCANNER_RAPIDAPI_HOST}/api/v1/roundtrip`);
  url.searchParams.append('origin', params.origin);
  url.searchParams.append('destination', params.destination);
  url.searchParams.append('date', params.date);
  url.searchParams.append('return_date', params.return_date);
  if (params.adults) url.searchParams.append('adults', String(params.adults));
  if (params.cabin) url.searchParams.append('cabin', params.cabin);
  if (params.limit) url.searchParams.append('limit', String(params.limit));
  if (params.market) url.searchParams.append('market', params.market);
  if (params.locale) url.searchParams.append('locale', params.locale);
  if (params.currency) url.searchParams.append('currency', params.currency);

  const res = await fetch(url.toString(), { method: 'GET', headers: rapidHeaders() });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Skyscanner round‑trip search failed: ${res.status} ${err}`);
  }
  return { data: await res.json(), rateLimit: extractRateLimit(res) };
}

export async function searchMultiCity(body: SkyscannerMultiCityParams): Promise<SkyscannerApiResponse> {
  const url = `https://${SKYSCANNER_RAPIDAPI_HOST}/api/v1/multicity`;
  const res = await fetch(url, {
    method: 'POST',
    headers: rapidHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Skyscanner multi‑city search failed: ${res.status} ${err}`);
  }
  return { data: await res.json(), rateLimit: extractRateLimit(res) };
}

// --- Health check ---
export async function healthCheck() {
  const url = `https://${SKYSCANNER_RAPIDAPI_HOST}/health`;
  const res = await fetch(url, { method: 'GET', headers: rapidHeaders() });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Skyscanner health check failed: ${res.status} ${err}`);
  }
  return { data: await res.json(), rateLimit: extractRateLimit(res) };
}
