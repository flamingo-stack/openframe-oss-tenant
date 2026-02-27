'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../components/app-layout';
import { ScriptsView } from './components/scripts-view';

export default function Scripts() {
  return (
    <AppLayout mainClassName="pt-0 sm:pt-0">
      <ScriptsView />
    </AppLayout>
  );
}
