'use client';

import { TruncateText } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { getOSLabel } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';
import { scriptV2ShellLabel } from '../utils/shell-types';

interface ScriptSummaryCardProps {
  name: string;
  description?: string | null;
  /** Lowercase shell id (e.g. 'bash'). */
  shellId: string;
  /** Platform ids (e.g. ['windows', 'darwin']). */
  platforms: string[];
  timeoutSeconds?: number | null;
  /** Show the Timeout cell. Off on the run page, where the timeout is editable below. */
  showTimeout?: boolean;
  /** Author name ("Added by"). Pass `undefined` to omit the stat entirely. */
  author?: string | null;
}

/** Number of equal-width columns the metadata strip is laid out on. */
const META_COLUMNS = 4;

/**
 * Single source for the metadata-strip stat labels — the loaded card's `stats`
 * array and both skeleton label sets are built from these, so a rename can
 * never desync the skeleton from the card.
 */
const STAT_LABELS = {
  shell: 'Shell Type',
  platforms: 'Supported Platforms',
  timeout: 'Timeout (seconds)',
  author: 'Added by',
} as const;

/** Shared cell wrapper of the metadata strip — used by the loaded card AND the skeleton so they never drift. */
function MetaCell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-[1_0_0] min-w-[140px] flex-col justify-center gap-[var(--spacing-system-xxs)]">
      {children}
    </div>
  );
}

/** Trailing spacer that keeps cells on the {@link META_COLUMNS} grid when there are fewer stats. */
function MetaSpacer({ count }: { count: number }) {
  if (count >= META_COLUMNS) return null;
  return <div aria-hidden className="min-w-px" style={{ flex: `${META_COLUMNS - count} 1 0%` }} />;
}

/** A value-over-label cell in the metadata strip. */
function MetaStat({ value, label }: { value: string; label: string }) {
  return (
    <MetaCell>
      <TruncateText variant="h4">{value}</TruncateText>
      <TruncateText variant="h6" tone="secondary">
        {label}
      </TruncateText>
    </MetaCell>
  );
}

function shellLabel(shellId: string): string {
  return scriptV2ShellLabel(shellId);
}

/**
 * Summary card shown on the script details and run pages: the name + description
 * header, then a metadata strip (shell type, platforms, and — on details —
 * timeout). The strip is laid out on a 4-column grid; a trailing spacer keeps
 * the cells aligned when there are fewer than 4.
 */
export function ScriptSummaryCard({
  name,
  description,
  shellId,
  platforms,
  timeoutSeconds,
  showTimeout = true,
  author,
}: ScriptSummaryCardProps) {
  const platformsText = platforms.map(getOSLabel).join(', ') || '—';

  const stats = [
    { label: STAT_LABELS.shell, value: shellLabel(shellId) },
    { label: STAT_LABELS.platforms, value: platformsText },
    ...(showTimeout ? [{ label: STAT_LABELS.timeout, value: String(timeoutSeconds ?? '—') }] : []),
    ...(author !== undefined ? [{ label: STAT_LABELS.author, value: author || '—' }] : []),
  ];

  return (
    <div className="bg-ods-card border border-ods-border rounded-[8px] overflow-hidden">
      <div className="flex flex-col gap-[var(--spacing-system-xxs)] border-b border-ods-border p-[var(--spacing-system-m)]">
        <TruncateText variant="h4">{name}</TruncateText>
        {description && (
          <TruncateText variant="h6" tone="secondary">
            {description}
          </TruncateText>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-[var(--spacing-system-m)] p-[var(--spacing-system-m)]">
        {stats.map(stat => (
          <MetaStat key={stat.label} value={stat.value} label={stat.label} />
        ))}
        <MetaSpacer count={stats.length} />
      </div>
    </div>
  );
}

/** Stat labels the run page shows (`showTimeout` off, author on) — shared with its skeleton call sites. */
export const RUN_SUMMARY_LABELS: readonly string[] = [STAT_LABELS.shell, STAT_LABELS.platforms, STAT_LABELS.author];

/** Default skeleton labels — the details-page stat set (`showTimeout` on, author shown). */
const DEFAULT_SKELETON_LABELS: readonly string[] = [
  STAT_LABELS.shell,
  STAT_LABELS.platforms,
  STAT_LABELS.timeout,
  STAT_LABELS.author,
];

/**
 * Skeleton for {@link ScriptSummaryCard}: the name + description header followed
 * by the metadata strip. The stat LABELS are static text, so they render for
 * real (exact `text-h6` line height — no jump on load); only the values are
 * bars. Pass the same label set the loaded card will show (default: the
 * details-page 4). Mirrors the real card's trailing spacer so widths line up.
 */
export function ScriptSummaryCardSkeleton({ labels = DEFAULT_SKELETON_LABELS }: { labels?: readonly string[] }) {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[8px] overflow-hidden">
      <div className="flex flex-col gap-[var(--spacing-system-xxs)] border-b border-ods-border p-[var(--spacing-system-m)]">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap items-center gap-[var(--spacing-system-m)] p-[var(--spacing-system-m)]">
        {labels.map(label => (
          <MetaCell key={label}>
            <Skeleton className="h-6 w-28" />
            <TruncateText variant="h6" tone="secondary">
              {label}
            </TruncateText>
          </MetaCell>
        ))}
        <MetaSpacer count={labels.length} />
      </div>
    </div>
  );
}
