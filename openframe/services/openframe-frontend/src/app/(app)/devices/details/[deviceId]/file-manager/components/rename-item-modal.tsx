'use client';

import { Button, Input } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useEffect } from 'react';
import { SimpleModal } from '@/app/components/shared/simple-modal';

interface RenameItemModalProps {
  isOpen: boolean;
  value: string;
  submitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function RenameItemModal({ isOpen, value, submitting, onChange, onSubmit, onClose }: RenameItemModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !submitting && value.trim()) {
        event.preventDefault();
        onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, value, onSubmit]);

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rename Item"
      contentClassName="flex flex-col gap-[var(--spacing-system-xs)]"
      footer={
        <>
          <Button variant="transparent" size="small-legacy" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="small-legacy" onClick={onSubmit} disabled={!value.trim() || submitting}>
            {submitting ? 'Renaming...' : 'Rename'}
          </Button>
        </>
      }
    >
      <p className="text-h6 text-ods-text-secondary">Update the name for the selected item.</p>
      <Input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="New name"
        autoFocus
        disabled={submitting}
      />
    </SimpleModal>
  );
}
