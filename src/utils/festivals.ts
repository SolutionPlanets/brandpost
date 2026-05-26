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
  source?: string;
}

// ── Icon & Color Library (For Styling Only) ─────────────────────────
const EVENT_STYLE_LIBRARY: Record<string, { icon: any; color: string }> = {
  'holi': { icon: Sparkles, color: '#ec4899' },
  'raksha bandhan': { icon: Heart, color: '#ec4899' },
  'janmashtami': { icon: PartyPopper, color: '#8b5cf6' },
  'ganesh chaturthi': { icon: PartyPopper, color: '#ef4444' },
  'dussehra': { icon: Flame, color: '#dc2626' },
  'diwali': { icon: Sparkles, color: '#f59e0b' },
  'eid': { icon: Moon, color: '#14b8a6' },
  'christmas': { icon: Gift, color: '#ef4444' },
  'republic day': { icon: Star, color: '#10b981' },
  'independence day': { icon: Star, color: '#f97316' },
  'gandhi jayanti': { icon: Star, color: '#10b981' },
  'new year': { icon: PartyPopper, color: '#6366f1' },
  'shivratri': { icon: Moon, color: '#4f46e5' },
  'pongal': { icon: Sun, color: '#f59e0b' },
  'valentine': { icon: Heart, color: '#ef4444' },
};

function getEventStyle(name: string) {
  const lower = name.toLowerCase();
  for (const [key, style] of Object.entries(EVENT_STYLE_LIBRARY)) {
    if (lower.includes(key)) return style;
  }
  return { icon: CalendarDays, color: '#64748b' };
}

export function getFestiveEvents(year: number): FestiveEvent[] {
  return [];
}

export async function getMergedFestiveEvents(year: number): Promise<FestiveEvent[]> {
  try {
    const response = await fetch(`/api/calendar/holidays?year=${year}`);
    if (!response.ok) return [];

    const externalEvents = await response.json();
    
    const byDate: Record<string, any[]> = {};
    externalEvents.forEach((e: any) => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

    const finalMerged: FestiveEvent[] = [];

    for (const date in byDate) {
      const dayEvents = byDate[date];
      const mergedDayEvents: FestiveEvent[] = [];

      dayEvents.forEach(event => {
        const normalize = (name: string) => name.toLowerCase()
          .replace(/holiday|public|gazetted|observance|mahatma|'s|festival/g, '')
          .replace(/shivaratri/g, 'shivratri')
          .replace(/deepavali/g, 'diwali')
          .replace(/[^a-z0-9]/g, '')
          .trim();

        const normalizedCurrent = normalize(event.name);

        const isDuplicate = mergedDayEvents.some(existing => {
          const normalizedExisting = normalize(existing.name);
          return normalizedExisting.includes(normalizedCurrent) || normalizedCurrent.includes(normalizedExisting);
        });

        if (!isDuplicate) {
          const style = getEventStyle(event.name);
          mergedDayEvents.push({
            id: event.id,
            name: event.name,
            date: event.date,
            icon: style.icon,
            color: event.color || style.color, // Use source color if available
            category: event.category || 'indian',
            source: event.source // Include the source from API
          });
        }
      });
      finalMerged.push(...mergedDayEvents);
    }

    return finalMerged.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error: any) {
    console.error('Failed to fetch holidays:', error.message);
    return [];
  }
}
