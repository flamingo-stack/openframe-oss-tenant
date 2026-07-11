'use client';

import { AlertCircleIcon, DotIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Suspense, useEffect, useId, useState } from 'react';
import { graphql, type PreloadedQuery, usePreloadedQuery, useQueryLoader } from 'react-relay';
import type { cancelSubscriptionModalPreviewQuery as CancelSubscriptionModalPreviewQueryType } from '@/__generated__/cancelSubscriptionModalPreviewQuery.graphql';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { formatDate } from '@/lib/format-date';

// Live-from-Stripe preview of the effective cancellation date, fetched lazily
// only when the modal opens (subscription.cancellationEffectiveAt is null while
// still ACTIVE, so this dedicated preview field is the correct source).
const cancelSubscriptionModalPreviewQuery = graphql`
  query cancelSubscriptionModalPreviewQuery {
    subscriptionCancellationPreview
  }
`;

export type CancelReason = 'TOO_EXPENSIVE' | 'NOT_USING_ENOUGH' | 'MISSING_FEATURE' | 'TECHNICAL_ISSUES' | 'OTHER';

const REASON_OPTIONS: ReadonlyArray<{ value: CancelReason; label: string }> = [
  { value: 'TOO_EXPENSIVE', label: 'Too expensive' },
  { value: 'NOT_USING_ENOUGH', label: 'Not using it enough' },
  { value: 'MISSING_FEATURE', label: 'Missing a feature' },
  { value: 'TECHNICAL_ISSUES', label: 'Technical issues' },
  { value: 'OTHER', label: 'Other' },
];

export interface DataLossStats {
  activeDevices: number;
  tickets: number;
  kbArticles: number;
  scripts: number;
  monitoringPolicies: number;
  savedQueries: number;
}

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  endDate: string | null;
  stats?: DataLossStats;
  isStatsLoading?: boolean;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (reason: CancelReason, comment: string) => void;
}

function formatEndDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return formatDate(iso);
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
  stats,
  isStatsLoading = false,
  isPending = false,
  onClose,
  onConfirm,
}: CancelSubscriptionModalProps) {
  const [reason, setReason] = useState<CancelReason | ''>('');
  const [comment, setComment] = useState('');
  const reasonId = useId();
  const commentId = useId();

  const [previewRef, loadPreview] = useQueryLoader<CancelSubscriptionModalPreviewQueryType>(
    cancelSubscriptionModalPreviewQuery,
  );

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setComment('');
      return;
    }
    // Load lazily on first open and reuse the cached result on subsequent opens
    // (store-or-network + a retained queryRef = no refetch each time), matching
    // how the data-loss metrics are cached rather than refetched every open.
    if (!previewRef) {
      loadPreview({}, { fetchPolicy: 'store-or-network' });
    }
  }, [isOpen, loadPreview, previewRef]);

  const handleConfirm = () => {
    if (!reason || isPending) return;
    onConfirm(reason, comment.trim());
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title="Cancel Subscription"
      contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
      footer={
        <>
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
        </>
      }
    >
      <div className="text-h4 text-ods-text-primary gap-[var(--spacing-system-xs)] flex">
        <span>Your subscription will remain active until:</span>
        {previewRef ? (
          <Suspense fallback={<Skeleton className="h-5 w-20" />}>
            <CancellationEffectiveDate queryRef={previewRef} fallback={endDate} />
          </Suspense>
        ) : (
          <span className="text-ods-warning">{formatEndDate(endDate)}</span>
        )}
      </div>
      <p className="text-h4 text-ods-text-primary">
        Pay-as-you-go top-ups are disabled immediately. Any usage already accrued will be charged at the end of the
        billing period.
      </p>

      {isStatsLoading || !stats ? <DataLossSkeleton /> : <DataLossBox stats={stats} />}

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
    </SimpleModal>
  );
}

// Reads the preloaded preview and renders the effective cancellation date,
// falling back to the caller-provided date when Stripe exposes no period end.
function CancellationEffectiveDate({
  queryRef,
  fallback,
}: {
  queryRef: PreloadedQuery<CancelSubscriptionModalPreviewQueryType>;
  fallback: string | null;
}) {
  const data = usePreloadedQuery(cancelSubscriptionModalPreviewQuery, queryRef);
  return <span className="text-ods-warning">{formatEndDate(data.subscriptionCancellationPreview ?? fallback)}</span>;
}

function DataLossItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start text-h3 text-ods-text-primary">
      <DotIcon aria-hidden className="size-6 shrink-0 text-ods-warning" />
      <span className="flex-1">{children}</span>
    </li>
  );
}

function Stat({ value }: { value: number }) {
  return <span className="text-h4 text-ods-warning">{formatCount(value)}</span>;
}

// Rows with a zero metric are hidden. The policies/queries row is dropped only
// when both are zero; otherwise it shows just the non-zero parts. If nothing is
// left to warn about, the whole box is omitted.
function DataLossBox({ stats }: { stats: DataLossStats }) {
  const showPolicies = stats.monitoringPolicies > 0;
  const showQueries = stats.savedQueries > 0;
  const rows = [
    stats.activeDevices > 0 && (
      <DataLossItem key="devices">
        <Stat value={stats.activeDevices} />
        {` active devices monitored`}
      </DataLossItem>
    ),
    stats.tickets > 0 && (
      <DataLossItem key="tickets">
        <Stat value={stats.tickets} />
        {` tickets and all client communication`}
      </DataLossItem>
    ),
    stats.kbArticles > 0 && (
      <DataLossItem key="kb">
        <Stat value={stats.kbArticles} />
        {` knowledge base articles`}
      </DataLossItem>
    ),
    stats.scripts > 0 && (
      <DataLossItem key="scripts">
        <Stat value={stats.scripts} />
        {` scripts`}
      </DataLossItem>
    ),
    (showPolicies || showQueries) && (
      <DataLossItem key="fleet">
        {showPolicies && (
          <>
            <Stat value={stats.monitoringPolicies} />
            {` monitoring policies`}
          </>
        )}
        {showPolicies && showQueries && ` and `}
        {showQueries && (
          <>
            <Stat value={stats.savedQueries} />
            {` saved queries`}
          </>
        )}
      </DataLossItem>
    ),
  ].filter(Boolean);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border border-ods-warning overflow-hidden bg-ods-bg">
      <div className="flex items-center gap-[var(--spacing-system-xs)] p-[var(--spacing-system-xsf)] bg-[var(--ods-open-yellow-secondary)] border-b border-ods-warning">
        <AlertCircleIcon className="size-6 text-ods-warning shrink-0" />
        <p className="text-h6 flex-1 text-ods-warning">
          Once your subscription ends, this data will no longer be accessible.
        </p>
      </div>
      <ul className="flex flex-col gap-[var(--spacing-system-xxs)] p-[var(--spacing-system-s)]">{rows}</ul>
    </div>
  );
}

// Mirrors the data-loss box structure (header chrome + 5 bulleted rows) so the
// loading state keeps the same shape instead of a flat rectangle.
const SKELETON_ROW_WIDTHS = ['w-1/2', 'w-3/4', 'w-2/5', 'w-1/3', 'w-3/4'] as const;

function DataLossSkeleton() {
  return (
    <div className="rounded-md border border-ods-warning overflow-hidden bg-ods-bg">
      <div className="flex items-center gap-[var(--spacing-system-xs)] p-[var(--spacing-system-xsf)] bg-[var(--ods-open-yellow-secondary)] border-b border-ods-warning">
        <AlertCircleIcon className="size-6 text-ods-warning shrink-0" />
        <p className="text-h6 flex-1 text-ods-warning">
          Once your subscription ends, this data will no longer be accessible.
        </p>
      </div>
      <ul className="flex flex-col gap-[var(--spacing-system-xxs)] p-[var(--spacing-system-s)]">
        {SKELETON_ROW_WIDTHS.map((width, i) => (
          <li key={i} className="flex items-center h-6">
            <DotIcon aria-hidden className="size-6 shrink-0 text-ods-warning" />
            <Skeleton className={`h-4 ${width}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
