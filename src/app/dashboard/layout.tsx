'use strict';
'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={styles.container}>
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      
      <main className={`${styles.main} ${sidebarCollapsed ? styles.expanded : ''}`}>
        <Header />
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
