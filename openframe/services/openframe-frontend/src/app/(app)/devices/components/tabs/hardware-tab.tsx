'use client';

import { InfoCard } from '@flamingo-stack/openframe-frontend-core';
import { HardDrivesIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ReactNode } from 'react';
import { formatDateTime } from '@/lib/format-date';
import type { Device } from '../../types/device.types';
import { TabEmptyState } from './tab-empty-state';

interface HardwareTabProps {
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

/** A row of hardware blocks — a 3-column grid where every block stretches to an equal width. */
function Row({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-system-l)]">{children}</div>;
}

/**
 * A single hardware block: its own heading above one InfoCard (per the Figma Hardware tab,
 * each block is independently titled). `heading` is omitted for the trailing cards of a
 * multi-card group (e.g. extra disks/batteries) — an invisible placeholder keeps every card
 * top aligned across the grid.
 */
function Block({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    // `h-full` + `[&>*:last-child]:flex-1` make the card fill the grid cell (which stretches to
    // the tallest block in the row), so all cards in a row share one height.
    <div className="flex flex-col gap-[var(--spacing-system-xxs)] h-full [&>*:last-child]:flex-1">
      {heading ? (
        <h3 className="text-h5 text-ods-text-secondary uppercase">{heading}</h3>
      ) : (
        <h3 className="text-h5 invisible" aria-hidden>
          &nbsp;
        </h3>
      )}
      {children}
    </div>
  );
}

function HardwareEmptyState() {
  return (
    <TabEmptyState
      icon={<HardDrivesIcon />}
      title="No hardware data found"
      description="Hardware details for this device will appear here."
    />
  );
}

export function HardwareTab({ device }: HardwareTabProps) {
  if (!device) {
    return <HardwareEmptyState />;
  }

  // SYSTEM — hardware identity from Fleet (currently unused on this tab).
  const systemItems = toItems([
    { label: 'Serial Number', value: device.hardware_serial || device.serial_number, copyable: true },
    { label: 'Hardware Version', value: device.hardware_version },
    { label: 'Operating System', value: device.os_version },
    { label: 'UUID', value: device.osUuid, copyable: true },
  ]);
  const systemTitle = device.hardware_model || device.make_model || device.model;
  const systemSubtitle = device.hardware_vendor || device.manufacturer;
  const hasSystem = Boolean(systemTitle || systemSubtitle || systemItems.length > 0);

  // BOOT — last restart / boot time / derived uptime.
  const uptimeSeconds = device.boot_time ? Math.max(0, Math.floor(Date.now() / 1000 - device.boot_time)) : undefined;
  const bootItems = toItems([
    { label: 'Uptime', value: formatUptime(uptimeSeconds) },
    { label: 'Last Restarted', value: device.last_restarted_at ? formatDateTime(device.last_restarted_at) : undefined },
    { label: 'Boot Time', value: device.boot_time ? formatDateTime(device.boot_time * 1000) : undefined },
    { label: 'Enrolled', value: device.last_enrolled_at ? formatDateTime(device.last_enrolled_at) : undefined },
  ]);

  // CPU — model + architecture/cores/threads.
  const cpuModel = device.cpu_brand;
  const cpuItems = toItems([
    { label: 'Architecture', value: device.cpu_type },
    { label: 'Subtype', value: device.cpu_subtype },
    { label: 'Physical Cores', value: device.cpu_physical_cores },
    { label: 'Logical Cores', value: device.cpu_logical_cores },
  ]);
  const hasCpu = Boolean(cpuModel || cpuItems.length > 0);

  // MEMORY — total only (per-DIMM/slot detail is not in our payload).
  const memoryItems = toItems([{ label: 'Total Memory', value: device.totalRam }]);

  // STORAGE — Fleet whole-disk totals.
  const fleetTotalGb = device.gigs_total_disk_space;
  const fleetAvailableGb = device.gigs_disk_space_available;
  const hasFleetStorage = typeof fleetTotalGb === 'number' && fleetTotalGb > 0;
  const fleetUsedPercent =
    device.percent_disk_space_available !== undefined
      ? Math.max(0, Math.min(100, Math.round(100 - device.percent_disk_space_available)))
      : undefined;
  const fleetUsedGb =
    typeof fleetTotalGb === 'number' && typeof fleetAvailableGb === 'number'
      ? Math.max(0, fleetTotalGb - fleetAvailableGb)
      : undefined;

  // BATTERY — macOS battery health from Fleet.
  const batteries = device.batteries || [];

  const hasAnyData =
    hasSystem || bootItems.length > 0 || hasCpu || memoryItems.length > 0 || hasFleetStorage || batteries.length > 0;
  if (!hasAnyData) {
    return <HardwareEmptyState />;
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      {/* System, Boot, CPU share one row — three equal, stretched columns. */}
      {(hasSystem || bootItems.length > 0 || hasCpu) && (
        <Row>
          {hasSystem && (
            <Block heading="System">
              <InfoCard data={{ title: systemTitle || undefined, subtitle: systemSubtitle, items: systemItems }} />
            </Block>
          )}

          {bootItems.length > 0 && (
            <Block heading="Boot">
              <InfoCard data={{ items: bootItems }} />
            </Block>
          )}

          {hasCpu && (
            <Block heading="CPU">
              <InfoCard
                data={{
                  title: cpuModel || undefined,
                  subtitle: cpuItems.length > 0 ? undefined : 'No detailed information available',
                  items: cpuItems.length > 0 ? cpuItems : [{ label: 'Status', value: 'Basic info only' }],
                }}
              />
            </Block>
          )}
        </Row>
      )}

      {/* Memory — its own row. */}
      {memoryItems.length > 0 && (
        <Row>
          <Block heading="Memory">
            <InfoCard data={{ items: memoryItems }} />
          </Block>
        </Row>
      )}

      {/* Storage — Fleet whole-disk totals. */}
      {hasFleetStorage && (
        <Row>
          <Block heading="Storage">
            <InfoCard
              data={{
                title: 'Disk',
                subtitle: 'Total storage',
                items: toItems([
                  {
                    label: 'Current Usage',
                    value: fleetUsedPercent !== undefined ? `${fleetUsedPercent}%` : undefined,
                  },
                  {
                    label: 'Used Space',
                    value: fleetUsedGb !== undefined ? `${fleetUsedGb.toFixed(2)} GB` : undefined,
                  },
                  {
                    label: 'Free Space',
                    value: typeof fleetAvailableGb === 'number' ? `${fleetAvailableGb.toFixed(2)} GB` : undefined,
                  },
                  { label: 'Total Capacity', value: `${(fleetTotalGb as number).toFixed(2)} GB` },
                ]),
                ...(fleetUsedPercent !== undefined && { progress: { value: fleetUsedPercent } }),
              }}
            />
          </Block>
        </Row>
      )}

      {batteries.length > 0 && (
        <Row>
          {batteries.map((battery, index) => {
            const healthStatus = battery.health || 'Unknown';
            const cycleCount = battery.cycle_count || 0;

            let healthPercentage = 0;
            const percentMatch = healthStatus.match(/\((\d+)%\)/);
            if (percentMatch) {
              healthPercentage = parseInt(percentMatch[1]);
            } else {
              const healthLower = healthStatus.toLowerCase();
              if (healthLower.includes('normal') || healthLower.includes('good')) healthPercentage = 100;
              else if (healthLower.includes('fair')) healthPercentage = 60;
              else if (healthLower.includes('poor')) healthPercentage = 30;
            }

            return (
              <Block key={`battery-${index}`} heading={index === 0 ? 'Battery Health' : undefined}>
                <InfoCard
                  data={{
                    title: `Battery ${index + 1}`,
                    subtitle: healthStatus,
                    items: [
                      { label: 'Cycle Count', value: cycleCount.toString() },
                      { label: 'Health', value: `${healthPercentage}%` },
                    ],
                    progress: {
                      value: healthPercentage,
                      warningThreshold: 60,
                      criticalThreshold: 80,
                      inverted: true,
                    },
                  }}
                />
              </Block>
            );
          })}
        </Row>
      )}
    </div>
  );
}
