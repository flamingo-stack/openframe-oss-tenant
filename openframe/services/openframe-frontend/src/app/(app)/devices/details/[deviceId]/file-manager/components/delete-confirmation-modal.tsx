'use client';

import {
  Button,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import React, { useEffect } from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  itemCount: number;
  submitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmationModal({
  isOpen,
  itemCount,
  submitting = false,
  onConfirm,
  onClose,
}: DeleteConfirmationModalProps) {
  const title = itemCount === 1 ? 'Delete Item' : 'Delete Items';
  const description =
    itemCount === 1
      ? 'Are you sure you want to delete this item? This action cannot be undone.'
      : `Are you sure you want to delete ${itemCount} items? This action cannot be undone.`;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !submitting) {
        event.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onConfirm]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalContent className="px-6 py-4 space-y-3">
        <p className="text-sm text-ods-text-primary">{description}</p>
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={submitting}>
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  );
}
