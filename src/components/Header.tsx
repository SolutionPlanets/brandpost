import { useState, useEffect, useRef } from 'react';
import { Bell, Search, User, MapPin, Hash, MessageSquare, Share2, ChevronDown, LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import styles from './Header.module.css';

export default function Header() {
  const { 
    businessName, 
    ownerName, 
    logo, 
    profilePhoto, 
    address, 
    pincode, 
    instagram, 
    facebook,
    refreshBrandData 
  } = useBrand();
  
  const [email, setEmail] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
      }
    }
    fetchUser();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('brandpost_user_data');
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Error during logout:', error);
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
        <button className={styles.actionBtn}>
          <Bell size={20} color="var(--text-main)" />
          <span className={styles.badge}></span>
        </button>
        
        <div className={styles.profileContainer} ref={dropdownRef}>
          <div className={styles.profile} onClick={() => setShowDropdown(!showDropdown)}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{ownerName || businessName || 'My Brand'}</span>
              <span className={styles.userRole}>{businessName}</span>
            </div>
            <div className={styles.avatar}>
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className={styles.profileImg} referrerPolicy="no-referrer" />
              ) : logo ? (
                <img src={logo} alt="Profile" className={styles.profileImg} />
              ) : (
                <User size={20} />
              )}
            </div>
            <ChevronDown size={16} color="var(--text-muted)" className={showDropdown ? styles.rotate : ''} />
          </div>

          {showDropdown && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className={styles.dropdownLogo} referrerPolicy="no-referrer" />
                ) : logo ? (
                  <img src={logo} alt="Logo" className={styles.dropdownLogo} />
                ) : (
                  <div className={styles.dropdownAvatar}><User /></div>
                )}
                <div>
                  <h3>{ownerName || businessName || 'My Brand'}</h3>
                  <p className={styles.dropdownBizName}>{businessName || 'My Business'}</p>
                  <p>{email}</p>
                </div>
              </div>
              
              <div className={styles.dropdownContent}>
                <div className={styles.detailItem}>
                  <MapPin size={16} />
                  <span>{address || 'Set your address'}</span>
                </div>
                <div className={styles.detailItem}>
                  <Hash size={16} />
                  <span>{pincode || 'Pincode'}</span>
                </div>
                <div className={styles.divider}></div>
                <div className={styles.socialLink}>
                  <Share2 size={16} />
                  <span>{instagram || '@instagram'}</span>
                </div>
                <div className={styles.socialLink}>
                  <MessageSquare size={16} />
                  <span>{facebook || 'facebook.com'}</span>
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
