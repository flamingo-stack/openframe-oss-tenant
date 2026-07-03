'use client';

import { Button, Input } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useEffect } from 'react';
import { SimpleModal } from '@/app/components/shared/simple-modal';

interface NewFolderModalProps {
  isOpen: boolean;
  folderName: string;
  submitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function NewFolderModal({ isOpen, folderName, submitting, onChange, onSubmit, onClose }: NewFolderModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !submitting && folderName.trim()) {
        event.preventDefault();
        onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, folderName, onSubmit]);

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Folder"
      contentClassName="flex flex-col gap-[var(--spacing-system-xs)]"
      footer={
        <>
          <Button variant="transparent" size="small-legacy" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="small-legacy" onClick={onSubmit} disabled={!folderName.trim() || submitting}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </>
      }
    >
      <p className="text-h6 text-ods-text-secondary">Enter a name for the new folder.</p>
      <Input
        value={folderName}
        onChange={event => onChange(event.target.value)}
        placeholder="Folder name"
        autoFocus
        disabled={submitting}
      />
    </SimpleModal>
  );
}
