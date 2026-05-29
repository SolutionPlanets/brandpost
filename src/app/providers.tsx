'use client';

import { BrandProvider } from '@/contexts/BrandContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <BrandProvider>{children}</BrandProvider>;
}

