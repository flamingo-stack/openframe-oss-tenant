'use client';

import { Chevron02DownIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuItem,
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

interface MoveToFolderContentProps {
  onClose: () => void;
  itemNonNull: MoveToFolderItem;
  sourceConnectionId: string;
}

function MoveToFolderContent({ onClose, itemNonNull, sourceConnectionId }: MoveToFolderContentProps) {
  const { toast } = useToast();
  const { moveToFolder, isPending } = useMoveToFolder();
  const folders = useKnowledgeBaseFolders();
  const [selected, setSelected] = useState<FolderMenuTarget | null>(null);

  const tree = useMemo(() => buildFolderTree(folders), [folders]);

  const excludeFolderId = itemNonNull.type === 'folder' ? itemNonNull.id : null;

  const groups = useMemo<{ items: ActionsMenuItem[] }[]>(
    () => [{ items: buildFolderMenuItemsWithRoot(tree, setSelected, { excludeFolderId }) }],
    [tree, excludeFolderId],
  );

  const handleConfirm = async () => {
    if (!selected || isPending) return;
    const targetConnectionId = getKnowledgeBaseItemsConnectionId({ parentId: selected.id, search: null });
    try {
      await moveToFolder({
        id: itemNonNull.id,
        parentId: selected.id,
        removeFromConnections: [sourceConnectionId],
        appendToConnections: [targetConnectionId],
      });
      toast({
        title: 'Moved',
        description: `${itemNonNull.name} moved to ${selected.name}`,
        variant: 'success',
      });
      onClose();
    } catch {}
  };

  return (
    <>
      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-xxs)] overflow-visible">
        <p className="text-h4 text-ods-text-primary">Folder Name</p>
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
          {isPending ? 'Moving...' : 'Move'}
        </Button>
      </ModalV2Footer>
    </>
  );
}

function MoveToFolderContentSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-xxs)]">
        <p className="text-h4 text-ods-text-primary">Folder Name</p>
        <div className="h-12 w-full rounded-[6px] bg-ods-card animate-pulse" />
      </ModalV2Content>
      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="accent" className="flex-1" disabled>
          Move
        </Button>
      </ModalV2Footer>
    </>
  );
}

export function MoveToFolderModal({ isOpen, onClose, item, sourceConnectionId }: MoveToFolderModalProps) {
  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>Move to Folder</ModalV2Title>
      </ModalV2Header>
      {isOpen && item ? (
        <Suspense fallback={<MoveToFolderContentSkeleton onClose={onClose} />}>
          <MoveToFolderContent onClose={onClose} itemNonNull={item} sourceConnectionId={sourceConnectionId} />
        </Suspense>
      ) : (
        <MoveToFolderContentSkeleton onClose={onClose} />
      )}
    </ModalV2>
  );
}
