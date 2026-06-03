'use client';

import { SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Input } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMemo, useState } from 'react';
import {
  type KnowledgeBaseRow,
  KnowledgeBaseTableBody,
} from '@/app/(app)/knowledge-base/components/knowledge-base-table-columns';

interface KnowledgeBaseAssignedTableProps {
  articles: KnowledgeBaseRow[];
  isLoading?: boolean;
}

export function KnowledgeBaseAssignedTable({ articles, isLoading }: KnowledgeBaseAssignedTableProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return articles;
    return articles.filter(a => {
      const name = a.name.toLowerCase();
      const summary = (a.summary ?? '').toLowerCase();
      return name.includes(needle) || summary.includes(needle);
    });
  }, [articles, debouncedSearch]);

  return (
    <div className="flex flex-col gap-[var(--spacing-system-mf)]">
      <Input
        placeholder="Search for Knowledge Article"
        value={search}
        onChange={e => setSearch(e.target.value)}
        startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
      />
      <KnowledgeBaseTableBody
        items={filtered}
        mode="standard"
        isLoading={isLoading}
        emptyMessage="No articles assigned."
        skeletonRows={3}
      />
    </div>
  );
}
