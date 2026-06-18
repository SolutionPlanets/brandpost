import { NextResponse } from 'next/server';
import { getGoogleHolidays } from '@/utils/googleCalendar';
import { getCustomEventsForYear } from '@/utils/customEvents';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

  const holidays = await getGoogleHolidays(year);
  const customEvents = getCustomEventsForYear(year);
  
  // Combine custom events first so they take priority in the frontend deduplication loop
  const combined = [...customEvents, ...holidays];
  
  // Return combined list sorted chronologically
  const sorted = combined.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(sorted);
}
