'use client';

import { PageLayout, SearchInput } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { notFound, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArchivedArticlesTable } from '@/app/(app)/knowledge-base/components/knowledge-base-table';
import { featureFlags } from '@/lib/feature-flags';

export default function ArchivePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  if (!featureFlags.knowledgeBase.enabled()) {
    notFound();
  }

  return (
    <PageLayout
      title="Archived Articles"
      backButton={{ label: 'Back to Knowledge Base', onClick: () => router.push('/knowledge-base') }}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <SearchInput placeholder="Search archived articles" value={search} onChange={setSearch} />
      <ArchivedArticlesTable
        search={debouncedSearch}
        emptyMessage={search ? 'No archived articles match your search.' : 'No archived articles.'}
      />
    </PageLayout>
  );
}

export const dynamic = 'force-dynamic';
