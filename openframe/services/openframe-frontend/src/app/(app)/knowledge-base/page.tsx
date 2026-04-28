'use client';

import { BoxArchiveIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageLayout, SearchInput } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useState } from 'react';

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState('');

  return (
    <PageLayout
      title="Knowledge Base"
      background="default"
      actionsVariant="primary-buttons"
      actions={[
        {
          label: 'Archive',
          onClick: () => {},
          icon: <BoxArchiveIcon size={24} />,
          variant: 'card',
        },
        {
          label: 'New Folder',
          onClick: () => {},
          icon: <PlusCircleIcon size={24} />,
          variant: 'card',
        },
        {
          label: 'Add Article',
          onClick: () => {},
          icon: <PlusCircleIcon size={24} />,
          variant: 'primary',
        },
      ]}
    >
      <SearchInput placeholder="Search for Articles" value={search} onChange={setSearch} />
      <p className="text-ods-text-secondary">Knowledge Base coming soon.</p>
    </PageLayout>
  );
}

export const dynamic = 'force-dynamic';
