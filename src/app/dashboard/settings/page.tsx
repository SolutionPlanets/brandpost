'use client';

import { useState } from 'react';
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Key,
  Save,
  Check,
} from 'lucide-react';
import styles from './Settings.module.css';

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

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderProfile = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Profile Settings</h2>
      <p className={styles.sectionDesc}>Manage your personal account details.</p>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label>Full Name</label>
          <input type="text" defaultValue="Alex Johnson" />
        </div>
        <div className={styles.formGroup}>
          <label>Email</label>
          <input type="email" defaultValue="alex@brandpost.ai" />
        </div>
        <div className={styles.formGroup}>
          <label>Role</label>
          <input type="text" defaultValue="Brand Manager" disabled />
        </div>
        <div className={styles.formGroup}>
          <label>Timezone</label>
          <select defaultValue="Asia/Kolkata">
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          </select>
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
          <input type="text" defaultValue="My Brand" />
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

      <div className={styles.apiSection}>
        <h3><Key size={16} /> API Keys</h3>
        <p className={styles.apiDesc}>These keys are required for AI generation and social media publishing.</p>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Claude API Key</label>
            <input type="password" placeholder="sk-ant-..." defaultValue="" />
          </div>
          <div className={styles.formGroup}>
            <label>OpenAI API Key (DALL·E)</label>
            <input type="password" placeholder="sk-..." defaultValue="" />
          </div>
          <div className={styles.formGroup}>
            <label>Meta App ID</label>
            <input type="text" placeholder="Your Meta App ID" defaultValue="" />
          </div>
          <div className={styles.formGroup}>
            <label>Meta App Secret</label>
            <input type="password" placeholder="Your Meta App Secret" defaultValue="" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Billing & Plan</h2>
      <p className={styles.sectionDesc}>Manage your subscription and payment details.</p>

      <div className={styles.planCard}>
        <div className={styles.planInfo}>
          <div className={styles.planBadge}>Current Plan</div>
          <h3 className={styles.planName}>Solo Plan</h3>
          <p className={styles.planPrice}>Free <span>during trial</span></p>
          <p className={styles.planTrial}>Trial ends: May 4, 2026</p>
        </div>
        <div className={styles.planFeatures}>
          <div className={styles.planFeature}><Check size={14} /> 50 AI posts/month</div>
          <div className={styles.planFeature}><Check size={14} /> 1 Workspace</div>
          <div className={styles.planFeature}><Check size={14} /> 1 Brand Kit</div>
          <div className={styles.planFeature}><Check size={14} /> Facebook & Instagram</div>
        </div>
      </div>

      <div className={styles.upgradeGrid}>
        {[
          { name: 'SMB', price: '₹1,999/mo', posts: '200 posts/mo', kits: '3 Brand Kits' },
          { name: 'Agency', price: '₹4,999/mo', posts: '500 posts/mo', kits: '10 Brand Kits' },
          { name: 'Franchise', price: 'Custom', posts: 'Unlimited posts', kits: 'Unlimited Kits' },
        ].map((plan) => (
          <div key={plan.name} className={styles.upgradePlan}>
            <h4>{plan.name}</h4>
            <p className={styles.upgradePlanPrice}>{plan.price}</p>
            <ul>
              <li>{plan.posts}</li>
              <li>{plan.kits}</li>
            </ul>
            <button className={styles.upgradeBtn}>Upgrade</button>
          </div>
        ))}
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
