'use client';

import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import { mockKnowledgeBaseTags } from '../mock-data';

interface ArticleTagsManagerProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function ArticleTagsManager({ selected, onChange, disabled }: ArticleTagsManagerProps) {
  const options = useMemo(() => {
    const merged = Array.from(new Set([...mockKnowledgeBaseTags, ...selected]));
    return merged.map(tag => ({ label: tag, value: tag }));
  }, [selected]);

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
