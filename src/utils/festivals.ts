import {
  PartyPopper,
  Gift,
  Star,
  Heart,
  Sun,
  Moon,
  Flame,
  Leaf,
  Sparkles,
  CalendarDays,
} from 'lucide-react';

export interface FestiveEvent {
  id: string | number;
  name: string;
  date: string; // YYYY-MM-DD
  icon: any;
  color: string;
  category: 'indian' | 'global';
}

// ── Moving Festivals Data (2024-2030) ────────────────────────────────
const MOVING_FESTIVALS: Record<string, { dates: Record<number, string>; icon: any; color: string; category: 'indian' | 'global' }> = {
  'Holi': {
    dates: { 2024: '03-25', 2025: '03-14', 2026: '03-03', 2027: '03-22', 2028: '03-11', 2029: '03-30', 2030: '03-19' },
    icon: Sparkles, color: '#ec4899', category: 'indian'
  },
  'Raksha Bandhan': {
    dates: { 2024: '08-19', 2025: '08-09', 2026: '08-28', 2027: '08-17', 2028: '08-05', 2029: '08-25', 2030: '08-14' },
    icon: Heart, color: '#ec4899', category: 'indian'
  },
  'Janmashtami': {
    dates: { 2024: '08-26', 2025: '08-16', 2026: '09-04', 2027: '08-24', 2028: '09-12', 2029: '09-01', 2030: '08-20' },
    icon: PartyPopper, color: '#8b5cf6', category: 'indian'
  },
  'Ganesh Chaturthi': {
    dates: { 2024: '09-07', 2025: '08-27', 2026: '09-15', 2027: '09-04', 2028: '09-22', 2029: '09-11', 2030: '08-31' },
    icon: PartyPopper, color: '#ef4444', category: 'indian'
  },
  'Dussehra': {
    dates: { 2024: '10-12', 2025: '10-02', 2026: '10-20', 2027: '10-09', 2028: '10-28', 2029: '10-17', 2030: '10-06' },
    icon: Flame, color: '#dc2626', category: 'indian'
  },
  'Diwali': {
    dates: { 2024: '11-01', 2025: '10-21', 2026: '11-01', 2027: '10-29', 2028: '10-17', 2029: '11-05', 2030: '10-26' },
    icon: Sparkles, color: '#f59e0b', category: 'indian'
  },
  'Eid ul-Fitr': {
    dates: { 2024: '04-10', 2025: '03-30', 2026: '03-20', 2027: '03-09', 2028: '02-26', 2029: '02-16', 2030: '02-05' },
    icon: Moon, color: '#14b8a6', category: 'indian'
  },
  'Eid ul-Adha': {
    dates: { 2024: '06-17', 2025: '06-07', 2026: '05-27', 2027: '05-17', 2028: '05-05', 2029: '04-24', 2030: '04-14' },
    icon: Moon, color: '#14b8a6', category: 'indian'
  },
  'Easter': {
    dates: { 2024: '03-31', 2025: '04-20', 2026: '04-05', 2027: '03-28', 2028: '04-16', 2029: '04-01', 2030: '04-21' },
    icon: Gift, color: '#06b6d4', category: 'global'
  },
  'Ugadi / Gudi Padwa': {
    dates: { 2024: '04-09', 2025: '03-30', 2026: '03-19', 2027: '04-07', 2028: '03-27', 2029: '03-16', 2030: '04-04' },
    icon: Moon, color: '#f97316', category: 'indian'
  },
  'Ram Navami': {
    dates: { 2024: '04-17', 2025: '04-06', 2026: '03-28', 2027: '04-14', 2028: '04-03', 2029: '04-22', 2030: '04-11' },
    icon: Sun, color: '#eab308', category: 'indian'
  },
  'Buddha Purnima': {
    dates: { 2024: '05-23', 2025: '05-12', 2026: '06-01', 2027: '05-20', 2028: '05-08', 2029: '05-27', 2030: '05-17' },
    icon: Sun, color: '#eab308', category: 'indian'
  },
  'Guru Nanak Jayanti': {
    dates: { 2024: '11-15', 2025: '11-05', 2026: '11-24', 2027: '11-14', 2028: '11-02', 2029: '11-21', 2030: '11-10' },
    icon: Sun, color: '#eab308', category: 'indian'
  },
};

// ── Rule-based Festivals (e.g. 2nd Sunday of May) ─────────────────────
function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, n: number): Date {
  const date = new Date(year, month, 1);
  let count = 0;
  while (date.getMonth() === month) {
    if (date.getDay() === dayOfWeek) {
      count++;
      if (count === n) return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }
  return new Date(year, month, date.getDate() - 7); // Fallback to last one if n not reached
}

// ── Fixed Date Festivals ─────────────────────────────────────────────
const FIXED_FESTIVALS = [
  { name: 'New Year', mmdd: '01-01', icon: PartyPopper, color: '#6366f1', category: 'global' },
  { name: 'Makar Sankranti', mmdd: '01-14', icon: Sun, color: '#f59e0b', category: 'indian' },
  { name: 'Pongal', mmdd: '01-15', icon: Sun, color: '#f59e0b', category: 'indian' },
  { name: 'Republic Day', mmdd: '01-26', icon: Star, color: '#10b981', category: 'indian' },
  { name: "Valentine's Day", mmdd: '02-14', icon: Heart, color: '#ef4444', category: 'global' },
  { name: "Women's Day", mmdd: '03-08', icon: Heart, color: '#a855f7', category: 'global' },
  { name: 'Baisakhi', mmdd: '04-13', icon: Leaf, color: '#22c55e', category: 'indian' },
  { name: 'Earth Day', mmdd: '04-22', icon: Leaf, color: '#16a34a', category: 'global' },
  { name: 'World Environment Day', mmdd: '06-05', icon: Leaf, color: '#16a34a', category: 'global' },
  { name: 'Yoga Day', mmdd: '06-21', icon: Leaf, color: '#10b981', category: 'global' },
  { name: 'Independence Day', mmdd: '08-15', icon: Star, color: '#f97316', category: 'indian' },
  { name: "Teachers' Day", mmdd: '09-05', icon: Star, color: '#6366f1', category: 'indian' },
  { name: 'Gandhi Jayanti', mmdd: '10-02', icon: Star, color: '#10b981', category: 'indian' },
  { name: 'Halloween', mmdd: '10-31', icon: Moon, color: '#7c3aed', category: 'global' },
  { name: "Children's Day", mmdd: '11-14', icon: Gift, color: '#06b6d4', category: 'indian' },
  { name: 'Christmas', mmdd: '12-25', icon: Gift, color: '#ef4444', category: 'global' },
  { name: 'New Year Eve', mmdd: '12-31', icon: PartyPopper, color: '#6366f1', category: 'global' },
];

export function getFestiveEvents(year: number): FestiveEvent[] {
  const events: FestiveEvent[] = [];
  let idCounter = 1;

  // 1. Add Fixed Festivals
  FIXED_FESTIVALS.forEach(f => {
    events.push({
      id: `${year}-${idCounter++}`,
      name: f.name,
      date: `${year}-${f.mmdd}`,
      icon: f.icon,
      color: f.color,
      category: f.category as 'indian' | 'global'
    });
  });

  // 2. Add Moving Festivals
  Object.entries(MOVING_FESTIVALS).forEach(([name, data]) => {
    const mmdd = data.dates[year];
    if (mmdd) {
      events.push({
        id: `${year}-${idCounter++}`,
        name,
        date: `${year}-${mmdd}`,
        icon: data.icon,
        color: data.color,
        category: data.category
      });
    }
  });

  // 3. Add Rule-based Festivals
  // Mother's Day: 2nd Sunday of May (Month 4)
  const mothersDay = getNthDayOfMonth(year, 4, 0, 2);
  events.push({
    id: `${year}-${idCounter++}`,
    name: "Mother's Day",
    date: mothersDay.toISOString().split('T')[0],
    icon: Heart,
    color: '#f43f5e',
    category: 'global'
  });

  // Father's Day: 3rd Sunday of June (Month 5)
  const fathersDay = getNthDayOfMonth(year, 5, 0, 3);
  events.push({
    id: `${year}-${idCounter++}`,
    name: "Father's Day",
    date: fathersDay.toISOString().split('T')[0],
    icon: Star,
    color: '#3b82f6',
    category: 'global'
  });

  // Thanksgiving: 4th Thursday of Nov (Month 10)
  const thanksgiving = getNthDayOfMonth(year, 10, 4, 4);
  events.push({
    id: `${year}-${idCounter++}`,
    name: 'Thanksgiving',
    date: thanksgiving.toISOString().split('T')[0],
    icon: Leaf,
    color: '#f97316',
    category: 'global'
  });

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMergedFestiveEvents(year: number): Promise<FestiveEvent[]> {
  const localEvents = getFestiveEvents(year);

  try {
    const response = await fetch(`/api/calendar/holidays?year=${year}`);
    if (!response.ok) return localEvents;

    const googleHolidays = await response.json();

    // Create a set of local names for quick lookup
    const localNames = new Set(localEvents.map(e => e.name.toLowerCase()));

    const merged = [...localEvents];

    googleHolidays.forEach((gh: any) => {
      // If the google holiday isn't already in our local list, add it
      if (!localNames.has(gh.name.toLowerCase())) {
        merged.push({
          id: `google-${gh.id}`,
          name: gh.name,
          date: gh.date,
          icon: CalendarDays, // Default icon for unknown google events
          color: '#64748b',   // Default color
          category: 'indian'
        });
      }
    });

    return merged.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Failed to merge Google holidays:', error);
    return localEvents;
  }
}
