'use client';

import { NotFoundError, PageLayout, Tag, TruncateText } from '@flamingo-stack/openframe-frontend-core';
import { Copy01Icon, MonitorIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { SquareAvatar } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { type ReactNode, Suspense, useMemo } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import type { scriptExecutionDetailRelayQuery as ScriptExecutionDetailQueryType } from '@/__generated__/scriptExecutionDetailRelayQuery.graphql';
import { employeeDetailHref } from '@/app/(app)/settings/employees/routes';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { scriptExecutionDetailRelayQuery } from '@/graphql/scripts/script-execution-detail-relay';
import { getFullImageUrl } from '@/lib/image-url';
import { decodeGlobalId } from '@/lib/relay-id';
import {
  executionResultText,
  executionStatusLabel,
  executionStatusVariant,
  formatExecutionTimestamp,
  initiatorInitials,
  initiatorName,
  machineLabel,
  organizationLabel,
  privilegeLevelLabel,
} from '../utils/execution-helpers';
import { ScriptExecutionDetailsSkeleton } from './script-details-skeleton';

interface ScriptExecutionDetailsViewProps {
  executionId: string;
}

/** A value-over-label cell in the execution detail card. */
function DetailCell({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-[1_0_0] min-w-[140px] flex-col justify-center gap-1">
      {typeof value === 'string' ? <TruncateText variant="h4">{value}</TruncateText> : value}
      <TruncateText variant="h6" tone="secondary">
        {label}
      </TruncateText>
    </div>
  );
}

function ScriptExecutionDetailsContent({ executionId }: ScriptExecutionDetailsViewProps) {
  const { toast } = useToast();
  const data = useLazyLoadQuery<ScriptExecutionDetailQueryType>(
    scriptExecutionDetailRelayQuery,
    { id: executionId },
    { fetchPolicy: 'store-and-network' },
  );
  const execution = data.node;
  const handleBack = useSafeBack(
    execution?.scriptId ? `/scripts-v2/details/${execution.scriptId}?tab=executions` : '/scripts-v2',
  );

  const actions = useMemo(() => {
    if (!execution) return [];
    const copyDetails = () => {
      const lines = [
        `Execution ID: ${execution.executionId}`,
        `Script: ${execution.scriptName ?? '—'}`,
        `Status: ${executionStatusLabel(execution.status)}`,
        `Device: ${machineLabel(execution.machine)}`,
        `Executed by: ${initiatorName(execution.initiator)}`,
        `Privilege Level: ${privilegeLevelLabel(execution.privilegeLevel)}`,
        `Start Time: ${formatExecutionTimestamp(execution.dispatchedAt)}`,
        `Finish Time: ${formatExecutionTimestamp(execution.finishedAt)}`,
        `Execution Time (ms): ${execution.executionTimeMs ?? '—'}`,
        '',
        'Result:',
        executionResultText(execution) || '—',
      ];
      navigator.clipboard
        ?.writeText(lines.join('\n'))
        .then(() => toast({ title: 'Copied', description: 'Execution details copied', variant: 'success' }))
        .catch(() => toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' }));
    };
    return [
      {
        label: 'Copy Execution Details',
        variant: 'outline' as const,
        icon: <Copy01Icon className="w-6 h-6 text-ods-text-secondary" />,
        onClick: copyDetails,
      },
    ];
  }, [execution, toast]);

  if (!execution) {
    return <NotFoundError message="Execution not found" />;
  }

  const result = executionResultText(execution);
  const org = organizationLabel(execution.machine);

  // The initiator id is a User global id; decode to the raw id the REST-backed
  // employee page expects, then link "Executed by" to that user (new tab).
  const rawInitiatorId = execution.initiator?.id
    ? (decodeGlobalId(execution.initiator.id)?.rawId ?? execution.initiator.id)
    : '';
  const initiatorHref = rawInitiatorId ? employeeDetailHref(rawInitiatorId) : null;

  return (
    <PageLayout
      title="Script Execution Details"
      subtitle={execution.executionId}
      backButton={{ label: 'Back', onClick: handleBack }}
      actions={actions}
      className="md:px-[var(--spacing-system-l)] md:pb-[var(--spacing-system-l)]"
    >
      <div className="bg-ods-card border border-ods-border rounded-[8px] overflow-hidden">
        {/* Row 1 — identity */}
        <div className="flex flex-wrap items-center gap-[var(--spacing-system-m)] border-b border-ods-border p-[var(--spacing-system-m)]">
          <DetailCell value={execution.scriptName ?? '—'} label="Script Name" />
          <DetailCell
            value={
              <div className="flex items-center gap-1 min-w-0">
                <MonitorIcon className="size-6 shrink-0 text-ods-text-secondary" />
                {/* min-w-0 flex-1 wrapper so the name can shrink and ellipsize next to the icon. */}
                <div className="min-w-0 flex-1">
                  <TruncateText variant="h4">{machineLabel(execution.machine)}</TruncateText>
                </div>
              </div>
            }
            label={org || 'Device'}
          />
          <DetailCell
            value={(() => {
              const avatar = (
                <SquareAvatar
                  variant="round"
                  size="md"
                  src={getFullImageUrl(execution.initiator?.image?.imageUrl, execution.initiator?.image?.hash)}
                  fallback={initiatorInitials(execution.initiator)}
                  alt={initiatorName(execution.initiator)}
                  initialsClassName="text-ods-text-secondary"
                />
              );
              if (!initiatorHref) {
                return (
                  <div className="flex items-center gap-2 min-w-0">
                    {avatar}
                    <TruncateText variant="h4">{initiatorName(execution.initiator)}</TruncateText>
                  </div>
                );
              }
              return (
                <a
                  href={initiatorHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 min-w-0 no-underline"
                >
                  {avatar}
                  <TruncateText variant="h4" className="text-ods-accent underline">
                    {initiatorName(execution.initiator)}
                  </TruncateText>
                </a>
              );
            })()}
            label="Executed by"
          />
          <DetailCell
            value={
              <div className="flex">
                <Tag
                  label={executionStatusLabel(execution.status)}
                  variant={executionStatusVariant(execution.status)}
                />
              </div>
            }
            label="Status"
          />
        </div>

        {/* Row 2 — timing */}
        <div className="flex flex-wrap items-center gap-[var(--spacing-system-m)] border-b border-ods-border p-[var(--spacing-system-m)]">
          <DetailCell value={privilegeLevelLabel(execution.privilegeLevel)} label="Privilege Level" />
          <DetailCell value={formatExecutionTimestamp(execution.dispatchedAt)} label="Start Time" />
          <DetailCell value={formatExecutionTimestamp(execution.finishedAt)} label="Finish Time" />
          <DetailCell
            value={execution.executionTimeMs != null ? String(execution.executionTimeMs) : '—'}
            label="Execution Time (ms)"
          />
        </div>

        {/* Result */}
        <div className="flex flex-col gap-1 p-[var(--spacing-system-m)]">
          <div className="text-h4 text-ods-text-primary whitespace-pre-wrap break-words">{result || '—'}</div>
          <div className="text-h6 text-ods-text-secondary">Result</div>
        </div>
      </div>
    </PageLayout>
  );
}

export function ScriptExecutionDetailsView({ executionId }: ScriptExecutionDetailsViewProps) {
  return (
    <Suspense fallback={<ScriptExecutionDetailsSkeleton />}>
      <ScriptExecutionDetailsContent executionId={executionId} />
    </Suspense>
  );
}
