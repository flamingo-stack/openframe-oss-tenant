'use client';

export const dynamic = 'force-dynamic';

import { DevicesPanel } from '@/app/components/shared';

export default function Devices() {
  return <DevicesPanel className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]" />;
}
