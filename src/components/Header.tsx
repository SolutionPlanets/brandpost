import { Bell, Search, User } from 'lucide-react';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.searchContainer}>
        <Search size={18} className={styles.searchIcon} />
        <input type="text" placeholder="Search posts, analytics..." className={styles.searchInput} />
      </div>

      <div className={styles.actions}>
        <button className={styles.iconBtn}>
          <Bell size={20} />
          <span className={styles.badge}></span>
        </button>
        
        <div className={styles.profile}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Alex Johnson</span>
            <span className={styles.userRole}>Brand Manager</span>
          </div>
          <div className={styles.avatar}>
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
