'use client';

import { Button, Modal, ModalFooter, ModalHeader, ModalTitle } from '@flamingo-stack/openframe-frontend-core';
import React, { useEffect, useState } from 'react';

interface RegenerateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeyName?: string;
  onConfirm: () => Promise<void>;
}

export function RegenerateApiKeyModal({ isOpen, onClose, apiKeyName, onConfirm }: RegenerateApiKeyModalProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) setLoading(false);
  }, [isOpen]);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>Confirm Regeneration</ModalTitle>
        <p className="text-ods-text-secondary text-sm mt-1">This action will invalidate the current key</p>
      </ModalHeader>

      <div className="px-6 py-4">
        <p className="text-ods-text-primary">
          Are you sure you want to regenerate{' '}
          <span className="text-ods-warning font-semibold">{apiKeyName || 'this API Key'}</span>? The current key will
          stop working immediately.
        </p>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={loading}>
          {loading ? 'Regenerating...' : 'Regenerate API Key'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
