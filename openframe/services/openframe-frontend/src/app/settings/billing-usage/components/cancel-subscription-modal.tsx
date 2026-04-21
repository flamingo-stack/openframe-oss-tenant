'use client';

import { AlertCircleIcon, DotIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  ModalV2,
  ModalV2Content,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { format, parseISO } from 'date-fns';
import { useEffect, useId, useState } from 'react';

export type CancelReason = 'TOO_EXPENSIVE' | 'NOT_USING_ENOUGH' | 'MISSING_FEATURE' | 'TECHNICAL_ISSUES' | 'OTHER';

const REASON_OPTIONS: ReadonlyArray<{ value: CancelReason; label: string }> = [
  { value: 'TOO_EXPENSIVE', label: 'Too expensive' },
  { value: 'NOT_USING_ENOUGH', label: 'Not using it enough' },
  { value: 'MISSING_FEATURE', label: 'Missing a feature' },
  { value: 'TECHNICAL_ISSUES', label: 'Technical issues' },
  { value: 'OTHER', label: 'Other' },
];

interface DataLossStats {
  scripts: number;
  activeSchedules: number;
  events: number;
  monitoringPolicies: number;
  tickets: number;
  kbArticles: number;
  kbFolders: number;
}

const DEFAULT_STATS: DataLossStats = {
  scripts: 47,
  activeSchedules: 12,
  events: 3200,
  monitoringPolicies: 8,
  tickets: 142,
  kbArticles: 38,
  kbFolders: 6,
};

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  endDate: string | null;
  stats?: DataLossStats;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (reason: CancelReason, comment: string) => void;
}

function formatEndDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM do, yyyy');
  } catch {
    return iso;
  }
}

function formatCount(value: number): string {
  if (value >= 1000) {
    const rounded = Math.floor(value / 100) * 100;
    return `${rounded.toLocaleString('en-US')}+`;
  }
  return value.toLocaleString('en-US');
}

export function CancelSubscriptionModal({
  isOpen,
  endDate,
  stats = DEFAULT_STATS,
  isPending = false,
  onClose,
  onConfirm,
}: CancelSubscriptionModalProps) {
  const [reason, setReason] = useState<CancelReason | ''>('');
  const [comment, setComment] = useState('');
  const reasonId = useId();
  const commentId = useId();

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setComment('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!reason || isPending) return;
    onConfirm(reason, comment.trim());
  };

  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>Cancel Subscription</ModalV2Title>
      </ModalV2Header>

      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-l)]">
        <div className="text-h4 text-ods-text-primary gap-[var(--spacing-system-xs)] flex">
          <span>Your subscription will remain active until:</span>
          <span className="text-ods-warning">{formatEndDate(endDate)}</span>
        </div>
        <p className="text-h4 text-ods-text-primary">
          Pay-as-you-go top-ups are disabled immediately. Any usage already accrued will be charged at the end of the
          billing period.
        </p>

        <div className="rounded-md border border-ods-warning overflow-hidden bg-ods-bg">
          <div className="flex items-center gap-[var(--spacing-system-xs)] p-[var(--spacing-system-xsf)] bg-[var(--ods-open-yellow-secondary)] border-b border-ods-warning">
            <AlertCircleIcon className="size-6 text-ods-warning shrink-0" />
            <p className="text-h6 flex-1 text-ods-warning">
              Once your subscription ends, this data will no longer be accessible.
            </p>
          </div>
          <ul className="flex flex-col gap-[var(--spacing-system-xxs)] p-[var(--spacing-system-s)]">
            <DataLossItem>
              <span className="text-h4 text-ods-warning">{formatCount(stats.scripts)}</span>
              {` scripts, including `}
              <span className="text-h4 text-ods-warning">{formatCount(stats.activeSchedules)}</span>
              {` active schedules`}
            </DataLossItem>
            <DataLossItem>
              <span className="text-h4 text-ods-warning">{formatCount(stats.events)}</span>
              {` events across `}
              <span className="text-h4 text-ods-warning">{formatCount(stats.monitoringPolicies)}</span>
              {` monitoring policies`}
            </DataLossItem>
            <DataLossItem>
              <span className="text-h4 text-ods-warning">{formatCount(stats.tickets)}</span>
              {` tickets and all client communication`}
            </DataLossItem>
            <DataLossItem>
              <span className="text-h4 text-ods-warning">{formatCount(stats.kbArticles)}</span>
              {` KB articles across `}
              <span className="text-h4 text-ods-warning">{formatCount(stats.kbFolders)}</span>
              {` folders`}
            </DataLossItem>
          </ul>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-h3 text-ods-text-primary" htmlFor={reasonId}>
            {`What's the main reason you're cancelling?`}
          </label>
          <Select value={reason} onValueChange={v => setReason(v as CancelReason)}>
            <SelectTrigger id={reasonId} className="bg-ods-card w-full">
              <SelectValue placeholder="Select the Reason" />
            </SelectTrigger>
            <SelectContent>
              {REASON_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {reason === 'OTHER' && (
          <div className="flex flex-col gap-1">
            <label className="text-h3 text-ods-text-primary" htmlFor={commentId}>
              {`What's on your mind?`}
            </label>
            <Textarea
              id={commentId}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Tell us what's not working for you."
              rows={3}
            />
          </div>
        )}
      </ModalV2Content>

      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
          Keep Subscription
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleConfirm}
          disabled={!reason || isPending}
          loading={isPending}
        >
          Continue
        </Button>
      </ModalV2Footer>
    </ModalV2>
  );
}

function DataLossItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start text-h3 text-ods-text-primary">
      <DotIcon aria-hidden className="size-6 shrink-0 text-ods-warning" />
      <span className="flex-1">{children}</span>
    </li>
  );
}
