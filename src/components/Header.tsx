import { useState, useEffect } from 'react';
import { Bell, Search, User, MapPin, Mail, Hash, MessageSquare, Share2, ChevronDown } from 'lucide-react';
import styles from './Header.module.css';

export default function Header() {
  const [userData, setUserData] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('brandpost_user_data');
    if (savedData) {
      setUserData(JSON.parse(savedData));
    }
  }, []);

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
        
        <div className={styles.profileContainer}>
          <div className={styles.profile} onClick={() => setShowDropdown(!showDropdown)}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{userData?.businessName || 'Alex Johnson'}</span>
              <span className={styles.userRole}>Brand Manager</span>
            </div>
            <div className={styles.avatar}>
              {userData?.logo ? (
                <img src={userData.logo} alt="Profile" className={styles.profileImg} />
              ) : (
                <User size={20} />
              )}
            </div>
            <ChevronDown size={14} className={`${styles.chevron} ${showDropdown ? styles.chevronUp : ''}`} />
          </div>

          {showDropdown && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                {userData?.logo ? (
                  <img src={userData.logo} alt="Logo" className={styles.dropdownLogo} />
                ) : (
                  <div className={styles.dropdownAvatar}><User /></div>
                )}
                <div>
                  <h3>{userData?.businessName || 'Your Business'}</h3>
                  <p>{userData?.email || 'business@example.com'}</p>
                </div>
              </div>
              
              <div className={styles.dropdownContent}>
                <div className={styles.detailItem}>
                  <MapPin size={16} />
                  <span>{userData?.address || 'Set your address'}</span>
                </div>
                <div className={styles.detailItem}>
                  <Hash size={16} />
                  <span>{userData?.pincode || 'Pincode'}</span>
                </div>
                <div className={styles.divider}></div>
                <div className={styles.socialLink}>
                  <Share2 size={16} />
                  <span>{userData?.instagram || '@instagram'}</span>
                </div>
                <div className={styles.socialLink}>
                  <MessageSquare size={16} />
                  <span>{userData?.facebook || 'facebook.com'}</span>
                </div>
              </div>
              
              <div className={styles.dropdownFooter}>
                <button className={styles.logoutBtn}>Logout</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
