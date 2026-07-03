'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isOssTenantMode } from '@/lib/app-mode';
import { routes } from '@/lib/routes';
import { ArchitectureTab } from '../components/tabs/architecture';

export default function ArchitecturePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isOssTenantMode()) {
      router.replace(routes.settings.root());
    }
  }, [router]);

  if (!isOssTenantMode()) {
    return null;
  }

  return <ArchitectureTab />;
}
