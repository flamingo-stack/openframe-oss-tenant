'use client';

import { FolderShieldIcon, SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Input } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PoliciesTable, type PolicyTableRow } from '@/app/components/shared';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { routes } from '@/lib/routes';
import type { Device, DevicePolicy } from '../../types/device.types';
import { TabEmptyState } from './tab-empty-state';

interface PoliciesTabProps {
  device: Device | null;
}

/** Per-device pass/fail mapped onto the same status look the monitoring table uses. */
function toStatus(response: DevicePolicy['response']): PolicyTableRow['status'] {
  if (response === 'pass') return { label: 'Compliant', variant: 'success' };
  if (response === 'fail') return { label: 'Failing', variant: 'error' };
  return { label: 'Pending', variant: 'warning' };
}

function parsePlatforms(platform: string | undefined): string[] {
  if (!platform) return [];
  return platform
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
}

export function PoliciesTab({ device }: PoliciesTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

  const policies = useMemo(() => device?.policies ?? [], [device]);

  const rows = useMemo<PolicyTableRow[]>(() => {
    const query = search.trim().toLowerCase();
    return policies
      .filter(
        policy =>
          !query ||
          policy.name.toLowerCase().includes(query) ||
          (policy.description ?? '').toLowerCase().includes(query),
      )
      .map(policy => ({
        id: String(policy.id),
        name: policy.name,
        description: policy.description,
        critical: policy.critical,
        severityLabel: policy.critical ? 'Critical' : 'Low',
        status: toStatus(policy.response),
        platforms: parsePlatforms(policy.platform),
        actions: [{ label: 'Policy Details', onClick: () => router.push(routes.monitoring.policy(policy.id)) }],
        href: routes.monitoring.policy(policy.id),
      }));
  }, [policies, search, router]);

  if (!device) {
    return (
      <TabEmptyState
        icon={<FolderShieldIcon />}
        title="No policies applied"
        description="Compliance policies for this device will appear here."
      />
    );
  }

  // Hide the search on a truly empty table (no rows, no active search) so the tab shows only
  // the centered empty state — matching the table's hidden header.
  const showSearch = rows.length > 0 || search.trim().length > 0;

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]" style={containerStyle}>
      {showSearch && (
        <div
          ref={toolbarRef}
          className="sticky top-0 z-20 bg-ods-bg py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]"
        >
          <Input
            placeholder="Search for Policies"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full"
            startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
          />
        </div>
      )}

      <PoliciesTable
        rows={rows}
        stickyHeader
        stickyHeaderOffset={stickyHeaderOffset}
        rowAsLink
        emptyState={{
          icon: <FolderShieldIcon />,
          title: 'No policies applied',
          description: search.trim()
            ? `No results for "${search.trim()}".`
            : 'Compliance policies for this device will appear here.',
        }}
      />
    </div>
  );
}
