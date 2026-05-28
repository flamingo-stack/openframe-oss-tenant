'use client';

import { Button, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import type React from 'react';
import { useEffect, useState } from 'react';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { useCreateFolder } from '../hooks/use-create-folder';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentFolderId?: string | null;
  parentConnectionId: string;
  onCreated?: (folderId: string) => void;
}

export function NewFolderModal({
  isOpen,
  onClose,
  parentFolderId = null,
  parentConnectionId,
  onCreated,
}: NewFolderModalProps) {
  const { toast } = useToast();
  const { createFolder, isPending } = useCreateFolder();
  const [name, setName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setName('');
    }
  }, [isOpen]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const result = await createFolder({
        name: trimmed,
        parentId: parentFolderId,
        connections: [parentConnectionId],
      });
      toast({ title: 'Folder created', description: trimmed, variant: 'success' });
      onCreated?.(result.id);
      onClose();
    } catch {}
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
      title="New Folder"
      contentClassName="flex flex-col gap-[var(--spacing-system-xxs)]"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit} loading={isPending}>
            {isPending ? 'Creating...' : 'Create Folder'}
          </Button>
        </>
      }
    >
      <Label htmlFor="new-folder-name" className="text-h4 text-ods-text-primary">
        Folder Name
      </Label>
      <Input
        id="new-folder-name"
        value={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter Folder Name Here"
        disabled={isPending}
        autoFocus
      />
    </SimpleModal>
  );
}
