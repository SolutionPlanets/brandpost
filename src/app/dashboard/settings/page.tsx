'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Key,
  Save,
  Check,
  Share2,
  Facebook,
  Instagram,
  AlertTriangle,
  Unlink,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useBrand } from '@/contexts/BrandContext';
import styles from './Settings.module.css';

type SettingsTab = 'profile' | 'workspace' | 'social' | 'billing' | 'notifications';

const TABS = [
  { id: 'profile' as SettingsTab, label: 'Profile', icon: User },
  { id: 'workspace' as SettingsTab, label: 'Workspace', icon: Building2 },
  { id: 'social' as SettingsTab, label: 'Social Connections', icon: Share2 },
  { id: 'billing' as SettingsTab, label: 'Billing & Plan', icon: CreditCard },
  { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'profile';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [saved, setSaved] = useState(false);
  const [connectingFb, setConnectingFb] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { businessName, setBusinessName, ownerName, profilePhoto, authProvider, setProfilePhoto, refreshBrandData } = useBrand();
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
  const [socialConnections, setSocialConnections] = useState<any[]>([]);

  // Handle profile photo upload (email users only)
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be under 2MB.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/profile.${ext}`;

      // Upload to Brandpost_AI_Profile bucket
      const { error: uploadError } = await supabase.storage
        .from('Brandpost_AI_Profile')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('Brandpost_AI_Profile')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache-bust

      // Update users table
      await supabase.from('users').update({ profile_photo: publicUrl }).eq('id', user.id);
      
      setProfilePhoto(publicUrl);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

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
        .select('*, social_connections(*)')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (workspace) {
        setProfileData(prev => ({
          ...prev,
          fullName: workspace.owner_name || prev.fullName
        }));
        setWorkspaceData({
          name: workspace.business_name === 'My Workspace' ? '' : (workspace.business_name || ''),
          platform: 'both',
          tone: 'professional'
        });
        if (workspace.social_connections) {
          setSocialConnections(workspace.social_connections);
        }
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
            owner_name: profileData.fullName
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

  // Connect Facebook from settings page
  const handleConnectFacebook = async () => {
    setConnectingFb(true);
    const { error } = await supabase.auth.linkIdentity({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard/settings?tab=social&provider=facebook')}`,
        scopes: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish',
        queryParams: {
          config_id: '1280830517526784'
        }
      },
    });
    if (error) {
      console.error('Facebook connect error:', error.message);
      alert(`Failed to start Facebook connection: ${error.message}`);
      setConnectingFb(false);
    }
  };

  // Disconnect a social connection
  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    const { error } = await supabase.from('social_connections').delete().eq('id', connectionId);
    if (error) {
      alert(`Error disconnecting: ${error.message}`);
    } else {
      setSocialConnections(prev => prev.filter(c => c.id !== connectionId));
    }
  };

  // Check if token expires within 7 days
  const isTokenExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return expiry - Date.now() < sevenDays;
  };

  const renderProfile = () => {
    const isOAuthUser = authProvider === 'google' || authProvider === 'facebook';
    const isEmailUser = authProvider === 'email';

    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile Settings</h2>
        <p className={styles.sectionDesc}>Manage your personal account details.</p>

        {/* Profile Photo Section */}
        <div className={styles.profilePhotoSection}>
          <div className={styles.profilePhotoWrapper}>
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className={styles.profilePhotoImg} referrerPolicy="no-referrer" />
            ) : (
              <div className={styles.profilePhotoPlaceholder}>
                <User size={36} />
              </div>
            )}
            {isOAuthUser && (
              <div className={styles.providerBadge} title={`Synced from ${authProvider === 'google' ? 'Google' : 'Facebook'}`}>
                {authProvider === 'google' ? (
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                ) : (
                  <Facebook size={14} />
                )}
              </div>
            )}
          </div>
          <div className={styles.profilePhotoInfo}>
            <h4>{profileData.fullName || 'Your Name'}</h4>
            {isOAuthUser ? (
              <p className={styles.profilePhotoHint}>
                Photo synced from your {authProvider === 'google' ? 'Google' : 'Facebook'} account
              </p>
            ) : (
              <>
                <p className={styles.profilePhotoHint}>Upload a profile photo (max 2MB)</p>
                <label className={styles.uploadPhotoBtn}>
                  <input 
                    type="file" 
                    accept="image/png,image/jpeg,image/webp" 
                    onChange={handleProfilePhotoUpload} 
                    style={{ display: 'none' }} 
                  />
                  {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </label>
              </>
            )}
          </div>
        </div>

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
              disabled
              placeholder="email@example.com"
            />
          </div>
        </div>

        {/* Change Password - only for email auth users */}
        {isEmailUser && (
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
        )}
      </div>
    );
  };

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

  const renderSocial = () => {
    const facebookPages = socialConnections.filter(c => c.platform === 'facebook');
    const instagramAccounts = socialConnections.filter(c => c.platform === 'instagram');
    const hasAnyExpiring = socialConnections.some(c => isTokenExpiringSoon(c.token_expires_at));

    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Social Connections</h2>
        <p className={styles.sectionDesc}>Connect your Facebook Pages and Instagram accounts to publish content.</p>

        {hasAnyExpiring && (
          <div className={styles.tokenWarning}>
            <AlertTriangle size={18} />
            <div>
              <strong>Token expiring soon</strong>
              <p>One or more connections will expire within 7 days. Reconnect Facebook to refresh tokens.</p>
            </div>
            <button className={styles.reconnectBtn} onClick={handleConnectFacebook}>Reconnect</button>
          </div>
        )}

        {/* Connect Button */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            className={styles.viewPlansBtn}
            onClick={handleConnectFacebook}
            disabled={connectingFb}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Facebook size={16} /> {connectingFb ? 'Redirecting...' : 'Connect Facebook'}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Instagram accounts linked to your Facebook Pages are detected automatically.</p>
        </div>

        {/* Facebook Pages */}
        <div className={styles.dangerZone} style={{ marginTop: '0.5rem' }}>
          <h3><Facebook size={16} /> Facebook Pages</h3>
          {facebookPages.length > 0 ? (
            facebookPages.map(page => (
              <div key={page.id} className={styles.socialConnectionCard}>
                <div className={styles.socialCardLeft}>
                  <div className={styles.socialAvatar} style={page.picture_url ? { backgroundColor: 'transparent', backgroundImage: `url(${page.picture_url})`, backgroundSize: 'cover' } : {}}>
                    {!page.picture_url && <Facebook size={20} />}
                  </div>
                  <div>
                    <h4>{page.page_name}</h4>
                    <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Page ID: {page.page_id}</p>
                    {isTokenExpiringSoon(page.token_expires_at) && (
                      <span className={styles.expiryBadge}><AlertTriangle size={12} /> Expiring soon</span>
                    )}
                  </div>
                </div>
                <div className={styles.socialCardRight}>
                  <span className={styles.connectedBadge}>Connected</span>
                  <button className={styles.disconnectBtn} onClick={() => handleDisconnect(page.id)}><Unlink size={14} /> Disconnect</button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.dangerItem}>
              <div>
                <h4>No Pages Connected</h4>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Click "Connect Facebook" above to link your pages.</p>
              </div>
            </div>
          )}
        </div>

        {/* Instagram Accounts */}
        <div className={styles.dangerZone} style={{ marginTop: '1.5rem' }}>
          <h3><Instagram size={16} /> Instagram Accounts</h3>
          {instagramAccounts.length > 0 ? (
            instagramAccounts.map(account => (
              <div key={account.id} className={styles.socialConnectionCard}>
                <div className={styles.socialCardLeft}>
                  <div className={styles.socialAvatar} style={account.picture_url ? { backgroundColor: 'transparent', backgroundImage: `url(${account.picture_url})`, backgroundSize: 'cover' } : { background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                    {!account.picture_url && <Instagram size={20} color="white" />}
                  </div>
                  <div>
                    <h4>{account.page_name}</h4>
                    <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Account ID: {account.page_id}</p>
                    {isTokenExpiringSoon(account.token_expires_at) && (
                      <span className={styles.expiryBadge}><AlertTriangle size={12} /> Expiring soon</span>
                    )}
                  </div>
                </div>
                <div className={styles.socialCardRight}>
                  <span className={styles.connectedBadge}>Connected</span>
                  <button className={styles.disconnectBtn} onClick={() => handleDisconnect(account.id)}><Unlink size={14} /> Disconnect</button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.dangerItem}>
              <div>
                <h4>No Instagram Connected</h4>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Instagram is auto-detected from connected Facebook Pages via Meta Business Suite.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBilling = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Billing & Plan</h2>
      <p className={styles.sectionDesc}>Manage your subscription and payment details.</p>


      <div className={styles.newPlansSection}>
        <h3>You haven't purchased a plan yet</h3>
        <p>Choose a professional plan to unlock all features and grow your business.</p>
        <button 
          className={styles.viewPlansBtn}
          onClick={() => window.location.href = '/pricing?from=dashboard'}
        >
          Buy Now
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
        <h1 className={styles.title}>Settings</h1>
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
          {activeTab === 'social' && renderSocial()}
          {activeTab === 'billing' && renderBilling()}
          {activeTab === 'notifications' && renderNotifications()}

          {(activeTab === 'profile' || activeTab === 'workspace') && (
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
