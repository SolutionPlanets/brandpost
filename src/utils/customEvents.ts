export interface CustomRecurringEvent {
  name: string;
  month: number; // 1-12
  day: number; // 1-31
  category: 'indian' | 'global';
  color: string;
}

export const CUSTOM_RECURRING_EVENTS: CustomRecurringEvent[] = [
  { name: 'National Girl Child Day', month: 1, day: 24, category: 'indian', color: '#ff69b4' },
  { name: "National Tourism Day (India)", month: 1, day: 25, category: 'indian', color: '#3b82f6' },
  { name: "National Voters' Day", month: 1, day: 25, category: 'indian', color: '#10b981' },
  { name: "International Women’s Day", month: 3, day: 8, category: 'global', color: '#ec4899' },
  { name: "World Water Day (Global)", month: 3, day: 22, category: 'global', color: '#0ea5e9' },
  { name: "Earth Day (Global)", month: 4, day: 22, category: 'global', color: '#10b981' },
  { name: "World No-Tobacco Day", month: 5, day: 31, category: 'global', color: '#64748b' },
  { name: "World Environment Day (Global)", month: 6, day: 5, category: 'global', color: '#16a34a' },
  { name: "International Day of Yoga", month: 6, day: 21, category: 'global', color: '#f59e0b' },
  { name: "National Doctor’s Day (India)", month: 7, day: 1, category: 'indian', color: '#ef4444' },
  { name: "Chartered Accountants Day", month: 7, day: 1, category: 'indian', color: '#3b82f6' },
  { name: "Kargil Vijay Diwas", month: 7, day: 26, category: 'indian', color: '#f97316' },
  { name: "Teacher’s Day", month: 9, day: 5, category: 'indian', color: '#8b5cf6' },
  { name: "Engineer’s Day", month: 9, day: 15, category: 'indian', color: '#4f46e5' },
  { name: "World Tourism Day (Global)", month: 9, day: 27, category: 'global', color: '#06b6d4' },
  { name: "World Teachers' Day (Global)", month: 10, day: 5, category: 'global', color: '#8b5cf6' },
  { name: "Karnataka Rajyotsava", month: 11, day: 1, category: 'indian', color: '#ef4444' },
  { name: "Haryana Day", month: 11, day: 1, category: 'indian', color: '#f59e0b' },
  { name: "Kerala Piravi (Regional Foundation Day)", month: 11, day: 1, category: 'indian', color: '#10b981' },
  { name: "Children’s Day (India)", month: 11, day: 14, category: 'indian', color: '#3b82f6' },
  { name: "World Diabetes Day", month: 11, day: 14, category: 'global', color: '#0ea5e9' },
  { name: "World AIDS Day (Global)", month: 12, day: 1, category: 'global', color: '#dc2626' },
  { name: "Kisan Diwas (National Farmers' Day - India)", month: 12, day: 23, category: 'indian', color: '#15803d' },
];

export function getCustomEventsForYear(year: number) {
  return CUSTOM_RECURRING_EVENTS.map((event, index) => {
    const monthStr = String(event.month).padStart(2, '0');
    const dayStr = String(event.day).padStart(2, '0');
    return {
      id: `custom-fixed-${index}-${year}`,
      name: event.name,
      date: `${year}-${monthStr}-${dayStr}`,
      category: event.category,
      source: 'Custom Fixed',
      color: event.color
    };
  });
}
