'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { formatDate } from '@/lib/format-date';

interface SubscriptionCancelledModalProps {
  isOpen: boolean;
  endDate: string | null;
  onClose: () => void;
}

function formatEndDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return formatDate(iso);
  } catch {
    return iso;
  }
}

export function SubscriptionCancelledModal({ isOpen, endDate, onClose }: SubscriptionCancelledModalProps) {
  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title="Subscription Cancelled"
      footer={
        <>
          <div className="flex-1" />
          <Button variant="accent" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <p className="text-h4 text-ods-text-primary">
        {`Pay-as-you-go top-ups are now disabled. Your existing devices and included tokens remain active until `}
        <span className="text-ods-warning">{formatEndDate(endDate)}</span>
        {`, after which this data will no longer be accessible.`}
      </p>
    </SimpleModal>
  );
}
