'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AiSettings } from '@/app/(app)/settings/ai-settings/components/ai-settings-view';
import { isSaasTenantMode } from '@/lib/app-mode';

export const dynamic = 'force-dynamic';

export default function AiSettingsPage() {
  const router = useRouter();

  // AI Settings relies on the openframe-saas-ai-agent service (/chat/graphql),
  // which doesn't exist in self-hosted — keep it saas-tenant only.
  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard');
    }
  }, [router]);

  if (!isSaasTenantMode()) {
    return null;
  }

  return <AiSettings />;
}
