'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import {
  Search,
  Filter,
  Plus,
  Image as ImageIcon,
  Facebook,
  Instagram,
  MoreHorizontal,
  Eye,
  Edit3,
  Trash2,
  Copy,
  CalendarClock,
  Clock,
  Bookmark,
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
  const { workspaceId } = useBrand();
  const [posts, setPosts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [selectedViewerImage, setSelectedViewerImage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const handleView = (post: any) => {
    if (post.image_url) {
      setSelectedViewerImage(post.image_url);
    } else {
      alert('No image available for this post.');
    }
  };

  const handleEdit = (id: number) => {
    router.push(`/dashboard/composer?editId=${id}`);
  };

  const handleDuplicate = (id: number) => {
    router.push(`/dashboard/composer?duplicateId=${id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      setPosts(posts.filter((p) => p.id !== id));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post.');
    }
  };

  useEffect(() => {
    async function fetchPosts() {
      if (!workspaceId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } catch (err) {
        console.error('Error fetching posts:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPosts();
  }, [workspaceId, supabase]);

  // Close action dropdown menu when clicking anywhere outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenuId !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest(`.${styles.actionMenu}`)) {
          setOpenMenuId(null);
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const filteredPosts = posts.filter((post) => {
    if (showSavedOnly && !post.is_saved && post.extra_instructions !== 'saved') return false;
    if (statusFilter !== 'all' && post.status !== statusFilter) return false;
    if (platformFilter !== 'all' && post.platform !== platformFilter) return false;
    if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activePostsForCounts = showSavedOnly 
    ? posts.filter(p => p.is_saved || p.extra_instructions === 'saved')
    : posts;

  const statusCounts = {
    all: activePostsForCounts.length,
    draft: activePostsForCounts.filter((p) => p.status === 'draft').length,
    scheduled: activePostsForCounts.filter((p) => p.status === 'scheduled').length,
    published: activePostsForCounts.filter((p) => p.status === 'published').length,
    failed: activePostsForCounts.filter((p) => p.status === 'failed').length,
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Post History</h1>
          <p className={styles.subtitle}>Manage and track all your created content.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', minWidth: '150px' }}>
          <Link href="/dashboard/composer" className={styles.createBtn} style={{ margin: 0, width: '100%', justifyContent: 'center' }}>
            <Plus size={20} /> New Post
          </Link>
          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: showSavedOnly ? '#10b981' : 'transparent',
              color: showSavedOnly ? 'white' : '#64748b',
              border: '1px solid ' + (showSavedOnly ? '#10b981' : '#cbd5e1'),
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <Bookmark size={16} fill={showSavedOnly ? 'white' : 'none'} />
            Saved Images
          </button>
        </div>
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

      {/* Posts Grid/Table Container */}
      {showSavedOnly ? (
        filteredPosts.length === 0 ? (
          <div className={styles.tableCard}>
            <div className={styles.emptyState}>
              <Clock size={40} />
              <h3>No saved images found</h3>
              <p>Go to the composer and generate images, then save them!</p>
            </div>
          </div>
        ) : (
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
              marginTop: '10px'
            }}
          >
            {filteredPosts.map((post) => (
              <div 
                key={post.id} 
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => setSelectedViewerImage(post.image_url)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                {/* Large Preview Image */}
                <div style={{ position: 'relative', width: '100%', height: '260px', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                  {post.image_url ? (
                    <img 
                      src={post.image_url} 
                      alt={post.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} 
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                      <ImageIcon size={48} />
                    </div>
                  )}
                </div>

                {/* Info and Details */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>
                      {post.title}
                    </h4>
                    
                    {/* Action Menu */}
                    <div className={styles.actionMenu} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {openMenuId === post.id && (
                        <div className={styles.dropdown} style={{ right: 0, top: '100%' }}>
                          <button onClick={() => handleView(post)}><Eye size={14} /> View</button>
                          <button onClick={() => handleEdit(post.id)}><Edit3 size={14} /> Edit</button>
                          <button onClick={() => handleDuplicate(post.id)}><Copy size={14} /> Duplicate</button>
                          <button className={styles.deleteAction} onClick={() => handleDelete(post.id)}><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0, display: '-webkit-box', WebKitLineClamp: 2, WebKitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.5', minHeight: '38px' }}>
                    {post.caption}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                      {formatDate(post.published_at || post.publishedAt || post.created_at || post.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Posts Table */
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
                    {post.image_url ? (
                      <img src={post.image_url} alt="" className={styles.thumbImg} />
                    ) : (
                      <ImageIcon size={18} />
                    )}
                  </div>
                  <div className={styles.postInfo}>
                    <h4>{post.title}</h4>
                    <p>{post.caption?.substring(0, 50)}...</p>
                  </div>
                </div>
                <div className={styles.colPlatform}>
                  {(post.platform === 'facebook' || post.platform === 'both') && <Facebook size={18} className={styles.fbIcon} />}
                  {(post.platform === 'instagram' || post.platform === 'both') && <Instagram size={18} className={styles.igIcon} />}
                </div>
                <div className={styles.colType}>
                  <span className={styles.typeBadge}>{post.content_type || post.contentType}</span>
                </div>
                <div className={styles.colStatus}>
                  <span className={`${styles.statusBadge} ${styles[`status${post.status.charAt(0).toUpperCase() + post.status.slice(1)}`]}`}>
                    {post.status}
                  </span>
                </div>
                <div className={styles.colDate}>
                  {post.status === 'scheduled' ? (
                    <span className={styles.scheduledDate}><CalendarClock size={13} /> {formatDate(post.scheduled_at || post.scheduledAt)}</span>
                  ) : (
                    <span>{formatDate(post.published_at || post.publishedAt || post.created_at || post.createdAt)}</span>
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
                        <button onClick={() => handleView(post)}><Eye size={14} /> View</button>
                        <button onClick={() => handleEdit(post.id)}><Edit3 size={14} /> Edit</button>
                        <button onClick={() => handleDuplicate(post.id)}><Copy size={14} /> Duplicate</button>
                        <button className={styles.deleteAction} onClick={() => handleDelete(post.id)}><Trash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Premium Lightbox Modal Viewer */}
      {selectedViewerImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setSelectedViewerImage(null)}
        >
          {/* Header Bar with prominent Back to History button */}
          <div style={{
            width: '100%',
            maxWidth: '90%',
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '16px'
          }}>
            <button
              onClick={() => setSelectedViewerImage(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.transform = 'translateX(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <span>← Back to History</span>
            </button>
          </div>

          <div 
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '80vh',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'black'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={selectedViewerImage} 
              alt="Preview" 
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                display: 'block'
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
