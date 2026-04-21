'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  Image as ImageIcon,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Eye,
  Edit3,
  Trash2,
  Copy,
  CalendarClock,
  Clock,
} from 'lucide-react';
import styles from './Posts.module.css';

type StatusFilter = 'all' | 'draft' | 'scheduled' | 'published' | 'failed';
type PlatformFilter = 'all' | 'facebook' | 'instagram' | 'both';

interface Post {
  id: number;
  title: string;
  caption: string;
  platform: 'facebook' | 'instagram' | 'both';
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  contentType: 'festive' | 'offer' | 'informational' | 'general';
  createdAt: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

const MOCK_POSTS: Post[] = [
  { id: 1, title: 'Diwali Festival Sale – 20% Off!', caption: '🪔 Celebrate Diwali with amazing deals...', platform: 'both', status: 'published', contentType: 'festive', createdAt: '2026-04-10', scheduledAt: null, publishedAt: '2026-04-10' },
  { id: 2, title: 'Brand Story: Our Journey So Far', caption: '📖 From humble beginnings to where we are today...', platform: 'instagram', status: 'scheduled', contentType: 'informational', createdAt: '2026-04-15', scheduledAt: '2026-04-25', publishedAt: null },
  { id: 3, title: 'Weekend Flash Offer – Limited Time', caption: '⚡ This weekend only! Get flat 30% off...', platform: 'facebook', status: 'draft', contentType: 'offer', createdAt: '2026-04-18', scheduledAt: null, publishedAt: null },
  { id: 4, title: 'Team Appreciation Post', caption: '🙌 Our team is the backbone of everything...', platform: 'both', status: 'published', contentType: 'general', createdAt: '2026-04-08', scheduledAt: null, publishedAt: '2026-04-08' },
  { id: 5, title: 'Earth Day – Go Green Campaign', caption: '🌍 This Earth Day, join us in making...', platform: 'instagram', status: 'failed', contentType: 'festive', createdAt: '2026-04-20', scheduledAt: '2026-04-22', publishedAt: null },
  { id: 6, title: 'New Product Launch Teaser', caption: '🚀 Something exciting is coming your way...', platform: 'both', status: 'scheduled', contentType: 'general', createdAt: '2026-04-19', scheduledAt: '2026-04-28', publishedAt: null },
  { id: 7, title: 'Customer Testimonial Spotlight', caption: '⭐ Here is what our amazing customers...', platform: 'facebook', status: 'published', contentType: 'informational', createdAt: '2026-04-05', scheduledAt: null, publishedAt: '2026-04-05' },
  { id: 8, title: 'Summer Collection Preview', caption: '☀️ Get ready for summer with our brand new...', platform: 'instagram', status: 'draft', contentType: 'offer', createdAt: '2026-04-19', scheduledAt: null, publishedAt: null },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PostsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const filteredPosts = MOCK_POSTS.filter((post) => {
    if (statusFilter !== 'all' && post.status !== statusFilter) return false;
    if (platformFilter !== 'all' && post.platform !== platformFilter) return false;
    if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const statusCounts = {
    all: MOCK_POSTS.length,
    draft: MOCK_POSTS.filter((p) => p.status === 'draft').length,
    scheduled: MOCK_POSTS.filter((p) => p.status === 'scheduled').length,
    published: MOCK_POSTS.filter((p) => p.status === 'published').length,
    failed: MOCK_POSTS.filter((p) => p.status === 'failed').length,
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Post History</h1>
          <p className={styles.subtitle}>Manage and track all your created content.</p>
        </div>
        <Link href="/dashboard/composer" className={styles.createBtn}>
          <Plus size={20} /> New Post
        </Link>
      </header>

      {/* Status Tabs */}
      <div className={styles.statusTabs}>
        {(['all', 'draft', 'scheduled', 'published', 'failed'] as StatusFilter[]).map((status) => (
          <button
            key={status}
            className={`${styles.statusTab} ${statusFilter === status ? styles.statusTabActive : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'All Posts' : status.charAt(0).toUpperCase() + status.slice(1)}
            <span className={styles.tabCount}>{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className={styles.filtersBar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <Filter size={16} />
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}>
            <option value="all">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      {/* Posts Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderRow}>
          <span className={styles.colPost}>Post</span>
          <span className={styles.colPlatform}>Platform</span>
          <span className={styles.colType}>Type</span>
          <span className={styles.colStatus}>Status</span>
          <span className={styles.colDate}>Date</span>
          <span className={styles.colActions}></span>
        </div>

        {filteredPosts.length === 0 ? (
          <div className={styles.emptyState}>
            <Clock size={40} />
            <h3>No posts found</h3>
            <p>Try adjusting your filters or create a new post.</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} className={styles.tableDataRow}>
              <div className={styles.colPost}>
                <div className={styles.postThumb}>
                  <ImageIcon size={18} />
                </div>
                <div className={styles.postInfo}>
                  <h4>{post.title}</h4>
                  <p>{post.caption.substring(0, 50)}...</p>
                </div>
              </div>
              <div className={styles.colPlatform}>
                {(post.platform === 'facebook' || post.platform === 'both') && <MessageSquare size={16} className={styles.fbIcon} />}
                {(post.platform === 'instagram' || post.platform === 'both') && <Share2 size={16} className={styles.igIcon} />}
              </div>
              <div className={styles.colType}>
                <span className={styles.typeBadge}>{post.contentType}</span>
              </div>
              <div className={styles.colStatus}>
                <span className={`${styles.statusBadge} ${styles[`status${post.status.charAt(0).toUpperCase() + post.status.slice(1)}`]}`}>
                  {post.status}
                </span>
              </div>
              <div className={styles.colDate}>
                {post.status === 'scheduled' ? (
                  <span className={styles.scheduledDate}><CalendarClock size={13} /> {formatDate(post.scheduledAt)}</span>
                ) : (
                  <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                )}
              </div>
              <div className={styles.colActions}>
                <div className={styles.actionMenu}>
                  <button
                    className={styles.moreBtn}
                    onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {openMenuId === post.id && (
                    <div className={styles.dropdown}>
                      <button><Eye size={14} /> View</button>
                      <button><Edit3 size={14} /> Edit</button>
                      <button><Copy size={14} /> Duplicate</button>
                      <button className={styles.deleteAction}><Trash2 size={14} /> Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
