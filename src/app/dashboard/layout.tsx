'use strict';
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import styles from './DashboardLayout.module.css';

import { BrandProvider, useBrand } from '@/contexts/BrandContext';
import { Loader2 } from 'lucide-react';

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, hasBrandKit } = useBrand();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && hasBrandKit === false) {
      router.push('/onboarding');
    }
  }, [isLoading, hasBrandKit, router]);

  if (isLoading || hasBrandKit === false) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={32} color="var(--primary)" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <BrandProvider>
      <DashboardGuard>
        <div className={styles.container}>
          <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
          
          <main className={`${styles.main} ${sidebarCollapsed ? styles.expanded : ''}`}>
            <Header />
            <div className={styles.content}>
              {children}
            </div>
          </main>
        </div>
      </DashboardGuard>
    </BrandProvider>
  );
}
