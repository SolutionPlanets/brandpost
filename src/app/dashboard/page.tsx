'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import {
  Plus,
  Sparkles,
  CalendarDays,
  TrendingUp,
  Users,
  Facebook,
  Instagram,
  MessageSquare,
  Image as ImageIcon,
  MoreHorizontal,
  PartyPopper,
  Gift,
  Star,
  Heart,
  Sun,
  Moon,
  Flame,
  Leaf,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import styles from './DashboardHome.module.css';

// ── Festive Calendar Data (30+ annual events) ────────────────────────
const FESTIVE_EVENTS = [
  { id: 1, name: 'New Year', date: '2026-01-01', icon: PartyPopper, color: '#6366f1' },
  { id: 2, name: 'Makar Sankranti', date: '2026-01-14', icon: Sun, color: '#f59e0b' },
  { id: 3, name: 'Republic Day', date: '2026-01-26', icon: Star, color: '#10b981' },
  { id: 4, name: "Valentine's Day", date: '2026-02-14', icon: Heart, color: '#ef4444' },
  { id: 5, name: 'Holi', date: '2026-03-17', icon: Sparkles, color: '#ec4899' },
  { id: 6, name: "Women's Day", date: '2026-03-08', icon: Heart, color: '#a855f7' },
  { id: 7, name: 'Ugadi / Gudi Padwa', date: '2026-03-19', icon: Moon, color: '#f97316' },
  { id: 8, name: 'Ram Navami', date: '2026-03-28', icon: Sun, color: '#eab308' },
  { id: 9, name: 'Easter', date: '2026-04-05', icon: Gift, color: '#06b6d4' },
  { id: 10, name: 'Baisakhi', date: '2026-04-13', icon: Leaf, color: '#22c55e' },
  { id: 11, name: 'Eid ul-Fitr', date: '2026-04-01', icon: Moon, color: '#14b8a6' },
  { id: 12, name: "Mother's Day", date: '2026-05-10', icon: Heart, color: '#f43f5e' },
  { id: 13, name: 'Buddha Purnima', date: '2026-05-12', icon: Sun, color: '#eab308' },
  { id: 14, name: "Father's Day", date: '2026-06-21', icon: Star, color: '#3b82f6' },
  { id: 15, name: 'Yoga Day', date: '2026-06-21', icon: Leaf, color: '#10b981' },
  { id: 16, name: 'Eid ul-Adha', date: '2026-06-07', icon: Moon, color: '#14b8a6' },
  { id: 17, name: 'Independence Day', date: '2026-08-15', icon: Star, color: '#f97316' },
  { id: 18, name: 'Raksha Bandhan', date: '2026-08-12', icon: Heart, color: '#ec4899' },
  { id: 19, name: 'Janmashtami', date: '2026-08-22', icon: PartyPopper, color: '#8b5cf6' },
  { id: 20, name: 'Ganesh Chaturthi', date: '2026-09-07', icon: PartyPopper, color: '#ef4444' },
  { id: 21, name: "Teachers' Day", date: '2026-09-05', icon: Star, color: '#6366f1' },
  { id: 22, name: 'Onam', date: '2026-09-02', icon: Flame, color: '#f59e0b' },
  { id: 23, name: 'Navratri Begins', date: '2026-10-02', icon: Moon, color: '#e11d48' },
  { id: 24, name: 'Dussehra', date: '2026-10-11', icon: Flame, color: '#dc2626' },
  { id: 25, name: 'Diwali', date: '2026-10-20', icon: Sparkles, color: '#f59e0b' },
  { id: 26, name: 'Halloween', date: '2026-10-31', icon: Moon, color: '#7c3aed' },
  { id: 27, name: 'Guru Nanak Jayanti', date: '2026-11-08', icon: Sun, color: '#eab308' },
  { id: 28, name: "Children's Day", date: '2026-11-14', icon: Gift, color: '#06b6d4' },
  { id: 29, name: 'Thanksgiving', date: '2026-11-26', icon: Leaf, color: '#f97316' },
  { id: 30, name: 'Christmas', date: '2026-12-25', icon: Gift, color: '#ef4444' },
  { id: 31, name: 'New Year Eve', date: '2026-12-31', icon: PartyPopper, color: '#6366f1' },
  { id: 32, name: 'Pongal', date: '2026-01-15', icon: Sun, color: '#f59e0b' },
  { id: 33, name: 'World Environment Day', date: '2026-06-05', icon: Leaf, color: '#16a34a' },
  { id: 34, name: 'Mahavir JanmaKalyanak', date: '2026-03-31', icon: Sun, color: '#f59e0b' },
];

// ── Mock recent posts ────────────────────────────────────────────────
const RECENT_POSTS = [
  { id: 1, title: 'Diwali Festival Sale – 20% Off!', platform: 'both', status: 'published', date: '2026-04-18', type: 'festive' },
  { id: 2, title: 'Brand Story: Our Journey So Far', platform: 'instagram', status: 'scheduled', date: '2026-04-20', type: 'informational' },
  { id: 3, title: 'Weekend Flash Offer – Limited Time', platform: 'facebook', status: 'draft', date: '2026-04-21', type: 'offer' },
  { id: 4, title: 'Team Appreciation Post', platform: 'both', status: 'published', date: '2026-04-15', type: 'general' },
  { id: 5, title: 'Earth Day – Go Green Campaign', platform: 'instagram', status: 'failed', date: '2026-04-22', type: 'festive' },
];

// ── Helper Functions ─────────────────────────────────────────────────
function getStatusStyle(status: string): string {
  switch (status) {
    case 'published': return styles.statusPublished;
    case 'scheduled': return styles.statusScheduled;
    case 'draft': return styles.statusDraft;
    case 'failed': return styles.statusFailed;
    default: return '';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function getUpcomingEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return FESTIVE_EVENTS
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  // Get today's date at midnight local time
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const targetDate = new Date(dateStr);
  // Get target's date at midnight local time
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// ── Component ────────────────────────────────────────────────────────
export default function DashboardHome() {
  const { fullName, ownerName, businessName, trialEndsAt, createdAt, planId, postsUsed, workspaceId } = useBrand();
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const usageLimit = 50; // Default base limit for solo
  const upcoming = getUpcomingEvents();
  useEffect(() => {
    const supabase = createClient();
    async function fetchDashboardData() {
      if (!workspaceId) return;
      try {
        // Fetch recent posts
        const { data: recent } = await supabase
          .from('posts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (recent) setRecentPosts(recent);

        // Fetch total count
        const { count } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);
        
        if (count !== null) setTotalPosts(count);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    }
    fetchDashboardData();
  }, [workspaceId, postsUsed]);

  const isTrial = planId === 'solo' && trialEndsAt && new Date(trialEndsAt) > new Date();
  const daysRemaining = trialEndsAt ? daysUntil(trialEndsAt) : 0;
  
  const trialStartDate = createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const trialEndDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const currentLimit = isTrial ? 100 : usageLimit;
  const currentUsagePercent = Math.min(Math.round((postsUsed / currentLimit) * 100), 100);

  const stats = [
    { label: 'Total Posts', value: totalPosts.toString(), icon: CalendarDays, color: '#4f46e5' },
    { label: 'Audience Reach', value: '0', icon: TrendingUp, color: '#10b981' },
    { label: 'Engagement', value: '0%', icon: Users, color: '#f59e0b' },
    { label: 'AI Credits Left', value: Math.max(0, currentLimit - postsUsed).toString(), icon: Sparkles, color: '#06b6d4' },
  ];

  return (
    <div className={styles.container}>
      {/* ── Header ──────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome back, {ownerName || fullName || 'User'}!</h1>
          <p className={styles.subtitle}>Here&apos;s what&apos;s happening with your brand today.</p>
        </div>
        <Link href="/dashboard/composer" className={styles.createBtn}>
          <Plus size={20} /> Create New Post
        </Link>
      </header>
 
      {/* ── Trial Banner (Conditional) ────────────────────── */}
      {isTrial && (
        <div className={styles.trialBanner}>
          <div className={styles.trialLeft}>
            <div className={styles.trialBadge}>14-Day Free Trial</div>
            <h2 className={styles.trialTitle}>Your Free Trial has Started!</h2>
            <p className={styles.trialDesc}>
              Experience the full power of BrandPost AI with our SMB plan features. 
              No credit card required during trial.
            </p>
            <div className={styles.trialFeatures}>
              <div className={styles.featureItem}><CheckCircle2 size={16} className={styles.featureIcon} /> 100 AI Posts</div>
              <div className={styles.featureItem}><CheckCircle2 size={16} className={styles.featureIcon} /> 3 Brand Kits</div>
              <div className={styles.featureItem}><CheckCircle2 size={16} className={styles.featureIcon} /> Priority AI</div>
            </div>
          </div>
 
          <div className={styles.trialRight}>
            <div className={styles.daysLeft}>
              {daysRemaining <= 0 ? 'Last' : daysRemaining} <span>{daysRemaining <= 0 ? 'day' : daysRemaining === 1 ? 'day left' : 'days left'}</span>
            </div>
            <div className={styles.trialDates}>
              <div>Trial Period</div>
              <div>{trialStartDate} - {trialEndDate}</div>
            </div>
            <Link href="/pricing?from=dashboard" className={styles.upgradeTrialBtn}>
              Upgrade Now
            </Link>
          </div>
        </div>
      )}

      {/* ── Stats Grid ──────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statInfo}>
              <span>{stat.label}</span>
              <span className={styles.statValue}>{stat.value}</span>
            </div>
            <div className={styles.statIcon} style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid (3 Widgets) ───────────────────────────── */}
      <div className={styles.widgetGrid}>

        {/* Widget 1: Upcoming Occasions */}
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <div className={styles.widgetTitleGroup}>
              <CalendarDays size={20} className={styles.widgetIcon} />
              <h2>Upcoming Occasions</h2>
            </div>
            <Link href="/dashboard/calendar" className={styles.viewAll}>
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className={styles.festiveList}>
            {upcoming.map((event) => {
              const days = daysUntil(event.date);
              const EventIcon = event.icon;
              return (
                <div key={event.id} className={styles.festiveItem}>
                  <div className={styles.festiveIconWrap} style={{ backgroundColor: `${event.color}15`, color: event.color }}>
                    <EventIcon size={18} />
                  </div>
                  <div className={styles.festiveInfo}>
                    <h4>{event.name}</h4>
                    <span className={styles.festiveDate}>
                      {formatDate(event.date)}
                      {days <= 7 && <span className={styles.soonBadge}>{days === 0 ? 'Today!' : `${days}d left`}</span>}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/composer?occasion=${encodeURIComponent(event.name)}&type=festive`}
                    className={styles.festiveCreateBtn}
                  >
                    Create post
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>

          {/* Widget 2: Usage Tracker */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <div className={styles.widgetTitleGroup}>
                <Sparkles size={20} className={styles.widgetIcon} />
                <h2>Usage Tracker</h2>
              </div>
              <span className={styles.planBadge}>{isTrial ? 'Trial (SMB)' : planId === 'solo' ? 'Solo Plan' : planId.toUpperCase() + ' Plan'}</span>
            </div>
            <div className={styles.usageContainer}>
              <div className={styles.usageHeader}>
                <span className={styles.usageLabel}>AI Posts Generated</span>
                <span className={styles.usageCount}>{postsUsed} <span>/ {currentLimit}</span></span>
              </div>
              <div className={styles.usageBarTrack}>
                <div
                  className={styles.usageBarFill}
                  style={{
                    width: `${currentUsagePercent}%`,
                    backgroundColor: currentUsagePercent > 80 ? '#ef4444' : currentUsagePercent > 60 ? '#f59e0b' : '#4f46e5',
                  }}
                />
              </div>
              <p className={styles.usageFooter}>
                {currentLimit - postsUsed} posts remaining this cycle. Resets on May 1, 2026.
              </p>
            </div>
          </div>

          {/* Widget 3: Recent Activity */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <div className={styles.widgetTitleGroup}>
                <MessageSquare size={20} className={styles.widgetIcon} />
                <h2>Recent Activity</h2>
              </div>
              <Link href="/dashboard/posts" className={styles.viewAll}>
                View All <ChevronRight size={16} />
              </Link>
            </div>
            <div className={styles.activityTable}>
              <div className={styles.tableHeader}>
                <span>Post</span>
                <span>Platform</span>
                <span>Status</span>
                <span>Date</span>
              </div>
              {recentPosts.length === 0 ? (
                <div className={styles.emptyActivity}>
                  <p>No recent activity found.</p>
                </div>
              ) : (
                recentPosts.map((post) => (
                  <div key={post.id} className={styles.tableRow}>
                    <div className={styles.postCell}>
                      <div className={styles.postThumb}>
                        {post.image_url ? (
                          <img src={post.image_url} alt="" className={styles.thumbImg} />
                        ) : (
                          <ImageIcon size={16} />
                        )}
                      </div>
                      <span className={styles.postTitle}>{post.title}</span>
                    </div>
                    <div className={styles.platformCell}>
                      {(post.platform === 'facebook' || post.platform === 'both') && <Facebook size={16} className={styles.fbIcon} />}
                      {(post.platform === 'instagram' || post.platform === 'both') && <Instagram size={16} className={styles.igIcon} />}
                    </div>
                    <div>
                      <span className={`${styles.statusBadge} ${getStatusStyle(post.status)}`}>
                        {post.status}
                      </span>
                    </div>
                    <span className={styles.dateCell}>{formatDate(post.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
