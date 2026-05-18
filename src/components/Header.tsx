import { useState, useEffect, useRef } from 'react';
import { Bell, Search, User, MapPin, Hash, MessageSquare, Share2, ChevronDown, LogOut, Instagram, Facebook, Navigation, Building2, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import styles from './Header.module.css';

interface Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'info' | 'warning' | 'error';
}

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
    postsUsed,
    currentLimit,
    trialEndsAt,
    createdAt
  } = useBrand();
  
  const [email, setEmail] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNoti, setShowNoti] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readNotis, setReadNotis] = useState<string[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
      }
    }
    fetchUser();

    // Load read notifications from localStorage
    const saved = localStorage.getItem('read_notifications');
    if (saved) {
      setReadNotis(JSON.parse(saved));
    }
  }, []);

  // Generate virtual notifications based on status
  useEffect(() => {
    const list: Notification[] = [];
    const usagePercent = (postsUsed / currentLimit) * 100;
    
    // Load trigger history to handle 24h expiration
    const historySaved = localStorage.getItem('noti_trigger_history');
    const triggerHistory: Record<string, number> = historySaved ? JSON.parse(historySaved) : {};
    const nowTs = Date.now();
    let historyChanged = false;

    const addNotiIfValid = (noti: Notification) => {
      let triggeredAt = triggerHistory[noti.id];
      
      if (!triggeredAt) {
        // First time seeing this noti
        triggerHistory[noti.id] = nowTs;
        triggeredAt = nowTs;
        historyChanged = true;
      }

      // Check if it's older than 24 hours (24 * 60 * 60 * 1000 ms)
      const isExpired = nowTs - triggeredAt > 24 * 60 * 60 * 1000;
      
      if (!isExpired) {
        // Calculate relative time display
        const hoursAgo = Math.floor((nowTs - triggeredAt) / (1000 * 60 * 60));
        noti.time = hoursAgo === 0 ? 'Just now' : `${hoursAgo}h ago`;
        list.push(noti);
      }
    };
    
    // 1. Credit Usage Notis
    if (usagePercent >= 100) {
      addNotiIfValid({
        id: 'credit-100',
        title: 'Credits Exhausted!',
        desc: 'You have used 100% of your AI post credits. Please renew your plan.',
        time: '',
        type: 'error'
      });
    } else if (usagePercent >= 90) {
      addNotiIfValid({
        id: 'credit-90',
        title: '90% Credits Used',
        desc: 'You are almost out of credits. Consider upgrading soon.',
        time: '',
        type: 'warning'
      });
    } else if (usagePercent >= 50) {
      addNotiIfValid({
        id: 'credit-50',
        title: '50% Credits Used',
        desc: 'You have used half of your monthly credit limit.',
        time: '',
        type: 'info'
      });
    }

    // 2. Plan Expiry Notis
    if (trialEndsAt) {
      const expiry = new Date(trialEndsAt);
      const diffTime = expiry.getTime() - nowTs;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        addNotiIfValid({
          id: 'plan-expired',
          title: 'Plan Expired',
          desc: 'Your premium plan has expired. Upgrade now to continue.',
          time: '',
          type: 'error'
        });
      } else if (diffDays === 1) {
        addNotiIfValid({
          id: 'plan-1day',
          title: '1 Day Remaining',
          desc: 'Your plan expires tomorrow. Renew now to avoid interruption.',
          time: '',
          type: 'warning'
        });
      } else if (diffDays === 2) {
        addNotiIfValid({
          id: 'plan-2days',
          title: '2 Days Remaining',
          desc: 'Your plan will expire in 2 days. Don\'t forget to renew!',
          time: '',
          type: 'info'
        });
      }
    }

    if (historyChanged) {
      localStorage.setItem('noti_trigger_history', JSON.stringify(triggerHistory));
    }
    setNotifications(list);
  }, [postsUsed, currentLimit, trialEndsAt]);

  const unreadCount = notifications.filter(n => !readNotis.includes(n.id)).length;

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    const newRead = Array.from(new Set([...readNotis, ...allIds]));
    setReadNotis(newRead);
    localStorage.setItem('read_notifications', JSON.stringify(newRead));
  };

  const markOneRead = (id: string) => {
    if (!readNotis.includes(id)) {
      const newRead = [...readNotis, id];
      setReadNotis(newRead);
      localStorage.setItem('read_notifications', JSON.stringify(newRead));
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setShowNoti(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const getNotiIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle size={18} color="#ef4444" />;
      case 'warning': return <AlertTriangle size={18} color="#f59e0b" />;
      default: return <Info size={18} color="#4f46e5" />;
    }
  };

  const getNotiBg = (type: string) => {
    switch (type) {
      case 'error': return '#fef2f2';
      case 'warning': return '#fffbeb';
      default: return '#f0f4ff';
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.searchContainer}>
        <Search size={18} className={styles.searchIcon} />
        <input type="text" placeholder="Search posts, analytics..." className={styles.searchInput} />
      </div>

      <div className={styles.actions}>
        <div className={styles.notiContainer} ref={notiRef}>
          <button className={styles.iconBtn} onClick={() => setShowNoti(!showNoti)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className={styles.badgeCount}>{unreadCount}</span>}
          </button>

          {showNoti && (
            <div className={styles.notiDropdown}>
              <div className={styles.notiHeader}>
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className={styles.markReadBtn} onClick={markAllRead}>Mark all read</button>
                )}
              </div>
              <div className={styles.notiList}>
                {notifications.length > 0 ? (
                  notifications.map(noti => (
                    <div 
                      key={noti.id} 
                      className={`${styles.notiItem} ${!readNotis.includes(noti.id) ? styles.unread : ''}`}
                      onClick={() => markOneRead(noti.id)}
                    >
                      <div className={styles.notiIconWrap} style={{ backgroundColor: getNotiBg(noti.type) }}>
                        {getNotiIcon(noti.type)}
                      </div>
                      <div className={styles.notiContent}>
                        <h4 className={styles.notiTitle}>{noti.title}</h4>
                        <p className={styles.notiDesc}>{noti.desc}</p>
                        <span className={styles.notiTime}>{noti.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.notiEmpty}>
                    <Bell size={32} />
                    <p>No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
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
                <img src={logo} alt="Logo" className={styles.profileImg} />
              ) : (
                <div className={styles.avatarFallback}>
                  {ownerName ? ownerName.charAt(0).toUpperCase() : (businessName ? businessName.charAt(0).toUpperCase() : 'U')}
                </div>
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
                  <div className={styles.dropdownAvatar}>
                    {ownerName ? ownerName.charAt(0).toUpperCase() : (businessName ? businessName.charAt(0).toUpperCase() : 'U')}
                  </div>
                )}
                <div>
                  <h3>{ownerName || businessName || 'My Brand'}</h3>
                  <p className={styles.dropdownBizName}>{businessName || 'My Business'}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{email}</p>
                </div>
              </div>
              
              <div className={styles.dropdownContent}>
                <div className={styles.detailItem}>
                  <Building2 size={16} />
                  <span>{address || 'Set your address'}</span>
                </div>
                <div className={styles.detailItem}>
                  <MapPin size={16} />
                  <span>{pincode || 'Pincode'}</span>
                </div>
                <div className={styles.divider}></div>
                <div className={styles.socialLink}>
                  <Instagram size={16} />
                  <span>{instagram || '@instagram'}</span>
                </div>
                <div className={styles.socialLink}>
                  <Facebook size={16} />
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
