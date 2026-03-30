'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../../components/app-layout';
import { ArchitectureTab } from '../components/tabs/architecture';

export default function IntegratedToolsPage() {
  return (
    <AppLayout mainClassName="pt-0 sm:pt-0">
      <ArchitectureTab title="Integrated Tools" />
    </AppLayout>
  );
}
