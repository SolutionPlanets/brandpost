<<<<<<< Updated upstream
import { useState, useEffect, useRef } from 'react';
import { Bell, Search, User, MapPin, Mail, Hash, MessageSquare, Share2, ChevronDown } from 'lucide-react';
=======
import { useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  User, 
  MapPin, 
  Hash, 
  MessageSquare, 
  Share2, 
  ChevronDown,
  Instagram,
  Facebook,
  LogOut
} from 'lucide-react';
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import styles from './Header.module.css';

export default function Header() {
  const { businessName, logo } = useBrand();
  const [userData, setUserData] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      const savedData = localStorage.getItem('brandpost_user_data');
      const parsedData = savedData ? JSON.parse(savedData) : {};
      
      if (user) {
        setUserData({
          ...parsedData,
          email: user.email
        });
      } else if (savedData) {
        setUserData(parsedData);
      }
    }

    fetchUserData();

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('brandpost_user_data');
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback redirect even if signOut fails
      window.location.href = '/';
    }
  };

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
        
        <div className={styles.profileContainer} ref={dropdownRef}>
          <div className={styles.profile} onClick={() => setShowDropdown(!showDropdown)}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{businessName || 'Alex Johnson'}</span>
            </div>
            <div className={styles.avatar}>
              {logo ? (
                <img src={logo} alt="Profile" className={styles.profileImg} />
              ) : (
                <User size={20} />
              )}
            </div>
            <ChevronDown size={14} className={`${styles.chevron} ${showDropdown ? styles.chevronUp : ''}`} />
          </div>

          {showDropdown && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                {logo ? (
                  <img src={logo} alt="Logo" className={styles.dropdownLogo} />
                ) : (
                  <div className={styles.dropdownAvatar}><User /></div>
                )}
                <div>
                  <h3>{businessName || 'Your Business'}</h3>
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
<<<<<<< Updated upstream
<<<<<<< Updated upstream
                  <Share2 size={16} />
                  <span>{userData?.instagram || '@instagram'}</span>
                </div>
                <div className={styles.socialLink}>
                  <MessageSquare size={16} />
                  <span>{userData?.facebook || 'facebook.com'}</span>
=======
                  <Instagram size={16} />
                  <span>{userData.instagram}</span>
                </div>
                <div className={styles.socialLink}>
=======
                  <Instagram size={16} />
                  <span>{userData.instagram}</span>
                </div>
                <div className={styles.socialLink}>
>>>>>>> Stashed changes
                  <Facebook size={16} />
                  <span>{userData.facebook}</span>
>>>>>>> Stashed changes
                </div>
              </div>
              
              <div className={styles.dropdownFooter}>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
