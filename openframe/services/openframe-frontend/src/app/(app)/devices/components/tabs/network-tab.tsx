'use client';

import { InfoCard } from '@flamingo-stack/openframe-frontend-core';
import { Hierarchy02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ReactNode } from 'react';
import type { Device } from '../../types/device.types';
import { TabEmptyState } from './tab-empty-state';

interface NetworkTabProps {
  device: Device | null;
}

type InfoRow = { label: string; value?: string | null; copyable?: boolean };

function toItems(rows: InfoRow[]): Array<{ label: string; value: string; copyable?: boolean }> {
  return rows
    .filter(row => row.value !== undefined && row.value !== null && String(row.value).trim() !== '')
    .map(row => ({ label: row.label, value: String(row.value), copyable: row.copyable }));
}

/** Numeric-aware sort for dotted IPv4 / CIDR strings. */
function sortIpv4(addresses: string[]): string[] {
  return [...addresses].sort((a, b) => {
    const aParts = a.split(/[./]/).map(Number);
    const bParts = b.split(/[./]/).map(Number);
    for (let i = 0; i < 4; i++) {
      if (aParts[i] !== bParts[i]) return (aParts[i] || 0) - (bParts[i] || 0);
    }
    return 0;
  });
}

function Labeled({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
      <h3 className="text-h5 text-ods-text-secondary uppercase">{title}</h3>
      {children}
    </div>
  );
}

export function NetworkTab({ device }: NetworkTabProps) {
  if (!device) {
    return (
      <TabEmptyState
        icon={<Hierarchy02Icon />}
        title="No network data found"
        description="Network details for this device will appear here."
      />
    );
  }

  const allIps = device.local_ips || [];
  const fleetPrimaryIp = device.primary_ip;

  const ipv4Addresses: string[] = [];
  const ipv6Addresses: string[] = [];
  for (const ip of allIps) {
    (ip.includes(':') ? ipv6Addresses : ipv4Addresses).push(ip);
  }

  // Keep the Fleet primary IPv4 pinned at the top; sort the rest numerically.
  let sortedIpv4 = sortIpv4(ipv4Addresses);
  if (fleetPrimaryIp && sortedIpv4.includes(fleetPrimaryIp)) {
    sortedIpv4 = [fleetPrimaryIp, ...sortedIpv4.filter(ip => ip !== fleetPrimaryIp)];
  }
  const sortedIpv6 = [...ipv6Addresses].sort();

  // Interface identity — Public/Primary IP + MAC (MAC was previously not surfaced here).
  const interfaceItems = toItems([
    { label: 'Public IP', value: device.public_ip, copyable: true },
    { label: 'Primary IPv4', value: device.primary_ip, copyable: true },
    { label: 'MAC Address', value: device.primary_mac || device.macAddress, copyable: true },
  ]);

  // Location — Fleet built-in GeoIP on the public IP (city/country when available).
  const locationItems = toItems([
    { label: 'City', value: device.geolocation?.city },
    { label: 'Country', value: device.geolocation?.country },
  ]);

  const hasIpv4 = sortedIpv4.length > 0;
  const hasIpv6 = sortedIpv6.length > 0;

  if (interfaceItems.length === 0 && locationItems.length === 0 && !hasIpv4 && !hasIpv6) {
    return (
      <TabEmptyState
        icon={<Hierarchy02Icon />}
        title="No network data found"
        description="Network details for this device will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      {interfaceItems.length > 0 && (
        <Labeled title="Network">
          <InfoCard data={{ items: interfaceItems }} />
        </Labeled>
      )}

      {locationItems.length > 0 && (
        <Labeled title="Location">
          <InfoCard data={{ items: locationItems }} />
        </Labeled>
      )}

      {(hasIpv4 || hasIpv6) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-system-l)]">
          {hasIpv4 && (
            <Labeled title="IPv4 Addresses">
              <InfoCard data={{ items: [{ value: sortedIpv4, copyable: true }] }} />
            </Labeled>
          )}
          {hasIpv6 && (
            <Labeled title="IPv6 Addresses">
              <InfoCard data={{ items: [{ value: sortedIpv6, copyable: true }] }} />
            </Labeled>
          )}
        </div>
      )}
    </div>
  );
}
