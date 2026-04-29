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
import { useEffect, useMemo, useState } from 'react';

const ARCHIVE_VALUE = '__archive__';

export interface DeleteFolderTarget {
  id: string;
  name: string;
}

export interface DeleteFolderResult {
  folderId: string;
  /** Target folder id to move articles into. `null` means "Don't Move and Archive". */
  moveToFolderId: string | null;
}

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: DeleteFolderTarget | null;
  /** Available folders to move articles into. The folder being deleted is excluded automatically. */
  availableFolders: DeleteFolderTarget[];
  onConfirm?: (result: DeleteFolderResult) => void | Promise<void>;
}

export function DeleteFolderModal({ isOpen, onClose, folder, availableFolders, onConfirm }: DeleteFolderModalProps) {
  const { toast } = useToast();
  const [moveTarget, setMoveTarget] = useState<string>(ARCHIVE_VALUE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setMoveTarget(ARCHIVE_VALUE);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const moveOptions = useMemo(() => availableFolders.filter(f => f.id !== folder?.id), [availableFolders, folder?.id]);

  const handleConfirm = async () => {
    if (!folder || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm?.({
        folderId: folder.id,
        moveToFolderId: moveTarget === ARCHIVE_VALUE ? null : moveTarget,
      });
      toast({
        title: 'Folder deleted',
        description: folder.name,
        variant: 'success',
      });
      onClose();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unable to delete folder',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>Delete Folder</ModalV2Title>
      </ModalV2Header>

      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-l)]">
        <p className="text-h4 text-ods-text-primary">
          Are you sure you want to delete <span className="text-ods-error">{folder?.name ?? 'this'}</span> folder? All
          articles inside will be archived.
        </p>

        <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <p className="text-h4 text-ods-text-primary">Move Articles to</p>
          <Select value={moveTarget} onValueChange={setMoveTarget} disabled={isSubmitting}>
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
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleConfirm}
          disabled={!folder || isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Deleting...' : 'Delete Folder'}
        </Button>
      </ModalV2Footer>
    </ModalV2>
  );
}
