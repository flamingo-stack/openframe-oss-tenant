'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../../components/app-layout';
import { ArchitectureTab } from '../components/tabs/architecture';

export default function ArchitecturePage() {
  return (
    <AppLayout>
      <ArchitectureTab />
    </AppLayout>
  );
}
