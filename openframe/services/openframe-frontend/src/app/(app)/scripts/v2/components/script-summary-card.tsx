'use client';

import { TruncateText } from '@flamingo-stack/openframe-frontend-core';
import { SHELL_TYPES } from '@flamingo-stack/openframe-frontend-core/types';
import { getOSLabel } from '@flamingo-stack/openframe-frontend-core/utils';

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
}

/** Number of equal-width columns the metadata strip is laid out on. */
const META_COLUMNS = 4;

/** A value-over-label cell in the metadata strip. */
function MetaStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-[1_0_0] min-w-[140px] flex-col justify-center gap-1">
      <TruncateText variant="h4">{value}</TruncateText>
      <TruncateText variant="h6" tone="secondary">
        {label}
      </TruncateText>
    </div>
  );
}

function shellLabel(shellId: string): string {
  return SHELL_TYPES.find(s => s.value === shellId)?.label ?? shellId;
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
}: ScriptSummaryCardProps) {
  const platformsText = platforms.map(getOSLabel).join(', ') || '—';

  const stats = [
    { label: 'Shell Type', value: shellLabel(shellId) },
    { label: 'Supported Platforms', value: platformsText },
    ...(showTimeout ? [{ label: 'Timeout (seconds)', value: String(timeoutSeconds ?? '—') }] : []),
  ];

  return (
    <div className="bg-ods-card border border-ods-border rounded-[8px] overflow-hidden">
      <div className="flex flex-col gap-1 border-b border-ods-border p-[var(--spacing-system-m)]">
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
        {stats.length < META_COLUMNS && (
          <div aria-hidden className="min-w-px" style={{ flex: `${META_COLUMNS - stats.length} 1 0%` }} />
        )}
      </div>
    </div>
  );
}
