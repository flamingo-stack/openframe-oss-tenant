'use client';

import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import React, { useEffect } from 'react';

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
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <ModalTitle>Rename Item</ModalTitle>
      </ModalHeader>
      <ModalContent className="px-6 py-4 space-y-3">
        <p className="text-sm text-ods-text-secondary">Update the name for the selected item.</p>
        <Input
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="New name"
          autoFocus
          disabled={submitting}
        />
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSubmit} disabled={!value.trim() || submitting}>
          {submitting ? 'Renaming...' : 'Rename'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
