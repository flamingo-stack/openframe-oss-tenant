'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../../components/app-layout';
import { ArchitectureTab } from '../components/tabs/architecture';

export default function ArchitecturePage() {
  return (
    <AppLayout mainClassName="pt-0 sm:pt-0">
      <ArchitectureTab />
    </AppLayout>
  );
}
