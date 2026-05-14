import { google } from 'googleapis';

const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;

export async function getGoogleHolidays(year: number) {
  try {
    if (!API_KEY) {
      console.warn('Google Calendar API Key not found.');
      return [];
    }

    const calendar = google.calendar({ version: 'v3', auth: API_KEY });
    const timeMin = `${year}-01-01T00:00:00Z`;
    const timeMax = `${year}-12-31T23:59:59Z`;

    const response = await calendar.events.list({
      calendarId: 'en.indian#holiday@group.v.calendar.google.com',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (response.data.items || []).map((event: any) => ({
      id: event.id,
      name: event.summary,
      date: event.start.date || event.start.dateTime.split('T')[0],
      description: event.description || '',
      category: 'indian' as const,
    }));
  } catch (error: any) {
    console.error('Error fetching Google Holidays:', error.message);
    return [];
  }
}
