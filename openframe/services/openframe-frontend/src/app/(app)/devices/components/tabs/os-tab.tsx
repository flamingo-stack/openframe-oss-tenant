'use client';

import { InfoCard } from '@flamingo-stack/openframe-frontend-core';
import { TerminalMonitorIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ReactNode } from 'react';
import { formatDateTime } from '@/lib/format-date';
import type { Device } from '../../types/device.types';
import { TabEmptyState } from './tab-empty-state';

interface OsTabProps {
  device: Device | null;
}

type InfoRow = { label: string; value?: string | number | null; copyable?: boolean };

/** Keep only rows that carry a real value, normalized to a display string. */
function toItems(rows: InfoRow[]): Array<{ label: string; value: string; copyable?: boolean }> {
  return rows
    .filter(row => row.value !== undefined && row.value !== null && String(row.value).trim() !== '')
    .map(row => ({ label: row.label, value: String(row.value), copyable: row.copyable }));
}

function formatUptime(seconds?: number): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes && !days) parts.push(`${minutes}m`);
  return parts.join(' ') || '< 1m';
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[var(--spacing-system-xxs)]">
      <h3 className="text-h5 text-ods-text-secondary uppercase">{title}</h3>
      {children}
    </section>
  );
}

function OsEmptyState() {
  return (
    <TabEmptyState
      icon={<TerminalMonitorIcon />}
      title="No OS data found"
      description="Operating system details for this device will appear here."
    />
  );
}

export function OsTab({ device }: OsTabProps) {
  if (!device) {
    return <OsEmptyState />;
  }

  // OPERATING SYSTEM — name/version/build/platform identity from Fleet + GraphQL.
  const osTitle = device.os_version || device.operating_system || device.osType;
  const osSubtitle = device.code_name || device.platform_like;
  const osItems = toItems([
    { label: 'Platform', value: device.platform || device.osType },
    { label: 'Version', value: device.osVersion },
    { label: 'Build', value: device.build || device.osBuild },
    { label: 'Architecture', value: device.cpu_type },
    { label: 'OS UUID', value: device.osUuid, copyable: true },
  ]);
  const hasOs = Boolean(osTitle || osSubtitle || osItems.length > 0);

  // BOOT & TIME — boot/uptime + locale + current session.
  const uptimeSeconds = device.boot_time ? Math.max(0, Math.floor(Date.now() / 1000 - device.boot_time)) : undefined;
  const lastBoot = device.last_restarted_at
    ? formatDateTime(device.last_restarted_at)
    : device.boot_time
      ? formatDateTime(device.boot_time * 1000)
      : undefined;
  const bootItems = toItems([
    { label: 'Last Boot', value: lastBoot },
    { label: 'Uptime', value: formatUptime(uptimeSeconds) },
    { label: 'Timezone', value: device.timezone },
    { label: 'Current User', value: device.logged_in_username },
    { label: 'Enrolled', value: device.last_enrolled_at ? formatDateTime(device.last_enrolled_at) : undefined },
  ]);

  // MANAGEMENT — Fleet team + labels (host grouping from the Fleet host payload).
  const managementItems = toItems([
    { label: 'Fleet Team', value: device.fleetTeamName },
    { label: 'Labels', value: device.fleetLabels?.length ? device.fleetLabels.join(', ') : undefined },
  ]);

  if (!hasOs && bootItems.length === 0 && managementItems.length === 0) {
    return <OsEmptyState />;
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-system-l)]">
        {hasOs && (
          <Section title="Operating System">
            <InfoCard
              className="flex-1"
              data={{ title: osTitle || 'Operating System', subtitle: osSubtitle, items: osItems }}
            />
          </Section>
        )}

        {bootItems.length > 0 && (
          <Section title="Boot & Time">
            <InfoCard className="flex-1" data={{ title: 'Boot & Time', items: bootItems }} />
          </Section>
        )}
      </div>

      {managementItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-system-l)]">
          <Section title="Management">
            <InfoCard data={{ title: 'Fleet', items: managementItems }} />
          </Section>
        </div>
      )}
    </div>
  );
}
