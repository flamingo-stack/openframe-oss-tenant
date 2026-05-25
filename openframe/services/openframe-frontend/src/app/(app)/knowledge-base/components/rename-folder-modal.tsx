'use client';

import { Button, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import type React from 'react';
import { useEffect, useState } from 'react';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { useRenameFolder } from '../hooks/use-rename-folder';

export interface RenameFolderTarget {
  id: string;
  name: string;
}

interface RenameFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: RenameFolderTarget | null;
}

export function RenameFolderModal({ isOpen, onClose, folder }: RenameFolderModalProps) {
  const { toast } = useToast();
  const { renameFolder, isPending } = useRenameFolder();
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen && folder) {
      setName(folder.name);
    }
  }, [isOpen, folder]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== folder?.name && !isPending;

  const handleSubmit = () => {
    if (!folder || !canSubmit) return;
    renameFolder({
      id: folder.id,
      name: trimmed,
      onCompleted: () => {
        toast({ title: 'Folder renamed', description: trimmed, variant: 'success' });
        onClose();
      },
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && canSubmit) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title="Rename Folder"
      contentClassName="flex flex-col gap-[var(--spacing-system-xxs)]"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit} loading={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <Label htmlFor="rename-folder-name" className="text-h4 text-ods-text-primary">
        Folder Name
      </Label>
      <Input
        id="rename-folder-name"
        value={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter Folder Name"
        disabled={isPending}
        autoFocus
      />
    </SimpleModal>
  );
}
