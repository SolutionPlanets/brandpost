import { useState, useEffect } from 'react';
import { Bell, Search, User, MapPin, Hash, MessageSquare, Share2, ChevronDown } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from './Header.module.css';

export default function Header() {
  const [userData, setUserData] = useState<any>({
    businessName: 'Loading...',
    email: '',
    logo: null,
    address: 'Set your address',
    pincode: 'Pincode',
    instagram: '@instagram',
    facebook: 'facebook.com'
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch profile and brand kit from DB
        const { data: profile, error } = await supabase
          .from('users')
          .select(`
            full_name,
            workspaces (
              id,
              brand_kits (
                name,
                logo_url,
                brand_description,
                instagram_handle,
                facebook_handle
              )
            )
          `)
          .eq('id', user.id)
          .single();

        if (profile) {
          const brandKit = profile.workspaces?.[0]?.brand_kits?.[0];
          setUserData({
            businessName: brandKit?.name || profile.full_name || 'My Brand',
            email: user.email,
            logo: brandKit?.logo_url,
            address: brandKit?.brand_description || 'Set your address',
            pincode: 'Pincode', // Could add this to schema if needed
            instagram: brandKit?.instagram_handle || '@instagram',
            facebook: brandKit?.facebook_handle || 'facebook.com'
          });
        } else {
          // Fallback to local storage if DB is empty (only for fresh onboarding)
          const savedData = localStorage.getItem('brandpost_user_data');
          if (savedData) setUserData({ ...userData, ...JSON.parse(savedData) });
        }
      }
    }
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('brandpost_user_data');
      window.location.href = '/';
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
        <button className={styles.iconBtn}>
          <Bell size={20} />
          <span className={styles.badge}></span>
        </button>
        
        <div className={styles.profileContainer}>
          <div className={styles.profile} onClick={() => setShowDropdown(!showDropdown)}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{userData.businessName}</span>
              <span className={styles.userRole}>Brand Manager</span>
            </div>
            <div className={styles.avatar}>
              {userData.logo ? (
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
                {userData.logo ? (
                  <img src={userData.logo} alt="Logo" className={styles.dropdownLogo} />
                ) : (
                  <div className={styles.dropdownAvatar}><User /></div>
                )}
                <div>
                  <h3>{userData.businessName}</h3>
                  <p>{userData.email}</p>
                </div>
              </div>
              
              <div className={styles.dropdownContent}>
                <div className={styles.detailItem}>
                  <MapPin size={16} />
                  <span>{userData.address}</span>
                </div>
                <div className={styles.detailItem}>
                  <Hash size={16} />
                  <span>{userData.pincode}</span>
                </div>
                <div className={styles.divider}></div>
                <div className={styles.socialLink}>
                  <Share2 size={16} />
                  <span>{userData.instagram}</span>
                </div>
                <div className={styles.socialLink}>
                  <MessageSquare size={16} />
                  <span>{userData.facebook}</span>
                </div>
              </div>
              
              <div className={styles.dropdownFooter}>
                <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
