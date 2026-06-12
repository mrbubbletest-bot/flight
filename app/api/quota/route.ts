import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/flightApi';

export async function GET() {
  let rapidApiQuota = 'Unknown';
  let serpApiQuota = 'Unknown';

  try {
    const res = await healthCheck();
    if (res.rateLimit && res.rateLimit.remaining !== null && res.rateLimit.remaining !== undefined) {
      rapidApiQuota = res.rateLimit.remaining;
    }
  } catch (err) {
    console.error('Failed to fetch RapidAPI quota', err);
  }

  try {
    const serpApiKey = process.env.SERPAPI_KEY || '';
    if (serpApiKey) {
      const res = await fetch(`https://serpapi.com/account.json?api_key=${serpApiKey}`);
      if (res.ok) {
        const data = await res.json();
        // SerpAPI returns plan_searches_left usually
        serpApiQuota = String(data.plan_searches_left ?? data.total_searches_left ?? 'Unknown');
      }
    } else {
      serpApiQuota = 'No API Key';
    }
  } catch (err) {
    console.error('Failed to fetch SerpAPI quota', err);
  }

  return NextResponse.json({
    rapidapi: rapidApiQuota,
    serpapi: serpApiQuota
  });
}
