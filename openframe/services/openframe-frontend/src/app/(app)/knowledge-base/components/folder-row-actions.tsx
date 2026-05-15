'use client';

import { FolderEditIcon, PenEditIcon, TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ActionsMenuGroup } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type ReactNode, useCallback, useState } from 'react';
import { DeleteFolderModal, type DeleteFolderTarget } from './delete-folder-modal';
import { type MoveToFolderItem, MoveToFolderModal } from './move-to-folder-modal';
import { RenameFolderModal, type RenameFolderTarget } from './rename-folder-modal';

export interface FolderActionTarget {
  id: string;
  name: string;
}

interface UseFolderRowActionsArgs {
  sourceConnectionId: string;
  onDeleted?: () => void;
}

interface FolderRowActions {
  buildMenuGroups: (folder: FolderActionTarget) => ActionsMenuGroup[];
  modals: ReactNode;
}

const ICON_CLASS = 'size-[var(--icon-size-icon-size)] text-ods-text-secondary';

export function useFolderRowActions({ sourceConnectionId, onDeleted }: UseFolderRowActionsArgs): FolderRowActions {
  const [renameTarget, setRenameTarget] = useState<RenameFolderTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveToFolderItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteFolderTarget | null>(null);

  const buildMenuGroups = useCallback(
    (folder: FolderActionTarget): ActionsMenuGroup[] => [
      {
        items: [
          {
            id: 'rename',
            label: 'Rename',
            icon: <PenEditIcon className={ICON_CLASS} />,
            onClick: () => setRenameTarget({ id: folder.id, name: folder.name }),
          },
          {
            id: 'move',
            label: 'Move folder',
            icon: <FolderEditIcon className={ICON_CLASS} />,
            onClick: () => setMoveTarget({ id: folder.id, name: folder.name, type: 'folder' }),
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: <TrashIcon className={ICON_CLASS} />,
            onClick: () => setDeleteTarget({ id: folder.id, name: folder.name }),
          },
        ],
      },
    ],
    [],
  );

  const modals = (
    <>
      <RenameFolderModal isOpen={renameTarget !== null} onClose={() => setRenameTarget(null)} folder={renameTarget} />
      <MoveToFolderModal
        isOpen={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
        item={moveTarget}
        sourceConnectionId={sourceConnectionId}
      />
      <DeleteFolderModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        folder={deleteTarget}
        sourceConnectionId={sourceConnectionId}
        onDeleted={onDeleted}
      />
    </>
  );

  return { buildMenuGroups, modals };
}
