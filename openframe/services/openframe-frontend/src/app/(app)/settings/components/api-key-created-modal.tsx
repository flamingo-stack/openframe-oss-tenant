'use client';

import { Button, Label, Modal, ModalFooter, ModalHeader, ModalTitle } from '@flamingo-stack/openframe-frontend-core';
import { AlertTriangleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { CheckIcon, Copy02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Alert, AlertDescription } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from '@/app/hooks/use-copy-to-clipboard';

interface ApiKeyCreatedModalProps {
  isOpen: boolean;
  fullKey: string | null;
  onClose: () => void;
}

export function ApiKeyCreatedModal({ isOpen, fullKey, onClose }: ApiKeyCreatedModalProps) {
  const { copy, copied } = useCopyToClipboard({
    successDescription: 'API key copied to clipboard',
    errorDescription: 'Unable to copy API key',
  });
  const [localKey, setLocalKey] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setLocalKey('');
    } else if (fullKey) {
      setLocalKey(fullKey);
    }
  }, [isOpen, fullKey]);

  if (!localKey) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>API Key Created</ModalTitle>
        <p className="text-ods-text-secondary text-sm mt-1">Save your API key securely</p>
      </ModalHeader>

      <div className="px-6 py-4 space-y-4">
        {/* Warning banner */}
        <Alert className="bg-ods-warning border-ods-warning text-ods-text-on-accent">
          <AlertTriangleIcon className="h-5 w-5" />
          <AlertDescription>
            This is the only time you'll see the complete API key. Please copy it and store it securely.
          </AlertDescription>
        </Alert>

        {/* Key display */}
        <div className="space-y-2">
          <Label>Your API Key</Label>
          <div className="bg-ods-bg border border-ods-border rounded-lg p-4">
            <code className="block text-sm font-mono text-ods-text-primary break-all">{localKey}</code>
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={() => copy(localKey)}
          leftIcon={
            copied ? (
              <CheckIcon className="h-4 w-4 text-[var(--ods-attention-green-success)]" />
            ) : (
              <Copy02Icon className="h-4 w-4" />
            )
          }
        >
          Copy API Key
        </Button>
        <Button onClick={onClose}>Continue</Button>
      </ModalFooter>
    </Modal>
  );
}
