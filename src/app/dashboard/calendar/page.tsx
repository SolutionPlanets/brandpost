'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import styles from './Calendar.module.css';
import { getMergedFestiveEvents, type FestiveEvent } from '@/utils/festivals';

// ── Festive events data ──────────────────────────────────────────────
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

function getEventsForDate(events: FestiveEvent[], year: number, month: number, day: number) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return events.filter((e) => e.date === dateStr);
}

function getEventsForMonth(events: FestiveEvent[], year: number, month: number, filter: FilterType) {
  return events.filter((e) => {
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
  const [allEvents, setAllEvents] = useState<FestiveEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHolidays() {
      setIsLoading(true);
      try {
        const events = await getMergedFestiveEvents(currentYear);
        setAllEvents(events);
      } catch (error) {
        console.error('Failed to fetch holidays:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHolidays();
  }, [currentYear]);

  const days = getMonthDays(currentYear, currentMonth);
  const monthEvents = getEventsForMonth(allEvents, currentYear, currentMonth, filter);

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
              const events = getEventsForDate(allEvents, currentYear, currentMonth, day);
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
            {isLoading ? (
              <div className={styles.loadingState}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Fetching festive occasions...</p>
              </div>
            ) : monthEvents.length === 0 ? (
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
