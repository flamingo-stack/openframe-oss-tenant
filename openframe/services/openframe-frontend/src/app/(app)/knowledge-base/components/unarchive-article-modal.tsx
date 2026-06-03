'use client';

import { Chevron02DownIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { ActionsMenuDropdown, Button, InputTrigger } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import {
  buildFolderTree,
  getKnowledgeBaseArticlesConnectionId,
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

interface FolderPickerProps {
  selected: FolderMenuTarget | null;
  onSelect: (target: FolderMenuTarget) => void;
}

function FolderPicker({ selected, onSelect }: FolderPickerProps) {
  const folders = useKnowledgeBaseFolders();
  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const groups = useMemo(() => [{ items: buildFolderMenuItemsWithRoot(tree, onSelect) }], [tree, onSelect]);

  return (
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
  );
}

function FolderPickerSkeleton() {
  return <div className="h-12 w-full rounded-[6px] bg-ods-card animate-pulse" />;
}

export function UnarchiveArticleModal({ isOpen, onClose, article, sourceConnectionId }: UnarchiveArticleModalProps) {
  const { toast } = useToast();
  const { unarchiveArticle, isPending } = useUnarchiveArticle();
  const [selected, setSelected] = useState<FolderMenuTarget | null>(null);

  useEffect(() => {
    if (!isOpen) setSelected(null);
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!article || !selected || isPending) return;
    const targetConnectionId =
      selected.id === null
        ? null
        : getKnowledgeBaseArticlesConnectionId({ parentId: selected.id, search: null, tagIds: [] });
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
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title="Unarchive Article"
      contentClassName="flex flex-col gap-[var(--spacing-system-xxs)] overflow-visible"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="accent"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!selected || !article || isPending}
            loading={isPending}
          >
            {isPending ? 'Restoring...' : 'Unarchive'}
          </Button>
        </>
      }
    >
      <p className="text-h4 text-ods-text-primary">Restore To</p>
      {article ? (
        <Suspense fallback={<FolderPickerSkeleton />}>
          <FolderPicker selected={selected} onSelect={setSelected} />
        </Suspense>
      ) : (
        <FolderPickerSkeleton />
      )}
    </SimpleModal>
  );
}
