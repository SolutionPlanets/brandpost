import { NextResponse } from 'next/server';
import { getGoogleHolidays } from '@/utils/googleCalendar';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

  const holidays = await getGoogleHolidays(year);
  return NextResponse.json(holidays);
}
