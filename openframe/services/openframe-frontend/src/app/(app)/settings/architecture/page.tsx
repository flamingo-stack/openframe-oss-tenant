'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isOssTenantMode } from '@/lib/app-mode';
import { ArchitectureTab } from '../components/tabs/architecture';

export default function ArchitecturePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isOssTenantMode()) {
      router.replace('/settings');
    }
  }, [router]);

  if (!isOssTenantMode()) {
    return null;
  }

  return <ArchitectureTab />;
}
