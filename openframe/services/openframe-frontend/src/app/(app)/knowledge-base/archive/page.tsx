'use client';

import { PageLayout, SearchInput } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { notFound, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { KnowledgeBaseTable } from '../components/knowledge-base-table';
import { type KnowledgeBaseArticle, mockKnowledgeBaseItems } from '../mock-data';

export default function ArchivePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const archivedArticles = useMemo(
    () =>
      mockKnowledgeBaseItems.filter(
        (item): item is KnowledgeBaseArticle => item.type === 'article' && item.status === 'ARCHIVED',
      ),
    [],
  );

  const filteredArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return archivedArticles;
    return archivedArticles.filter(
      item => item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query),
    );
  }, [archivedArticles, search]);

  if (!featureFlags.knowledgeBase.enabled()) {
    notFound();
  }

  return (
    <PageLayout
      title="Archived Articles"
      background="default"
      backButton={{ label: 'Back to Knowledge Base', onClick: () => router.push('/knowledge-base') }}
    >
      <SearchInput placeholder="Search archived articles" value={search} onChange={setSearch} />
      <KnowledgeBaseTable
        items={filteredArticles}
        emptyMessage={search ? 'No archived articles match your search.' : 'No archived articles.'}
      />
    </PageLayout>
  );
}

export const dynamic = 'force-dynamic';
