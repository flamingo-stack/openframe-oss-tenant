'use client';

import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import type { KnowledgeBaseTag } from '../hooks/use-knowledge-base-tags';

interface ArticleTagsManagerProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  availableTags: ReadonlyArray<KnowledgeBaseTag>;
  disabled?: boolean;
}

export function ArticleTagsManager({ selected, onChange, availableTags, disabled }: ArticleTagsManagerProps) {
  const options = useMemo(() => {
    const keys = new Set<string>(availableTags.map(t => t.key));
    for (const key of selected) keys.add(key);
    return Array.from(keys).map(key => ({ label: key, value: key }));
  }, [availableTags, selected]);

  return (
    <Autocomplete
      multiple
      creatable
      freeSolo
      label="Search and add Tags"
      placeholder={selected.length > 0 ? 'Add more...' : 'Select or create tags...'}
      options={options}
      value={selected}
      onChange={onChange}
      disabled={disabled}
      showChevron={false}
    />
  );
}
