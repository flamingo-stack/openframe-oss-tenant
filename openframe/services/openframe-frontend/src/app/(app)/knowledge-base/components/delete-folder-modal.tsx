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
import { type FolderChildrenAction, useDeleteFolder } from '../hooks/use-delete-folder';
import { buildFolderTree, useKnowledgeBaseFolders } from '../hooks/use-knowledge-base-items';
import { buildFolderMenuItemsWithRoot, type FolderMenuTarget } from './folder-menu-items';

const ARCHIVE_LABEL = "Don't Move and Archive";

export interface DeleteFolderTarget {
  id: string;
  name: string;
}

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: DeleteFolderTarget | null;
  sourceConnectionId: string;
}

interface DeleteFolderContentProps {
  onClose: () => void;
  folder: DeleteFolderTarget;
  sourceConnectionId: string;
}

type DeleteSelection = { kind: 'archive' } | { kind: 'move'; target: FolderMenuTarget };

const DEFAULT_SELECTION: DeleteSelection = { kind: 'archive' };

function selectionLabel(selection: DeleteSelection): string {
  return selection.kind === 'archive' ? ARCHIVE_LABEL : selection.target.name;
}

function DeleteFolderContent({ onClose, folder, sourceConnectionId }: DeleteFolderContentProps) {
  const { toast } = useToast();
  const { deleteFolder, isPending } = useDeleteFolder();
  const folders = useKnowledgeBaseFolders();
  const [selection, setSelection] = useState<DeleteSelection>(DEFAULT_SELECTION);

  const tree = useMemo(() => buildFolderTree(folders), [folders]);

  const groups = useMemo<{ items: ActionsMenuItem[] }[]>(
    () => [
      {
        items: [
          {
            id: '__archive__',
            label: ARCHIVE_LABEL,
            onClick: () => setSelection({ kind: 'archive' }),
          },
          ...buildFolderMenuItemsWithRoot(tree, target => setSelection({ kind: 'move', target }), {
            excludeFolderId: folder.id,
          }),
        ],
      },
    ],
    [tree, folder.id],
  );

  const handleConfirm = () => {
    const childrenAction: FolderChildrenAction = selection.kind === 'archive' ? 'ARCHIVE' : 'MOVE';
    deleteFolder({
      id: folder.id,
      childrenAction,
      moveTargetFolderId: selection.kind === 'move' ? selection.target.id : null,
      connections: [sourceConnectionId],
      onCompleted: () => {
        toast({ title: 'Folder deleted', description: folder.name, variant: 'success' });
        onClose();
      },
    });
  };

  return (
    <>
      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-l)] overflow-visible">
        <p className="text-h4 text-ods-text-primary">
          Are you sure you want to delete <span className="text-ods-error">{folder.name}</span> folder? All articles
          inside will be archived or moved.
        </p>

        <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <p className="text-h4 text-ods-text-primary">Move Articles to</p>
          <ActionsMenuDropdown
            groups={groups}
            align="start"
            side="bottom"
            sideOffset={4}
            contentClassName="z-[1400]"
            customTrigger={
              <InputTrigger
                selectedLabel={selectionLabel(selection)}
                endIcon={<Chevron02DownIcon className="size-6" />}
                disabled={isPending}
              />
            }
          />
        </div>
      </ModalV2Content>

      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleConfirm}
          disabled={isPending}
          loading={isPending}
        >
          {isPending ? 'Deleting...' : 'Delete Folder'}
        </Button>
      </ModalV2Footer>
    </>
  );
}

function DeleteFolderContentSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-l)]">
        <div className="h-6 w-3/4 rounded bg-ods-card animate-pulse" />
        <div className="h-12 w-full rounded-[6px] bg-ods-card animate-pulse" />
      </ModalV2Content>
      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" className="flex-1" disabled>
          Delete Folder
        </Button>
      </ModalV2Footer>
    </>
  );
}

export function DeleteFolderModal({ isOpen, onClose, folder, sourceConnectionId }: DeleteFolderModalProps) {
  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>Delete Folder</ModalV2Title>
      </ModalV2Header>
      {isOpen && folder ? (
        <Suspense fallback={<DeleteFolderContentSkeleton onClose={onClose} />}>
          <DeleteFolderContent onClose={onClose} folder={folder} sourceConnectionId={sourceConnectionId} />
        </Suspense>
      ) : (
        <DeleteFolderContentSkeleton onClose={onClose} />
      )}
    </ModalV2>
  );
}
