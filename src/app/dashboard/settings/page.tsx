'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Key,
  Save,
  Check,
  Globe,
  Clock,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import styles from './Settings.module.css';

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: '(GMT+05:30) India Standard Time' },
  { value: 'UTC', label: '(GMT+00:00) UTC' },
  { value: 'America/New_York', label: '(GMT-05:00) Eastern Time' },
  { value: 'America/Chicago', label: '(GMT-06:00) Central Time' },
  { value: 'America/Denver', label: '(GMT-07:00) Mountain Time' },
  { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacific Time' },
  { value: 'Europe/London', label: '(GMT+00:00) London' },
  { value: 'Europe/Paris', label: '(GMT+01:00) Paris' },
  { value: 'Asia/Dubai', label: '(GMT+04:00) Dubai' },
  { value: 'Asia/Singapore', label: '(GMT+08:00) Singapore' },
  { value: 'Australia/Sydney', label: '(GMT+11:00) Sydney' },
];

type SettingsTab = 'profile' | 'workspace' | 'billing' | 'notifications';

const TABS = [
  { id: 'profile' as SettingsTab, label: 'Profile', icon: User },
  { id: 'workspace' as SettingsTab, label: 'Workspace', icon: Building2 },
  { id: 'billing' as SettingsTab, label: 'Billing & Plan', icon: CreditCard },
  { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);
  const { businessName, setBusinessName, ownerName, refreshBrandData, planId, trialEndsAt, timezone } = useBrand();
  const supabase = createClient();

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    timezone: 'Asia/Kolkata',
  });

  const [workspaceData, setWorkspaceData] = useState({
    name: '',
    platform: 'both',
    tone: 'professional'
  });


  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfileData(prev => ({
          ...prev,
          email: user.email || '',
          fullName: user.user_metadata?.full_name || 'User'
        }));
      }

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (workspace) {
        setProfileData(prev => ({
          ...prev,
          fullName: workspace.owner_name || prev.fullName,
          timezone: workspace.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
        }));
        setWorkspaceData({
          name: workspace.business_name === 'My Workspace' ? '' : (workspace.business_name || ''),
          platform: 'both',
          tone: 'professional'
        });
      }
    }
    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Update Profile Metadata (Optional but good)
      await supabase.auth.updateUser({
        data: { full_name: profileData.fullName }
      });

      // 2. Update Workspace Name
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (workspace) {
        const { error: wsError } = await supabase
          .from('workspaces')
          .update({ 
            business_name: businessName,
            owner_name: profileData.fullName,
            timezone: profileData.timezone
          })
          .eq('id', workspace.id);
        
        if (wsError) throw wsError;

        // 3. Update Brand Kit Name (to match workspace)
        const { error: bkError } = await supabase
          .from('brand_kits')
          .update({ name: businessName })
          .eq('workspace_id', workspace.id);
          
        if (bkError) throw bkError;
        
        // Refresh global context
        await refreshBrandData();
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error: any) {
      alert(`Error saving: ${error.message}`);
    }
  };

  const renderProfile = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Profile Settings</h2>
      <p className={styles.sectionDesc}>Manage your personal account details.</p>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label>Full Name</label>
          <input 
            type="text" 
            value={profileData.fullName} 
            onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
            placeholder="Your Name"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Email</label>
          <input 
            type="email" 
            value={profileData.email} 
            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
            placeholder="email@example.com"
          />
        </div>
        <div className={styles.formGroup}>
          <label><Globe size={14} /> Timezone</label>
          <select 
            value={profileData.timezone}
            disabled
            style={{ backgroundColor: 'var(--background)', cursor: 'not-allowed', opacity: 0.8 }}
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <p className={styles.fieldHelp}>Detected automatically based on your location.</p>
        </div>
      </div>

      <div className={styles.dangerZone}>
        <h3><Shield size={16} /> Security</h3>
        <div className={styles.dangerItem}>
          <div>
            <h4>Change Password</h4>
            <p>Update your password for added security.</p>
          </div>
          <button className={styles.outlineBtn}><Key size={14} /> Change</button>
        </div>
      </div>
    </div>
  );

  const renderWorkspace = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Workspace Settings</h2>
      <p className={styles.sectionDesc}>Configure your workspace preferences.</p>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label>Workspace Name</label>
          <input 
            type="text" 
            value={businessName} 
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. My Workspace"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Default Platform</label>
          <select defaultValue="both">
            <option value="both">Facebook & Instagram</option>
            <option value="facebook">Facebook Only</option>
            <option value="instagram">Instagram Only</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Default Brand Tone</label>
          <select defaultValue="professional">
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="playful">Playful</option>
            <option value="authoritative">Authoritative</option>
          </select>
        </div>
      </div>

    </div>
  );

  const renderBilling = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Billing & Plan</h2>
      <p className={styles.sectionDesc}>Manage your subscription and payment details.</p>


      <div className={styles.newPlansSection}>
        {planId === 'solo' && trialEndsAt && new Date(trialEndsAt) > new Date() ? (
          <>
            <div className={styles.trialBadgeActive}>Active: 14-Day Free Trial</div>
            <h3>You are currently on a Free Trial</h3>
            <p>Your trial ends on {new Date(trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. 
               Upgrade to a pro plan anytime to keep your premium features.</p>
          </>
        ) : (
          <>
            <h3>You haven't purchased a plan yet</h3>
            <p>Choose a professional plan to unlock all features and grow your business.</p>
          </>
        )}
        <button 
          className={styles.viewPlansBtn}
          onClick={() => window.location.href = '/pricing?from=dashboard'}
        >
          {planId === 'solo' ? 'Upgrade Plan' : 'Change Plan'}
        </button>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Notifications</h2>
      <p className={styles.sectionDesc}>Configure how you receive updates.</p>
      <div className={styles.notifList}>
        {[
          { label: 'Post published successfully', desc: 'Get notified when a post goes live.', enabled: true },
          { label: 'Post failed to publish', desc: 'Alert when a scheduled post fails.', enabled: true },
          { label: 'Usage limit warnings', desc: 'Notify when you reach 80% of your monthly limit.', enabled: true },
          { label: 'Upcoming occasion reminders', desc: 'Reminders 3 days before festive events.', enabled: false },
          { label: 'Weekly performance digest', desc: 'A summary of your post performance each week.', enabled: false },
        ].map((item, i) => (
          <div key={i} className={styles.notifItem}>
            <div className={styles.notifInfo}>
              <h4>{item.label}</h4>
              <p>{item.desc}</p>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" defaultChecked={item.enabled} />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Manage your account and workspace preferences.</p>
        </div>
      </header>

      <div className={styles.settingsLayout}>
        <nav className={styles.settingsNav}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </nav>

        <div className={styles.settingsContent}>
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'workspace' && renderWorkspace()}
          {activeTab === 'billing' && renderBilling()}
          {activeTab === 'notifications' && renderNotifications()}

          {activeTab !== 'billing' && (
            <div className={styles.saveBar}>
              <button className={styles.saveBtn} onClick={handleSave}>
                {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
