import { google } from 'googleapis';

const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;

export async function getGoogleHolidays(year: number) {
  try {
    const allHolidays: any[] = [];
    const GOOGLE_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
    const CAL_API_KEY = process.env.CALENDARIFIC_API_KEY;

    // 1. Fetch from Google Calendar Public
    if (GOOGLE_API_KEY) {
      const calendarIds = [
        'en.indian#holiday@group.v.calendar.google.com',
        'p#holiday@group.v.calendar.google.com'
      ];
      const calendar = google.calendar({ version: 'v3', auth: GOOGLE_API_KEY });
      const timeMin = `${year}-01-01T00:00:00Z`;
      const timeMax = `${year}-12-31T23:59:59Z`;

      for (const calendarId of calendarIds) {
        try {
          const response = await calendar.events.list({
            calendarId,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
          });

          const googleHolidays = (response.data.items || []).map((event: any) => ({
            id: `google-${event.id}`,
            name: event.summary,
            date: event.start.date || event.start.dateTime.split('T')[0],
            category: 'indian' as const,
            source: 'Google',
            color: '#4285F4'
          }));
          allHolidays.push(...googleHolidays);
        } catch (gErr: any) {
          console.error(`Error fetching Google calendar ${calendarId}:`, gErr.message);
        }
      }
    }

    // 2. Fetch from Calendarific
    if (CAL_API_KEY) {
      try {
        const calResponse = await fetch(`https://calendarific.com/api/v2/holidays?api_key=${CAL_API_KEY}&country=IN&year=${year}`);
        if (calResponse.ok) {
          const calData = await calResponse.json();
          const calHolidays = (calData.response?.holidays || []).map((h: any) => ({
            id: `cal-${h.name}-${h.date.iso}`,
            name: h.name,
            date: h.date.iso.split('T')[0], // Ensure YYYY-MM-DD
            category: 'indian' as const,
            source: 'Calendarific',
            color: '#10b981'
          }));
          allHolidays.push(...calHolidays);
        }
      } catch (cErr: any) {
        console.error('Error fetching Calendarific Holidays:', cErr.message);
      }
    }

    // 3. Smart Deduplication
    const uniqueHolidays: any[] = [];
    
    // Group by date first
    const byDate: Record<string, any[]> = {};
    allHolidays.forEach(h => {
      if (!byDate[h.date]) byDate[h.date] = [];
      byDate[h.date].push(h);
    });

    for (const date in byDate) {
      const dayEvents = byDate[date];
      const mergedDayEvents: any[] = [];

      dayEvents.forEach(event => {
        const normalizedCurrent = event.name.toLowerCase()
          .replace(/holiday|public|gazetted|observance/g, '')
          .trim();

        const isDuplicate = mergedDayEvents.some(existing => {
          const normalizedExisting = existing.name.toLowerCase()
            .replace(/holiday|public|gazetted|observance/g, '')
            .trim();
          
          return normalizedExisting.includes(normalizedCurrent) || normalizedCurrent.includes(normalizedExisting);
        });

        if (!isDuplicate) {
          mergedDayEvents.push(event);
        }
      });
      uniqueHolidays.push(...mergedDayEvents);
    }

    return uniqueHolidays.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error: any) {
    console.error('Fatal error fetching holidays:', error.message);
    return [];
  }
}
