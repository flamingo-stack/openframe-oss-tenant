'use client';

import {
  Button,
  Input,
  Label,
  ModalV2,
  ModalV2Content,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import type React from 'react';
import { useEffect, useState } from 'react';

export interface NewFolderResult {
  id: string;
  name: string;
  parentFolderId: string | null;
}

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentFolderId?: string | null;
  onCreated?: (folder: NewFolderResult) => void | Promise<void>;
}

export function NewFolderModal({ isOpen, onClose, parentFolderId = null, onCreated }: NewFolderModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const folder: NewFolderResult = {
        id: `folder-${crypto.randomUUID()}`,
        name: trimmed,
        parentFolderId,
      };
      await onCreated?.(folder);
      toast({ title: 'Folder created', description: trimmed, variant: 'success' });
      onClose();
    } catch (err) {
      toast({
        title: 'Create failed',
        description: err instanceof Error ? err.message : 'Unable to create folder',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && canSubmit) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>New Folder</ModalV2Title>
      </ModalV2Header>

      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-xxs)]">
        <Label htmlFor="new-folder-name" className="text-h4 text-ods-text-primary">
          Folder Name
        </Label>
        <Input
          id="new-folder-name"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter Folder Name Here"
          disabled={isSubmitting}
          autoFocus
        />
      </ModalV2Content>

      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit} loading={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Folder'}
        </Button>
      </ModalV2Footer>
    </ModalV2>
  );
}
