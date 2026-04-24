import { useState, useEffect, useRef } from 'react';
import { Bell, Search, User, MapPin, Hash, MessageSquare, Share2, ChevronDown } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import styles from './Header.module.css';
import { useBrand } from '@/contexts/BrandContext';

export default function Header() {
  const { businessName, ownerName, logo, refreshBrandData } = useBrand();
  const [userData, setUserData] = useState<any>({
    email: '',
    address: 'Set your address',
    pincode: 'Pincode',
    instagram: '@instagram',
    facebook: 'facebook.com'
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
        
        <div className={styles.profileContainer} ref={dropdownRef}>
          <div className={styles.profile} onClick={() => setShowDropdown(!showDropdown)}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{ownerName || businessName || 'My Brand'}</span>
              <span className={styles.userRole}>{businessName}</span>
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
                  <h3>{ownerName || businessName || 'My Brand'}</h3>
                  <p className={styles.dropdownBizName}>{businessName}</p>
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
<<<<<<< Updated upstream
<<<<<<< Updated upstream
                  <Share2 size={16} />
                  <span>{userData.instagram}</span>
                </div>
                <div className={styles.socialLink}>
                  <MessageSquare size={16} />
                  <span>{userData.facebook}</span>
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
