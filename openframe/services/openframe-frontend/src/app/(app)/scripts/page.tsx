'use client';

export const dynamic = 'force-dynamic';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { ScriptsView } from './components/scripts-view';

export default function Scripts() {
  return (
    <ContentPageContainer className="p-[var(--spacing-system-l)]" padding="none" showHeader={false}>
      <ScriptsView />
    </ContentPageContainer>
  );
}
