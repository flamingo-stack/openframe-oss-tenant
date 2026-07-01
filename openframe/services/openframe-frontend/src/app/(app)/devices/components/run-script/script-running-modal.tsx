'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { SimpleModal } from '@/app/components/shared/simple-modal';

interface ScriptRunningModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Navigates to the device's logs (Overview tab) and closes the flow. */
  onViewDeviceLogs: () => void;
}

/**
 * Post-run confirmation shown after a script is dispatched to a device
 * (scripts-v2). Mirrors Figma `1:65393` — "Scripts Running" + a pointer to the
 * device logs, with Close / Device Logs actions.
 */
export function ScriptRunningModal({ isOpen, onClose, onViewDeviceLogs }: ScriptRunningModalProps) {
  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title="Scripts Running"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button variant="accent" onClick={onViewDeviceLogs} className="flex-1">
            Device Logs
          </Button>
        </>
      }
    >
      <p className="text-h4 text-ods-text-primary">You can check the results in the device logs section.</p>
    </SimpleModal>
  );
}
