'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { SimpleModal } from '@/app/components/shared/simple-modal';

interface ExecutionStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptName: string;
  onViewLogs: () => void;
}

export function ExecutionStartedModal({ isOpen, onClose, scriptName, onViewLogs }: ExecutionStartedModalProps) {
  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title="Execution Started"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={onViewLogs} className="flex-1">
            View Logs
          </Button>
        </>
      }
    >
      <p className="text-h4 text-ods-text-primary">
        Script <span className="text-ods-accent">{scriptName}</span> has been accepted for execution. You can track the
        progress and view the results in the activity logs section.
      </p>
    </SimpleModal>
  );
}
