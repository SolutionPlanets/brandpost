'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Gift,
  Star,
  Heart,
  Sun,
  Moon,
  Flame,
  Leaf,
  Sparkles,
  Plus,
  CalendarDays,
} from 'lucide-react';
import styles from './Calendar.module.css';

// ── Festive events data ──────────────────────────────────────────────
const FESTIVE_EVENTS = [
  { id: 1, name: 'New Year', date: '2026-01-01', icon: PartyPopper, color: '#6366f1', category: 'global' },
  { id: 2, name: 'Makar Sankranti', date: '2026-01-14', icon: Sun, color: '#f59e0b', category: 'indian' },
  { id: 3, name: 'Pongal', date: '2026-01-15', icon: Sun, color: '#f59e0b', category: 'indian' },
  { id: 4, name: 'Republic Day', date: '2026-01-26', icon: Star, color: '#10b981', category: 'indian' },
  { id: 5, name: "Valentine's Day", date: '2026-02-14', icon: Heart, color: '#ef4444', category: 'global' },
  { id: 6, name: "Women's Day", date: '2026-03-08', icon: Heart, color: '#a855f7', category: 'global' },
  { id: 7, name: 'Holi', date: '2026-03-17', icon: Sparkles, color: '#ec4899', category: 'indian' },
  { id: 8, name: 'Ugadi / Gudi Padwa', date: '2026-03-19', icon: Moon, color: '#f97316', category: 'indian' },
  { id: 9, name: 'Ram Navami', date: '2026-03-28', icon: Sun, color: '#eab308', category: 'indian' },
  { id: 10, name: 'Eid ul-Fitr', date: '2026-04-01', icon: Moon, color: '#14b8a6', category: 'indian' },
  { id: 11, name: 'Easter', date: '2026-04-05', icon: Gift, color: '#06b6d4', category: 'global' },
  { id: 12, name: 'Baisakhi', date: '2026-04-13', icon: Leaf, color: '#22c55e', category: 'indian' },
  { id: 13, name: 'Earth Day', date: '2026-04-22', icon: Leaf, color: '#16a34a', category: 'global' },
  { id: 14, name: "Mother's Day", date: '2026-05-10', icon: Heart, color: '#f43f5e', category: 'global' },
  { id: 15, name: 'Buddha Purnima', date: '2026-05-12', icon: Sun, color: '#eab308', category: 'indian' },
  { id: 16, name: 'World Environment Day', date: '2026-06-05', icon: Leaf, color: '#16a34a', category: 'global' },
  { id: 17, name: 'Eid ul-Adha', date: '2026-06-07', icon: Moon, color: '#14b8a6', category: 'indian' },
  { id: 18, name: "Father's Day", date: '2026-06-21', icon: Star, color: '#3b82f6', category: 'global' },
  { id: 19, name: 'Yoga Day', date: '2026-06-21', icon: Leaf, color: '#10b981', category: 'global' },
  { id: 20, name: 'Independence Day', date: '2026-08-15', icon: Star, color: '#f97316', category: 'indian' },
  { id: 21, name: 'Raksha Bandhan', date: '2026-08-12', icon: Heart, color: '#ec4899', category: 'indian' },
  { id: 22, name: 'Janmashtami', date: '2026-08-22', icon: PartyPopper, color: '#8b5cf6', category: 'indian' },
  { id: 23, name: 'Onam', date: '2026-09-02', icon: Flame, color: '#f59e0b', category: 'indian' },
  { id: 24, name: "Teachers' Day", date: '2026-09-05', icon: Star, color: '#6366f1', category: 'indian' },
  { id: 25, name: 'Ganesh Chaturthi', date: '2026-09-07', icon: PartyPopper, color: '#ef4444', category: 'indian' },
  { id: 26, name: 'Navratri Begins', date: '2026-10-02', icon: Moon, color: '#e11d48', category: 'indian' },
  { id: 27, name: 'Gandhi Jayanti', date: '2026-10-02', icon: Star, color: '#10b981', category: 'indian' },
  { id: 28, name: 'Dussehra', date: '2026-10-11', icon: Flame, color: '#dc2626', category: 'indian' },
  { id: 29, name: 'Diwali', date: '2026-10-20', icon: Sparkles, color: '#f59e0b', category: 'indian' },
  { id: 30, name: 'Halloween', date: '2026-10-31', icon: Moon, color: '#7c3aed', category: 'global' },
  { id: 31, name: 'Guru Nanak Jayanti', date: '2026-11-08', icon: Sun, color: '#eab308', category: 'indian' },
  { id: 32, name: "Children's Day", date: '2026-11-14', icon: Gift, color: '#06b6d4', category: 'indian' },
  { id: 33, name: 'Thanksgiving', date: '2026-11-26', icon: Leaf, color: '#f97316', category: 'global' },
  { id: 34, name: 'Christmas', date: '2026-12-25', icon: Gift, color: '#ef4444', category: 'global' },
  { id: 35, name: 'New Year Eve', date: '2026-12-31', icon: PartyPopper, color: '#6366f1', category: 'global' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type FilterType = 'all' | 'indian' | 'global';

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function getEventsForDate(year: number, month: number, day: number) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return FESTIVE_EVENTS.filter((e) => e.date === dateStr);
}

function getEventsForMonth(year: number, month: number, filter: FilterType) {
  return FESTIVE_EVENTS.filter((e) => {
    const d = new Date(e.date);
    const matchMonth = d.getFullYear() === year && d.getMonth() === month;
    if (!matchMonth) return false;
    if (filter === 'all') return true;
    return e.category === filter;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState<FilterType>('all');

  const days = getMonthDays(currentYear, currentMonth);
  const monthEvents = getEventsForMonth(currentYear, currentMonth, filter);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Festive Calendar</h1>
          <p className={styles.subtitle}>Plan your content around 35+ occasions throughout the year.</p>
        </div>
      </header>

      <div className={styles.calendarLayout}>
        {/* Calendar Grid */}
        <div className={styles.calendarCard}>
          <div className={styles.calendarNav}>
            <button className={styles.navBtn} onClick={prevMonth}><ChevronLeft size={20} /></button>
            <div className={styles.monthLabel}>
              <h2>{MONTHS[currentMonth]} {currentYear}</h2>
              <button className={styles.todayBtn} onClick={goToToday}>Today</button>
            </div>
            <button className={styles.navBtn} onClick={nextMonth}><ChevronRight size={20} /></button>
          </div>

          <div className={styles.calendarGrid}>
            {DAYS.map((d) => (
              <div key={d} className={styles.dayHeader}>{d}</div>
            ))}
            {days.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className={styles.dayCell} />;
              const events = getEventsForDate(currentYear, currentMonth, day);
              return (
                <div key={day} className={`${styles.dayCell} ${styles.dayCellActive} ${isToday(day) ? styles.dayCellToday : ''}`}>
                  <span className={styles.dayNumber}>{day}</span>
                  {events.length > 0 && (
                    <div className={styles.dayEvents}>
                      {events.slice(0, 2).map((ev) => (
                        <div key={ev.id} className={styles.dayEventDot} style={{ backgroundColor: ev.color }} title={ev.name} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Events Sidebar */}
        <div className={styles.eventsSidebar}>
          <div className={styles.filterRow}>
            <CalendarDays size={18} className={styles.filterIcon} />
            <span className={styles.filterLabel}>Events in {MONTHS[currentMonth]}</span>
          </div>
          <div className={styles.filterTabs}>
            {(['all', 'indian', 'global'] as FilterType[]).map((f) => (
              <button
                key={f}
                className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'indian' ? '🇮🇳 Indian' : '🌍 Global'}
              </button>
            ))}
          </div>

          <div className={styles.eventsList}>
            {monthEvents.length === 0 ? (
              <div className={styles.noEvents}>
                <CalendarDays size={32} />
                <p>No events this month</p>
              </div>
            ) : (
              monthEvents.map((event) => {
                const EventIcon = event.icon;
                const eventDate = new Date(event.date);
                return (
                  <div key={event.id} className={styles.eventItem}>
                    <div className={styles.eventDate}>
                      <span className={styles.eventDay}>{eventDate.getDate()}</span>
                      <span className={styles.eventMonth}>{MONTHS[eventDate.getMonth()].substring(0, 3)}</span>
                    </div>
                    <div className={styles.eventIconWrap} style={{ backgroundColor: `${event.color}15`, color: event.color }}>
                      <EventIcon size={16} />
                    </div>
                    <div className={styles.eventInfo}>
                      <h4>{event.name}</h4>
                      <span className={styles.eventCategory}>{event.category}</span>
                    </div>
                    <Link
                      href={`/dashboard/composer?occasion=${encodeURIComponent(event.name)}&type=festive`}
                      className={styles.eventCreateBtn}
                    >
                      <Plus size={14} /> Create
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
