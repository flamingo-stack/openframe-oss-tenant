'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { SimpleModal } from '@/app/components/shared/simple-modal';

interface ExecutionStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptName: string;
  /** Footer CTA — navigates to where the run's results can be tracked. */
  onViewResults: () => void;
  /** CTA label. Defaults to the execution-history wording. */
  viewLabel?: string;
  /** Where results are tracked — completes the body sentence. */
  resultsLocation?: string;
}

export function ExecutionStartedModal({
  isOpen,
  onClose,
  scriptName,
  onViewResults,
  viewLabel = 'View Execution History',
  resultsLocation = 'execution history',
}: ExecutionStartedModalProps) {
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
          <Button onClick={onViewResults} className="flex-1">
            {viewLabel}
          </Button>
        </>
      }
    >
      <p className="text-h4 text-ods-text-primary">
        Script <span className="text-ods-accent">{scriptName}</span> has been accepted for execution. You can track its
        progress and view the results in the {resultsLocation}.
      </p>
    </SimpleModal>
  );
}
