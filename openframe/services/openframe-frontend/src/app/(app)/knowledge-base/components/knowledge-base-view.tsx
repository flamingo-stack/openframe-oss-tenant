'use client';

import { BoxArchiveIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageLayout, SearchInput } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { notFound, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { getKnowledgeBaseItemsConnectionId } from '../hooks/use-knowledge-base-items';
import { useKnowledgeBaseItem } from '../hooks/use-knowledge-base-item';
import { KnowledgeBaseTable } from './knowledge-base-table';
import { NewFolderModal } from './new-folder-modal';

interface KnowledgeBaseViewProps {
  /** Current folder id. `null` = root level. */
  folderId: string | null;
}

function parentHrefFor(parentFolderId: string | null | undefined): string {
  return parentFolderId ? `/knowledge-base/folders/${parentFolderId}` : '/knowledge-base';
}

interface FolderHeaderProps {
  folderId: string;
  onResolved: (header: { name: string; parentId: string | null }) => void;
}

/**
 * Suspense boundary that fetches the folder header. Lifts the resolved name and
 * parentId up via callback so the outer view can render the page title and back
 * button without nested Suspense flicker.
 */
function FolderHeaderResolver({ folderId, onResolved }: FolderHeaderProps) {
  const folder = useKnowledgeBaseItem(folderId);
  if (!folder || folder.type !== 'FOLDER') {
    notFound();
  }
  onResolved({ name: folder.name, parentId: folder.parentId ?? null });
  return null;
}

export function KnowledgeBaseView({ folderId }: KnowledgeBaseViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [folderHeader, setFolderHeader] = useState<{ name: string; parentId: string | null } | null>(null);

  const connectionId = getKnowledgeBaseItemsConnectionId({
    parentId: folderId,
    search: debouncedSearch || null,
  });

  const newArticleHref = folderId ? `/knowledge-base/new?folderId=${folderId}` : '/knowledge-base/new';

  const title = folderId ? (folderHeader?.name ?? 'Folder') : 'Knowledge Base';
  const backButton = folderId
    ? {
        label: 'Back',
        onClick: () => router.push(parentHrefFor(folderHeader?.parentId)),
      }
    : undefined;

  return (
    <PageLayout
      title={title}
      background="default"
      backButton={backButton}
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
      {folderId ? (
        <Suspense fallback={null}>
          <FolderHeaderResolver folderId={folderId} onResolved={setFolderHeader} />
        </Suspense>
      ) : null}

      <SearchInput placeholder="Search for Articles" value={search} onChange={setSearch} />

      <KnowledgeBaseTable parentId={folderId} search={debouncedSearch} />

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        parentFolderId={folderId}
        parentConnectionId={connectionId}
      />
    </PageLayout>
  );
}
