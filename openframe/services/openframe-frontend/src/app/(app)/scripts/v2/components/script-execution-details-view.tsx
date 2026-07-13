'use client';

import { NotFoundError, Tag, TruncateText } from '@flamingo-stack/openframe-frontend-core';
import { Copy01Icon, MonitorIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { type PageActionButton, Skeleton, SquareAvatar } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { type ReactNode, Suspense, useEffect, useMemo } from 'react';
import { fetchQuery, useLazyLoadQuery, useRelayEnvironment } from 'react-relay';
import type { scriptExecutionDetailRelayQuery as ScriptExecutionDetailQueryType } from '@/__generated__/scriptExecutionDetailRelayQuery.graphql';
import { employeeDetailHref } from '@/app/(app)/settings/employees/routes';
import { ScriptExecutionStatus } from '@/generated/schema-enums';
import { scriptExecutionDetailRelayQuery } from '@/graphql/scripts/script-execution-detail-relay';
import { getFullImageUrl } from '@/lib/image-url';
import { decodeGlobalId } from '@/lib/relay-id';
import { routes } from '@/lib/routes';
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
import { ScriptPageChrome } from './script-page-chrome';

interface ScriptExecutionDetailsViewProps {
  executionId: string;
}

/** How often a RUNNING execution is re-fetched so its status/output stay live. */
const RUNNING_POLL_INTERVAL_MS = 5000;

// Unlike the other script pages, this page's chrome IS data-dependent (subtitle +
// back target come from the execution), so the loaded view and the Suspense
// fallback each render {@link ScriptPageChrome} — the fallback with placeholders.

/** A value-over-label cell in the execution detail card (also the base of its skeleton — see {@link DetailCellSkeleton}). */
function DetailCell({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-[1_0_0] min-w-[140px] flex-col justify-center gap-[var(--spacing-system-xxs)]">
      {typeof value === 'string' ? <TruncateText variant="h4">{value}</TruncateText> : value}
      <TruncateText variant="h6" tone="secondary">
        {label}
      </TruncateText>
    </div>
  );
}

function ScriptExecutionDetailsContent({ executionId }: ScriptExecutionDetailsViewProps) {
  const { toast } = useToast();
  const environment = useRelayEnvironment();
  const data = useLazyLoadQuery<ScriptExecutionDetailQueryType>(
    scriptExecutionDetailRelayQuery,
    { id: executionId },
    { fetchPolicy: 'store-and-network' },
  );
  const execution = data.node;

  // Live view of an in-flight run: while the execution is RUNNING, poll the node
  // so the status flips and the output streams in without a manual reload. The
  // refetched payload lands in the Relay store, so this component re-renders
  // from it; the interval stops itself once the status leaves RUNNING.
  const isRunning = execution?.status === ScriptExecutionStatus.RUNNING;
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      fetchQuery(
        environment,
        scriptExecutionDetailRelayQuery,
        { id: executionId },
        {
          fetchPolicy: 'network-only',
        },
      ).subscribe({});
    }, RUNNING_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isRunning, environment, executionId]);

  const actions = useMemo<PageActionButton[]>(() => {
    if (!execution) return [];
    const copyDetails = () => {
      const lines = [
        `Execution ID: ${execution.executionId}`,
        `Script Name: ${execution.scriptName ?? '—'}`,
        `Machine ID: ${execution.machine?.machineId ?? '—'}`,
        `Customer: ${organizationLabel(execution.machine) || '—'}`,
        `Executed by: ${initiatorName(execution.initiator)}`,
        `Status: ${executionStatusLabel(execution.status)}`,
        `Privilege Level: ${privilegeLevelLabel(execution.privilegeLevel)}`,
        `Start Time: ${formatExecutionTimestamp(execution.dispatchedAt)}`,
        `Finish Time: ${formatExecutionTimestamp(execution.finishedAt)}`,
        `Execution Time (ms): ${execution.executionTimeMs ?? '—'}`,
        `Result: ${executionResultText(execution) || '—'}`,
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
    <ScriptPageChrome
      title="Script Execution Details"
      subtitle={execution.executionId}
      backFallback={
        execution.scriptId ? routes.scriptsV2.details(execution.scriptId, { tab: 'executions' }) : routes.scriptsV2.list
      }
      actions={actions}
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

        {/* Result — a RUNNING execution with no output yet says so (the page
            polls, so the output streams in) instead of a dead-end "—". */}
        <div className="flex flex-col gap-[var(--spacing-system-xxs)] p-[var(--spacing-system-m)]">
          {result ? (
            <div className="text-h4 text-ods-text-primary whitespace-pre-wrap break-words">{result}</div>
          ) : (
            <div className="text-h4 text-ods-text-secondary">{isRunning ? 'Waiting for output…' : '—'}</div>
          )}
          <div className="text-h6 text-ods-text-secondary">Result</div>
        </div>
      </div>
    </ScriptPageChrome>
  );
}

// ----------------------------------------------------------------
// Skeleton — body card only; the chrome is the real ScriptPageChrome
// ----------------------------------------------------------------

/**
 * A value-over-label cell skeleton in the execution-details card: the real
 * {@link DetailCell} (so wrapper + label markup can never drift) with a bar for
 * the value. The label is static text, so it renders for real — exact `text-h6`
 * line height, no jump on load.
 */
function DetailCellSkeleton({ valueWidth = 'w-28', label }: { valueWidth?: string; label: string }) {
  return <DetailCell value={<Skeleton className={`h-6 ${valueWidth}`} />} label={label} />;
}

/**
 * Card body skeleton: the identity row (Script Name / Device / Executed by /
 * Status), the timing row (Privilege / Start / Finish / Execution Time), then
 * the Result block — mirrors the card markup above, including the 40px avatar
 * that makes the "Executed by" cell (and thus the identity row) taller.
 */
function ExecutionDetailsCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[8px] overflow-hidden">
      <div className="flex flex-wrap items-center gap-[var(--spacing-system-m)] border-b border-ods-border p-[var(--spacing-system-m)]">
        <DetailCellSkeleton valueWidth="w-40" label="Script Name" />
        <DetailCellSkeleton valueWidth="w-32" label="Device" />
        {/* Executed by — round avatar + name, same 40px avatar as the loaded cell */}
        <DetailCell
          value={
            <div className="flex items-center gap-[var(--spacing-system-xsf)]">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <Skeleton className="h-6 w-28" />
            </div>
          }
          label="Executed by"
        />
        <DetailCellSkeleton valueWidth="w-24" label="Status" />
      </div>
      <div className="flex flex-wrap items-center gap-[var(--spacing-system-m)] border-b border-ods-border p-[var(--spacing-system-m)]">
        <DetailCellSkeleton valueWidth="w-20" label="Privilege Level" />
        <DetailCellSkeleton valueWidth="w-32" label="Start Time" />
        <DetailCellSkeleton valueWidth="w-32" label="Finish Time" />
        <DetailCellSkeleton valueWidth="w-16" label="Execution Time (ms)" />
      </div>
      <div className="flex flex-col gap-[var(--spacing-system-xxs)] p-[var(--spacing-system-m)]">
        <Skeleton className="h-6 w-3/4 max-w-full" />
        <div className="text-h6 text-ods-text-secondary">Result</div>
      </div>
    </div>
  );
}

const noop = () => {};

/** Disabled Copy placeholder shown in the chrome while the execution loads. */
const LOADING_EXECUTION_ACTIONS: PageActionButton[] = [
  {
    label: 'Copy Execution Details',
    variant: 'outline',
    icon: <Copy01Icon className="w-6 h-6 text-ods-text-secondary" />,
    disabled: true,
    onClick: noop,
  },
];

export function ScriptExecutionDetailsView({ executionId }: ScriptExecutionDetailsViewProps) {
  return (
    <Suspense
      fallback={
        // The `\u00A0` subtitle reserves the subtitle line so the header does not
        // grow when the real execution UUID arrives (TitleBlock only renders the
        // subtitle row when the prop is truthy).
        <ScriptPageChrome
          title="Script Execution Details"
          subtitle={'\u00A0'}
          backFallback={routes.scriptsV2.list}
          actions={LOADING_EXECUTION_ACTIONS}
        >
          <ExecutionDetailsCardSkeleton />
        </ScriptPageChrome>
      }
    >
      <ScriptExecutionDetailsContent executionId={executionId} />
    </Suspense>
  );
}
