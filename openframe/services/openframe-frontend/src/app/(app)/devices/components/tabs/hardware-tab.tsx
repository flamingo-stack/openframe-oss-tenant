'use client';

import { InfoCard } from '@flamingo-stack/openframe-frontend-core';
import type { ReactNode } from 'react';
import { formatDateTime } from '@/lib/format-date';
import type { Device } from '../../types/device.types';

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

/**
 * Group physical disks (from Tactical `physical_disks` strings) with their partition
 * usage (from Tactical `disks`) so each drive shows capacity + current usage.
 * Unchanged behavior from the previous Hardware tab — only the presentation moved.
 */
function processDiskData(disks: Device['disks'], physicalDisks: string[]) {
  if (!disks || disks.length === 0) return [];

  const validDisks = disks.filter(disk => disk.total !== '0 B' && disk.device !== 'map auto_home' && disk.percent > 0);

  const extractPhysicalDisk = (deviceStr: string) => {
    const macMatch = deviceStr.match(/disk(\d+)/);
    if (macMatch) return `disk${macMatch[1]}`;
    const driveMatch = deviceStr.match(/^([A-Z]):/);
    if (driveMatch) return `drive_${driveMatch[1]}`;
    return `disk_${deviceStr.replace(/[^a-zA-Z0-9]/g, '_')}`;
  };

  const groupedByPhysicalDisk = validDisks.reduce(
    (acc, disk) => {
      const key = extractPhysicalDisk(disk.device);
      (acc[key] ||= []).push(disk);
      return acc;
    },
    {} as Record<string, typeof validDisks>,
  );

  const physicalDiskInfo = (physicalDisks || []).reduce(
    (acc, diskStr) => {
      const str = diskStr.trim();
      let diskKey = '';
      let size = '';
      let diskType = 'HDD';
      let diskName = '';

      const macDiskMatch = str.match(/disk(\d+)\s+([\d.]+\s*[KMGT]B)/i);
      if (macDiskMatch) {
        diskKey = `disk${macDiskMatch[1]}`;
        size = macDiskMatch[2];
        if (str.includes('SSD') || str.includes('NVMe')) {
          diskType = 'SSD';
          diskName = 'SSD';
        } else if (str.includes('Virtual')) {
          diskType = 'Virtual';
          diskName = 'Virtual Disk';
        } else {
          diskType = 'HDD';
          diskName = 'HDD';
        }
      } else {
        const sizeMatch = str.match(/([\d.]+\s*[KMGT]B)/i);
        if (sizeMatch) size = sizeMatch[1];

        const driveLetterMatch = str.match(/\b([A-Z]):/i);
        diskKey = driveLetterMatch
          ? `drive_${driveLetterMatch[1]}`
          : `disk_${str.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}`;

        if (str.includes('Virtual')) {
          diskType = 'Virtual';
          diskName = 'Virtual Disk';
        } else if (str.includes('SSD') || str.includes('NVMe')) {
          diskType = 'SSD';
          diskName = 'SSD';
        } else if (str.includes('HDD')) {
          diskType = 'HDD';
          diskName = 'HDD';
        } else if (str.includes('Samsung') || str.includes('Kingston') || str.includes('Crucial')) {
          diskType = 'SSD';
          diskName = 'SSD';
        } else {
          diskType = 'HDD';
          diskName = 'HDD';
        }
      }

      if (diskKey && size) {
        acc[diskKey] = { size, name: diskName, type: diskType };
      }
      return acc;
    },
    {} as Record<string, { size: string; name: string; type: string }>,
  );

  const allDiskKeys = new Set([...Object.keys(physicalDiskInfo), ...Object.keys(groupedByPhysicalDisk)]);

  const parseSize = (sizeStr: string): number => {
    const match = sizeStr.match(/([0-9.]+)\s*(GB|MB|TB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'TB') return value * 1024;
    if (unit === 'MB') return value / 1024;
    return value;
  };

  return Array.from(allDiskKeys)
    .map(diskKey => {
      const partitions = groupedByPhysicalDisk[diskKey];
      const diskInfo = physicalDiskInfo[diskKey];

      if (partitions && partitions.length > 0) {
        const mainPartition = partitions.reduce((largest, current) =>
          parseSize(current.total) > parseSize(largest.total) ? current : largest,
        );
        return {
          name: diskInfo?.name || diskKey,
          size: diskInfo?.size || mainPartition.total,
          used: mainPartition.used,
          free: mainPartition.free,
          percentage: mainPartition.percent,
          type: diskInfo?.type || (diskKey.includes('Virtual') ? 'Virtual' : 'Unknown'),
          count: partitions.length,
        };
      }
      if (diskInfo) {
        return {
          name: diskInfo.name,
          size: diskInfo.size,
          used: 'N/A',
          free: 'N/A',
          percentage: 0,
          type: diskInfo.type,
          count: 0,
        };
      }
      return { name: diskKey, size: 'Unknown', used: 'N/A', free: 'N/A', percentage: 0, type: 'Unknown', count: 0 };
    })
    .filter(disk => disk.name && disk.size !== 'Unknown')
    .sort((a, b) => parseSize(b.size) - parseSize(a.size));
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

export function HardwareTab({ device }: HardwareTabProps) {
  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No device data available</div>
      </div>
    );
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
  const cpuModel = device.cpu_brand || device.cpu_model?.[0];
  const cpuItems = toItems([
    { label: 'Architecture', value: device.cpu_type },
    { label: 'Subtype', value: device.cpu_subtype },
    { label: 'Physical Cores', value: device.cpu_physical_cores },
    { label: 'Logical Cores', value: device.cpu_logical_cores },
  ]);
  const hasCpu = Boolean(cpuModel || cpuItems.length > 0);

  // MEMORY — total only (per-DIMM/slot detail is not in our payload).
  const memoryItems = toItems([{ label: 'Total Memory', value: device.totalRam }]);

  // STORAGE — per-drive detail (legacy Tactical). When absent, fall back to Fleet's whole-disk totals.
  const diskData = processDiskData(device.disks || [], device.physical_disks || []);
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

  // GRAPHICS — Tactical `graphics` string (currently unused on this tab).
  const hasGraphics = Boolean(device.graphics);

  // BATTERY — macOS battery health from Fleet.
  const batteries = device.batteries || [];

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

      {/* Storage — its own row (multiple drives flow across the 3 columns). */}
      {diskData.length > 0 && (
        <Row>
          {diskData.map((disk, index) => (
            <Block key={`${disk.name}-${index}`} heading={index === 0 ? 'Storage' : undefined}>
              <InfoCard
                data={{
                  title: disk.name,
                  subtitle:
                    disk.count === 0
                      ? `${disk.type} Drive (No partition data)`
                      : `${disk.type} Drive (${disk.count} partition${disk.count > 1 ? 's' : ''})`,
                  items: toItems([
                    { label: 'Current Usage', value: `${disk.percentage}%` },
                    { label: 'Used Space', value: disk.used },
                    { label: 'Free Space', value: disk.free },
                    { label: 'Total Capacity', value: disk.size },
                  ]),
                  ...(disk.count > 0 && { progress: { value: disk.percentage } }),
                }}
              />
            </Block>
          ))}
        </Row>
      )}

      {diskData.length === 0 && hasFleetStorage && (
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

      {hasGraphics && (
        <Row>
          <Block heading="Graphics">
            <InfoCard data={{ items: toItems([{ label: 'Model', value: device.graphics }]) }} />
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
