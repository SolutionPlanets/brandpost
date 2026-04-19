import { 
  TrendingUp, 
  Users, 
  Calendar as CalendarIcon, 
  Plus, 
  MoreHorizontal,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';
import styles from './DashboardHome.module.css';

export default function DashboardHome() {
  const stats = [
    { label: 'Total Posts', value: '24', icon: CalendarIcon, color: '#4f46e5' },
    { label: 'Audience Reach', value: '12.4k', icon: TrendingUp, color: '#10b981' },
    { label: 'Engagement', value: '4.2%', icon: Users, color: '#f59e0b' },
    { label: 'Pending AI', value: '5', icon: MessageSquare, color: '#06b6d4' },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome back, Alex!</h1>
          <p className={styles.subtitle}>Here's what's happening with your brand today.</p>
        </div>
        <button className={styles.createBtn}>
          <Plus size={20} /> Create New Post
        </button>
      </header>

      <div className={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statInfo}>
              <span className={stat.label}>{stat.label}</span>
              <span className={styles.statValue}>{stat.value}</span>
            </div>
            <div className={styles.statIcon} style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.recentPosts}>
          <div className={styles.sectionHeader}>
            <h2>Recent Posts</h2>
            <button className={styles.viewAll}>View All</button>
          </div>
          <div className={styles.postList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.postItem}>
                <div className={styles.postImage}>
                  <ImageIcon size={20} />
                </div>
                <div className={styles.postContent}>
                  <h3>Post Title {i}</h3>
                  <p>Scheduled for Oct {10+i}, 2026</p>
                </div>
                <div className={styles.postStatus}>Scheduled</div>
                <button className={styles.moreBtn}><MoreHorizontal size={18} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.calendarPreview}>
          <div className={styles.sectionHeader}>
            <h2>Upcoming Tasks</h2>
          </div>
          <div className={styles.taskList}>
            <div className={styles.taskItem}>
              <div className={styles.taskDate}>12 Oct</div>
              <div className={styles.taskInfo}>
                <h4>Weekly Newsletter Post</h4>
                <p>Instagram & Facebook</p>
              </div>
            </div>
            <div className={styles.taskItem}>
              <div className={styles.taskDate}>15 Oct</div>
              <div className={styles.taskInfo}>
                <h4>Brand Kit Update</h4>
                <p>Review new color palette</p>
              </div>
            </div>
            <div className={styles.taskItem}>
              <div className={styles.taskDate}>18 Oct</div>
              <div className={styles.taskInfo}>
                <h4>Product Launch Teaser</h4>
                <p>Generate AI visuals</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
