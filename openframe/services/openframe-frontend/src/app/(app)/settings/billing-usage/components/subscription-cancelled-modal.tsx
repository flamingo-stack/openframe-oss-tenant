'use client';

import {
  Button,
  ModalV2,
  ModalV2Content,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { format, parseISO } from 'date-fns';

interface SubscriptionCancelledModalProps {
  isOpen: boolean;
  endDate: string | null;
  onClose: () => void;
}

function formatEndDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM do, yyyy');
  } catch {
    return iso;
  }
}

export function SubscriptionCancelledModal({ isOpen, endDate, onClose }: SubscriptionCancelledModalProps) {
  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>Subscription Cancelled</ModalV2Title>
      </ModalV2Header>

      <ModalV2Content>
        <p className="text-h4 text-ods-text-primary">
          {`Pay-as-you-go top-ups are now disabled. Your existing devices and included tokens remain active until `}
          <span className="text-ods-warning">{formatEndDate(endDate)}</span>
          {`, after which this data will no longer be accessible.`}
        </p>
      </ModalV2Content>

      <ModalV2Footer>
        <div className="flex-1" />
        <Button variant="primary" className="flex-1" onClick={onClose}>
          Close
        </Button>
      </ModalV2Footer>
    </ModalV2>
  );
}
