'use client';

import { Chevron02DownIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuItem,
  Button,
  InputTrigger,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import {
  buildFolderTree,
  getKnowledgeBaseArticlesConnectionId,
  getKnowledgeBaseFoldersConnectionId,
  useKnowledgeBaseFolders,
} from '../hooks/use-knowledge-base-items';
import { useMoveToFolder } from '../hooks/use-move-to-folder';
import { buildFolderMenuItemsWithRoot, type FolderMenuTarget } from './folder-menu-items';

export interface MoveToFolderItem {
  id: string;
  name: string;
  type: 'folder' | 'article';
}

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MoveToFolderItem | null;
  sourceConnectionId: string;
}

interface FolderPickerProps {
  selected: FolderMenuTarget | null;
  onSelect: (target: FolderMenuTarget) => void;
  excludeFolderId: string | null;
}

function FolderPicker({ selected, onSelect, excludeFolderId }: FolderPickerProps) {
  const folders = useKnowledgeBaseFolders();
  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const groups = useMemo<{ items: ActionsMenuItem[] }[]>(
    () => [{ items: buildFolderMenuItemsWithRoot(tree, onSelect, { excludeFolderId }) }],
    [tree, excludeFolderId, onSelect],
  );

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
          placeholder="Select Folder"
          endIcon={<Chevron02DownIcon className="size-6" />}
        />
      }
    />
  );
}

function FolderPickerSkeleton() {
  return <div className="h-12 w-full rounded-[6px] bg-ods-card animate-pulse" />;
}

export function MoveToFolderModal({ isOpen, onClose, item, sourceConnectionId }: MoveToFolderModalProps) {
  const { toast } = useToast();
  const { moveToFolder, isPending } = useMoveToFolder();
  const [selected, setSelected] = useState<FolderMenuTarget | null>(null);

  useEffect(() => {
    if (!isOpen) setSelected(null);
  }, [isOpen]);

  const excludeFolderId = item?.type === 'folder' ? item.id : null;

  const handleConfirm = async () => {
    if (!item || !selected || isPending) return;
    const targetConnectionId =
      item.type === 'folder'
        ? getKnowledgeBaseFoldersConnectionId({ parentId: selected.id, search: null, tagIds: [] })
        : getKnowledgeBaseArticlesConnectionId({ parentId: selected.id, search: null, tagIds: [] });
    try {
      await moveToFolder({
        id: item.id,
        parentId: selected.id,
        removeFromConnections: [sourceConnectionId],
        appendToConnections: [targetConnectionId],
      });
      toast({
        title: 'Moved',
        description: `${item.name} moved to ${selected.name}`,
        variant: 'success',
      });
      onClose();
    } catch {}
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title="Move to Folder"
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
            disabled={!selected || !item || isPending}
            loading={isPending}
          >
            {isPending ? 'Moving...' : 'Move'}
          </Button>
        </>
      }
    >
      <p className="text-h4 text-ods-text-primary">Folder Name</p>
      {item ? (
        <Suspense fallback={<FolderPickerSkeleton />}>
          <FolderPicker selected={selected} onSelect={setSelected} excludeFolderId={excludeFolderId} />
        </Suspense>
      ) : (
        <FolderPickerSkeleton />
      )}
    </SimpleModal>
  );
}
