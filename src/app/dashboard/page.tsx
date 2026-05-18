'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

// ── Festive Calendar Data (30+ annual events) ─────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(dateStr);
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

import { getMergedFestiveEvents, type FestiveEvent } from '@/utils/festivals';

// ── Component ────────────────────────────────────────────────────────
export default function DashboardHome() {
  const { fullName, ownerName, businessName, trialEndsAt, createdAt, planId, postsUsed, workspaceId, checkLimitAndRedirect, currentLimit } = useBrand();
  const router = useRouter();
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [upcoming, setUpcoming] = useState<FestiveEvent[]>([]);

  const handleCreateClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    if (!checkLimitAndRedirect()) {
      router.push(url);
    }
  };

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

        // Fetch upcoming events from dynamic source
        const year = new Date().getFullYear();
        const allFestivals = await getMergedFestiveEvents(year);
        const today = new Date();
        today.setHours(0,0,0,0);
        const soon = allFestivals
          .filter(e => new Date(e.date) >= today)
          .slice(0, 5);
        setUpcoming(soon);

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

  const currentUsagePercent = Math.min(Math.round((postsUsed / currentLimit) * 100), 100);

  const getStatusStyle = (status: string): string => {
    switch (status) {
      case 'published': return styles.statusPublished;
      case 'scheduled': return styles.statusScheduled;
      case 'draft': return styles.statusDraft;
      case 'failed': return styles.statusFailed;
      default: return '';
    }
  };

  // Calculate next reset date based on created_at
  const getNextResetDate = (dateStr: string | null) => {
    if (!dateStr) return 'Next month';
    const created = new Date(dateStr);
    const now = new Date();
    const day = created.getDate();
    
    // Create a date for the reset day in the current month
    let reset = new Date(now.getFullYear(), now.getMonth(), day);
    
    // If we've already passed the reset day this month, move to next month
    if (now >= reset) {
      reset.setMonth(reset.getMonth() + 1);
    }
    
    return reset.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const stats = [
    { label: 'Total Posts', value: totalPosts.toString(), icon: CalendarDays, color: '#4f46e5' },
    { label: 'Audience Reach', value: '0', icon: TrendingUp, color: '#10b981' },
    { label: 'Engagement', value: '0%', icon: Users, color: '#f59e0b' },
    { label: 'AI Credits Left', value: currentLimit >= 10000 ? '∞' : Math.max(0, currentLimit - postsUsed).toString(), icon: Sparkles, color: '#06b6d4' },
  ];

  return (
    <div className={styles.container}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome back, {ownerName || fullName || 'User'}!</h1>
          <p className={styles.subtitle}>Here&apos;s what&apos;s happening with your brand today.</p>
        </div>
        <button onClick={(e) => handleCreateClick(e, '/dashboard/composer')} className={styles.createBtn}>
          <Plus size={20} /> Create New Post
        </button>
      </header>
 
      {/* ── Trial Banner (Conditional) ────────────────────────────────────── */}
      {isTrial && (
        <div className={styles.trialBanner}>
          <div className={styles.trialLeft}>
            <div className={styles.trialBadge}>14-Day Free Trial</div>
            <h2 className={styles.trialTitle}>Your Free Trial has Started!</h2>
            <p className={styles.trialDesc}>
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
 
      {/* ── Stats Grid ────────────────────────────────────────────────────── */}
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
 
      {/* ── Main Grid (3 Widgets) ─────────────────────────────────────────── */}
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
                    <div className={styles.festiveNameRow}>
                      <h4>{event.name}</h4>
                    </div>
                    <span className={styles.festiveDate}>
                      {formatDate(event.date)}
                      {days <= 7 && <span className={styles.soonBadge}>{days === 0 ? 'Today!' : `${days}d left`}</span>}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleCreateClick(e, `/dashboard/composer?occasion=${encodeURIComponent(event.name)}&type=festive`)}
                    className={styles.festiveCreateBtn}
                  >
                    Create post
                  </button>
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
                <span className={styles.usageCount}>
                  {postsUsed} <span>/ {currentLimit >= 10000 ? '∞' : currentLimit}</span>
                </span>
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
                {currentLimit >= 10000 ? 'Unlimited' : (currentLimit - postsUsed)} posts remaining this cycle. Resets on {getNextResetDate(createdAt)}.
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
                      {(post.platform === 'facebook' || post.platform === 'both') && <MessageSquare size={16} className={styles.fbIcon} />}
                      {(post.platform === 'instagram' || post.platform === 'both') && <Share2 size={16} className={styles.igIcon} />}
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
