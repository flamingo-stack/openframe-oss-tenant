'use client';

export const dynamic = 'force-dynamic';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { ScriptsTable } from '../scripts/v2/components/scripts-table';

export default function ScriptsV2Page() {
  return (
    <ContentPageContainer className="p-[var(--spacing-system-l)]" padding="none" showHeader={false}>
      <ScriptsTable />
    </ContentPageContainer>
  );
}
