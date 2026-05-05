'use client';

import { Chevron02DownIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  Button,
  InputTrigger,
  ModalV2,
  ModalV2Content,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useMemo, useState } from 'react';
import {
  buildFolderTree,
  getKnowledgeBaseItemsConnectionId,
  KNOWLEDGE_BASE_ROOT_LABEL,
  useKnowledgeBaseFolders,
} from '../hooks/use-knowledge-base-items';
import { useUnarchiveArticle } from '../hooks/use-unarchive-article';
import { buildFolderMenuItemsWithRoot, type FolderMenuTarget } from './folder-menu-items';

export interface UnarchiveArticleTarget {
  id: string;
  name: string;
}

interface UnarchiveArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: UnarchiveArticleTarget | null;
  sourceConnectionId: string;
}

interface UnarchiveContentProps {
  onClose: () => void;
  article: UnarchiveArticleTarget;
  sourceConnectionId: string;
}

function UnarchiveContent({ onClose, article, sourceConnectionId }: UnarchiveContentProps) {
  const { toast } = useToast();
  const { unarchiveArticle, isPending } = useUnarchiveArticle();
  const folders = useKnowledgeBaseFolders();
  const [selected, setSelected] = useState<FolderMenuTarget | null>(null);

  const tree = useMemo(() => buildFolderTree(folders), [folders]);

  const groups = useMemo(() => [{ items: buildFolderMenuItemsWithRoot(tree, setSelected) }], [tree]);

  const handleConfirm = async () => {
    if (!selected || isPending) return;
    const targetConnectionId =
      selected.id === null ? null : getKnowledgeBaseItemsConnectionId({ parentId: selected.id, search: null });
    try {
      await unarchiveArticle({
        id: article.id,
        parentId: selected.id,
        removeFromConnections: [sourceConnectionId],
        appendToConnections: targetConnectionId ? [targetConnectionId] : [],
      });
      toast({ title: 'Unarchived', description: `${article.name} restored`, variant: 'success' });
      onClose();
    } catch {}
  };

  return (
    <>
      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-xxs)] overflow-visible">
        <p className="text-h4 text-ods-text-primary">Restore To</p>
        <ActionsMenuDropdown
          groups={groups}
          align="start"
          side="bottom"
          sideOffset={4}
          contentClassName="z-[1400]"
          customTrigger={
            <InputTrigger
              selectedLabel={selected?.name}
              placeholder={KNOWLEDGE_BASE_ROOT_LABEL}
              endIcon={<Chevron02DownIcon className="size-6" />}
            />
          }
        />
      </ModalV2Content>

      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="accent"
          className="flex-1"
          onClick={handleConfirm}
          disabled={!selected || isPending}
          loading={isPending}
        >
          {isPending ? 'Restoring...' : 'Unarchive'}
        </Button>
      </ModalV2Footer>
    </>
  );
}

function UnarchiveContentSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-xxs)]">
        <p className="text-h4 text-ods-text-primary">Restore To</p>
        <div className="h-12 w-full rounded-[6px] bg-ods-card animate-pulse" />
      </ModalV2Content>
      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="accent" className="flex-1" disabled>
          Unarchive
        </Button>
      </ModalV2Footer>
    </>
  );
}

export function UnarchiveArticleModal({ isOpen, onClose, article, sourceConnectionId }: UnarchiveArticleModalProps) {
  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>Unarchive Article</ModalV2Title>
      </ModalV2Header>
      {isOpen && article ? (
        <Suspense fallback={<UnarchiveContentSkeleton onClose={onClose} />}>
          <UnarchiveContent onClose={onClose} article={article} sourceConnectionId={sourceConnectionId} />
        </Suspense>
      ) : (
        <UnarchiveContentSkeleton onClose={onClose} />
      )}
    </ModalV2>
  );
}
