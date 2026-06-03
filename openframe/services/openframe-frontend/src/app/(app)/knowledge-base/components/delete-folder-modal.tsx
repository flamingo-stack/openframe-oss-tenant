'use client';

import { Chevron02DownIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuItem,
  InputTrigger,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
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
  onDeleted?: () => void;
}

type DeleteSelection = { kind: 'archive' } | { kind: 'move'; target: FolderMenuTarget };

const DEFAULT_SELECTION: DeleteSelection = { kind: 'archive' };

function selectionLabel(selection: DeleteSelection): string {
  return selection.kind === 'archive' ? ARCHIVE_LABEL : selection.target.name;
}

interface FolderPickerProps {
  selection: DeleteSelection;
  onSelect: (selection: DeleteSelection) => void;
  excludeFolderId: string;
  disabled?: boolean;
}

function FolderPicker({ selection, onSelect, excludeFolderId, disabled }: FolderPickerProps) {
  const folders = useKnowledgeBaseFolders();
  const tree = useMemo(() => buildFolderTree(folders), [folders]);

  const groups = useMemo<{ items: ActionsMenuItem[] }[]>(
    () => [
      {
        items: [
          {
            id: '__archive__',
            label: ARCHIVE_LABEL,
            onClick: () => onSelect({ kind: 'archive' }),
          },
          ...buildFolderMenuItemsWithRoot(tree, target => onSelect({ kind: 'move', target }), {
            excludeFolderId,
          }),
        ],
      },
    ],
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
          selectedLabel={selectionLabel(selection)}
          endIcon={<Chevron02DownIcon className="size-6" />}
          disabled={disabled}
        />
      }
    />
  );
}

function FolderPickerSkeleton() {
  return <div className="h-12 w-full rounded-[6px] bg-ods-card animate-pulse" />;
}

export function DeleteFolderModal({ isOpen, onClose, folder, sourceConnectionId, onDeleted }: DeleteFolderModalProps) {
  const { toast } = useToast();
  const { deleteFolder, isPending } = useDeleteFolder();
  const [selection, setSelection] = useState<DeleteSelection>(DEFAULT_SELECTION);

  useEffect(() => {
    if (!isOpen) setSelection(DEFAULT_SELECTION);
  }, [isOpen]);

  if (!folder) return null;

  const handleConfirm = () => {
    const childrenAction: FolderChildrenAction = selection.kind === 'archive' ? 'ARCHIVE' : 'MOVE';
    deleteFolder({
      id: folder.id,
      childrenAction,
      moveTargetFolderId: selection.kind === 'move' ? selection.target.id : null,
      connections: [sourceConnectionId],
      onCompleted: () => {
        toast({ title: 'Folder deleted', description: folder.name, variant: 'success' });
        onDeleted?.();
        onClose();
      },
    });
  };

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}
      title="Delete Folder"
      description={
        <>
          Are you sure you want to delete <span className="text-ods-error">{folder.name}</span> folder? All articles
          inside will be archived or moved.
        </>
      }
      confirmLabel="Delete Folder"
      pendingLabel="Deleting..."
      variant="destructive"
      isPending={isPending}
      onConfirm={handleConfirm}
      extraContent={
        <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <p className="text-h4 text-ods-text-primary">Move Articles to</p>
          <Suspense fallback={<FolderPickerSkeleton />}>
            <FolderPicker
              selection={selection}
              onSelect={setSelection}
              excludeFolderId={folder.id}
              disabled={isPending}
            />
          </Suspense>
        </div>
      }
    />
  );
}
