'use client';

import {
  Button,
  ModalV2,
  ModalV2Content,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { type FolderChildrenAction, useDeleteFolder } from '../hooks/use-delete-folder';
import { useKnowledgeBaseFolders } from '../hooks/use-knowledge-base-items';

const ARCHIVE_VALUE = '__archive__';

export interface DeleteFolderTarget {
  id: string;
  name: string;
}

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: DeleteFolderTarget | null;
  /** Connection ID of the parent folder's items list — the deleted folder is removed from here. */
  sourceConnectionId: string;
}

interface DeleteFolderContentProps {
  onClose: () => void;
  folder: DeleteFolderTarget;
  sourceConnectionId: string;
}

function DeleteFolderContent({ onClose, folder, sourceConnectionId }: DeleteFolderContentProps) {
  const { toast } = useToast();
  const { deleteFolder, isPending } = useDeleteFolder();
  const folders = useKnowledgeBaseFolders();
  const [moveTarget, setMoveTarget] = useState<string>(ARCHIVE_VALUE);

  useEffect(() => {
    setMoveTarget(ARCHIVE_VALUE);
  }, []);

  const moveOptions = useMemo(() => folders.filter(f => f.id !== folder.id), [folders, folder.id]);

  const handleConfirm = () => {
    const childrenAction: FolderChildrenAction = moveTarget === ARCHIVE_VALUE ? 'ARCHIVE' : 'MOVE';
    deleteFolder({
      id: folder.id,
      childrenAction,
      moveTargetFolderId: childrenAction === 'MOVE' ? moveTarget : null,
      connections: [sourceConnectionId],
      onCompleted: () => {
        toast({ title: 'Folder deleted', description: folder.name, variant: 'success' });
        onClose();
      },
    });
  };

  return (
    <>
      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-l)]">
        <p className="text-h4 text-ods-text-primary">
          Are you sure you want to delete <span className="text-ods-error">{folder.name}</span> folder? All articles
          inside will be archived or moved.
        </p>

        <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <p className="text-h4 text-ods-text-primary">Move Articles to</p>
          <Select value={moveTarget} onValueChange={setMoveTarget} disabled={isPending}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ARCHIVE_VALUE}>Don't Move and Archive</SelectItem>
              {moveOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
