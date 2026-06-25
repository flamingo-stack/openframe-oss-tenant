'use client';

import { Button, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type React from 'react';
import { useEffect, useState } from 'react';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { useDeviceActions } from '../hooks/use-device-actions';
import type { Device } from '../types/device.types';

interface EditDisplayNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device | null;
  onSaved?: () => void;
}

export function EditDisplayNameModal({ isOpen, onClose, device, onSaved }: EditDisplayNameModalProps) {
  const { updateDisplayName, isSavingDisplayName } = useDeviceActions();
  const [name, setName] = useState('');

  const currentName = device?.displayName ?? '';

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  const deviceId = device?.machineId || device?.id || '';
  const trimmed = name.trim();
  // Allow clearing the name (revert to hostname); only block no-op saves.
  const canSubmit = !!deviceId && trimmed !== currentName.trim() && !isSavingDisplayName;

  const handleSubmit = async () => {
    if (!device || !canSubmit) return;
    const success = await updateDisplayName(deviceId, trimmed);
    if (success) {
      onSaved?.();
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && canSubmit) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title="Edit Display Name"
      contentClassName="flex flex-col gap-[var(--spacing-system-xxs)]"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSavingDisplayName}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit} loading={isSavingDisplayName}>
            {isSavingDisplayName ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <Label htmlFor="device-display-name" className="text-h4 text-ods-text-primary">
        Display Name
      </Label>
      <Input
        id="device-display-name"
        value={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={device?.hostname || 'Enter display name'}
        disabled={isSavingDisplayName}
        autoFocus
      />
    </SimpleModal>
  );
}
