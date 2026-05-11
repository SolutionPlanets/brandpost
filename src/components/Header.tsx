import { useState, useEffect } from 'react';
import { Bell, Search, User, MapPin, Hash, MessageSquare, Share2, ChevronDown } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from './Header.module.css';
import { useBrand } from '@/contexts/BrandContext';

export default function Header() {
  const { businessName, logo, profilePhoto, refreshBrandData } = useBrand();
  const [userData, setUserData] = useState<any>({
    email: '',
    address: 'Set your address',
    pincode: 'Pincode',
    instagram: '@instagram',
    facebook: 'facebook.com'
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDetails() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserData(prev => ({ ...prev, email: user.email }));
        const { data: profile } = await supabase
          .from('users')
          .select(`
            workspaces (
              address,
              pincode,
              brand_kits (
                instagram_handle,
                facebook_handle
              )
            )
          `)
          .eq('id', user.id)
          .single();

        if (profile?.workspaces?.[0]) {
          const workspace = profile.workspaces[0];
          const brandKit = workspace.brand_kits?.[0];
          setUserData(prev => ({
            ...prev,
            address: workspace.address || 'Set your address',
            pincode: workspace.pincode || 'Pincode',
            instagram: brandKit?.instagram_handle || '@instagram',
            facebook: brandKit?.facebook_handle || 'facebook.com'
          }));
        }
      }
    }
    fetchDetails();
  }, [businessName]); // Refresh when context changes

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
              <span className={styles.userName}>{businessName || 'My Brand'}</span>
              <span className={styles.userRole}>Brand Manager</span>
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
            <ChevronDown size={14} className={`${styles.chevron} ${showDropdown ? styles.chevronUp : ''}`} />
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
                  <h3>{businessName || 'My Brand'}</h3>
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
