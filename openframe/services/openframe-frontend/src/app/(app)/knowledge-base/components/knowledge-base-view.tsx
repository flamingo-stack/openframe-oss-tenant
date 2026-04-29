'use client';

import { BoxArchiveIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageLayout, SearchInput } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { notFound, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { mockKnowledgeBaseItems } from '../mock-data';
import { KnowledgeBaseTable } from './knowledge-base-table';
import { NewFolderModal, type NewFolderResult } from './new-folder-modal';

interface KnowledgeBaseViewProps {
  /** Current folder id. `null` = root level. */
  folderId: string | null;
}

function parentHrefFor(parentFolderId: string | undefined): string {
  return parentFolderId ? `/knowledge-base/folders/${parentFolderId}` : '/knowledge-base';
}

export function KnowledgeBaseView({ folderId }: KnowledgeBaseViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const folder = useMemo(() => {
    if (!folderId) return null;
    const item = mockKnowledgeBaseItems.find(i => i.id === folderId);
    return item && item.type === 'folder' ? item : null;
  }, [folderId]);

  const items = useMemo(
    () =>
      mockKnowledgeBaseItems.filter(item => {
        if (item.type === 'article' && item.status === 'ARCHIVED') return false;
        const parent = item.type === 'folder' ? (item.parentFolderId ?? null) : (item.folderId ?? null);
        return parent === (folder?.id ?? null);
      }),
    [folder?.id],
  );

  if (folderId !== null && !folder) {
    notFound();
  }

  const handleFolderCreated = (created: NewFolderResult) => {
    mockKnowledgeBaseItems.push({
      id: created.id,
      type: 'folder',
      name: created.name,
      ...(folder ? { parentFolderId: folder.id } : {}),
    });
    setRefreshKey(k => k + 1);
  };

  const newArticleHref = folder ? `/knowledge-base/new?folderId=${folder.id}` : '/knowledge-base/new';

  return (
    <PageLayout
      title={folder ? folder.name : 'Knowledge Base'}
      background="default"
      backButton={
        folder ? { label: 'Back', onClick: () => router.push(parentHrefFor(folder.parentFolderId)) } : undefined
      }
      actionsVariant="primary-buttons"
      actions={[
        {
          label: 'Archive',
          href: '/knowledge-base/archive',
          icon: <BoxArchiveIcon size={24} />,
          variant: 'card',
        },
        {
          label: 'New Folder',
          onClick: () => setIsNewFolderOpen(true),
          icon: <PlusCircleIcon size={24} />,
          variant: 'card',
        },
        {
          label: 'Add Article',
          href: newArticleHref,
          icon: <PlusCircleIcon size={24} />,
          variant: 'primary',
        },
      ]}
    >
      <SearchInput placeholder="Search for Articles" value={search} onChange={setSearch} />
      <KnowledgeBaseTable key={refreshKey} items={items} />
      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        parentFolderId={folder?.id ?? null}
        onCreated={handleFolderCreated}
      />
    </PageLayout>
  );
}
