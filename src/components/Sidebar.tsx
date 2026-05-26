import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Palette, 
  PenSquare,
  Clock,
  CalendarDays, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Composer', icon: PenSquare, href: '/dashboard/composer' },
  { name: 'Brand Kit', icon: Palette, href: '/dashboard/brand-kit' },
  { name: 'Calendar', icon: CalendarDays, href: '/dashboard/calendar' },
  { name: 'History', icon: Clock, href: '/dashboard/posts' },
  { name: 'Plans', icon: CreditCard, href: '/pricing?from=dashboard' },
  { name: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}>B</div>
        {!collapsed && <span className={styles.logoText}>BrandPost<span>AI</span></span>}
      </div>

      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <item.icon size={22} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button className={styles.navItem}>
          <LogOut size={22} />
          {!collapsed && <span>Logout</span>}
        </button>
        <button 
          className={styles.toggleBtn}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
