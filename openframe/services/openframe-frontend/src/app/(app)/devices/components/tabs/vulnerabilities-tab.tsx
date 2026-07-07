'use client';

import { Tag } from '@flamingo-stack/openframe-frontend-core';
import {
  ArrowRightUpIcon,
  BracketSquareCheckIcon,
  SearchIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  Input,
  type Row,
  type SortingState,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { differenceInCalendarDays } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { formatDate } from '@/lib/format-date';
import type { Device, Software, Vulnerability } from '../../types/device.types';
import { TabEmptyState } from './tab-empty-state';

interface VulnerabilitiesTabProps {
  device: Device | null;
}

interface VulnerabilityWithSoftware extends Vulnerability {
  software_name: string;
  software_version: string;
  software_vendor?: string;
  software_source: Software['source'];
  unique_key: string; // Unique identifier for React keys
}

type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const SEVERITY_VARIANT: Record<Severity, 'critical' | 'error' | 'warning' | 'grey'> = {
  critical: 'critical',
  high: 'error',
  medium: 'warning',
  low: 'grey',
};

const EMPTY_COLUMN_FILTERS: never[] = [];

/** CVSS v3 band → severity. */
function severityFromScore(score: number): Severity {
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

// Prefer the real Fleet CVSS score; fall back to a year-based heuristic when it's absent.
function getSeverity(vuln: { cve: string; cvss_score?: number | null }): Severity {
  if (typeof vuln.cvss_score === 'number') return severityFromScore(vuln.cvss_score);
  const year = Number.parseInt(vuln.cve.match(/CVE-(\d{4})/)?.[1] || '0', 10);
  const currentYear = new Date().getFullYear();
  if (currentYear - year === 0) return 'critical';
  if (currentYear - year <= 1) return 'high';
  if (currentYear - year <= 3) return 'medium';
  return 'low';
}

export function VulnerabilitiesTab({ device }: VulnerabilitiesTabProps) {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

  // Flatten all vulnerabilities from all software, carrying the software context.
  const vulnerabilities = useMemo<VulnerabilityWithSoftware[]>(() => {
    if (!device?.software) return [];

    const flattened: VulnerabilityWithSoftware[] = [];
    device.software.forEach((soft, softwareIndex) => {
      soft.vulnerabilities.forEach((vuln, vulnIndex) => {
        flattened.push({
          ...vuln,
          software_name: soft.name,
          software_version: soft.version,
          software_vendor: soft.vendor,
          software_source: soft.source,
          unique_key: `${vuln.cve}-${soft.name}-${soft.version}-${softwareIndex}-${vulnIndex}`,
        });
      });
    });

    return flattened;
  }, [device]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vulnerabilities;
    return vulnerabilities.filter(
      vuln => vuln.cve.toLowerCase().includes(query) || vuln.software_name.toLowerCase().includes(query),
    );
  }, [vulnerabilities, search]);

  const columns = useMemo<ColumnDef<VulnerabilityWithSoftware>[]>(
    () => [
      {
        accessorKey: 'cve',
        header: 'CVE ID',
        cell: ({ row }: { row: Row<VulnerabilityWithSoftware> }) => <span className="text-h4">{row.original.cve}</span>,
        meta: { width: 'w-[20%]' },
      },
      {
        id: 'severity',
        header: 'SEVERITY',
        accessorFn: (row: VulnerabilityWithSoftware) => SEVERITY_RANK[getSeverity(row)],
        cell: ({ row }: { row: Row<VulnerabilityWithSoftware> }) => {
          const severity = getSeverity(row.original);
          const score = row.original.cvss_score;
          return (
            <div className="flex flex-col gap-1 items-start min-w-0">
              <Tag label={severity.toUpperCase()} variant={SEVERITY_VARIANT[severity]} />
              {typeof score === 'number' && <span className="text-h6 text-ods-text-secondary">CVSS {score}</span>}
            </div>
          );
        },
        enableSorting: true,
        sortingFn: (a: Row<VulnerabilityWithSoftware>, b: Row<VulnerabilityWithSoftware>) =>
          SEVERITY_RANK[getSeverity(a.original)] - SEVERITY_RANK[getSeverity(b.original)],
        meta: { width: 'w-[16%]', sortable: true },
      },
      {
        accessorKey: 'software_name',
        header: 'SOFTWARE',
        cell: ({ row }: { row: Row<VulnerabilityWithSoftware> }) => (
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-h4 text-ods-text-primary truncate" title={row.original.software_name}>
              {row.original.software_name}
            </span>
            {row.original.software_version && (
              <span className="text-h6 text-ods-text-secondary truncate" title={row.original.software_version}>
                {row.original.software_version}
              </span>
            )}
          </div>
        ),
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: 'created_at',
        header: 'DISCOVERED',
        cell: ({ row }: { row: Row<VulnerabilityWithSoftware> }) => {
          const discovered = new Date(row.original.created_at);
          if (Number.isNaN(discovered.getTime())) {
            return <span className="text-h4 text-ods-text-secondary">—</span>;
          }
          const days = differenceInCalendarDays(new Date(), discovered);
          return (
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-h4 truncate">{formatDate(row.original.created_at)}</span>
              <span className="text-h6 text-ods-text-secondary truncate">
                {days} {days === 1 ? 'day' : 'days'}
              </span>
            </div>
          );
        },
        enableSorting: true,
        // Least-needed column for mobile triage — hidden below md, CVE/Severity/Software stay.
        meta: { width: 'w-[18%]', sortable: true, hideAt: 'md' },
      },
      {
        id: 'open',
        header: '',
        cell: ({ row }: { row: Row<VulnerabilityWithSoftware> }) =>
          row.original.details_link ? (
            <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
              <Button
                onClick={() => window.open(row.original.details_link, '_blank', 'noopener,noreferrer')}
                variant="outline"
                size="icon"
                leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
                aria-label={`Open ${row.original.cve} details`}
                className="bg-ods-card"
              />
            </div>
          ) : null,
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [],
  );

  const table = useDataTable<VulnerabilityWithSoftware>({
    data: filtered,
    columns,
    getRowId: (row: VulnerabilityWithSoftware) => row.unique_key,
    clientSideSorting: true,
    state: { sorting, columnFilters: EMPTY_COLUMN_FILTERS },
    onSortingChange: setSorting,
  });

  const sortState = sorting[0] ? { id: sorting[0].id, desc: sorting[0].desc } : null;
  const handleSortChange = useCallback((columnId: string) => {
    setSorting(prev => {
      const current = prev[0];
      if (!current || current.id !== columnId) return [{ id: columnId, desc: false }];
      if (!current.desc) return [{ id: columnId, desc: true }];
      return [];
    });
  }, []);

  if (!device) {
    return (
      <TabEmptyState
        icon={<BracketSquareCheckIcon />}
        title="No vulnerabilities found"
        description="Detected vulnerabilities for this device will appear here."
      />
    );
  }

  // Empty table → show only the centered empty state: hide the column header always, and
  // hide the search too (unless a search is active, so the user can still clear it).
  const hasSearch = search.trim().length > 0;
  const isEmpty = filtered.length === 0;

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]" style={containerStyle}>
      {(!isEmpty || hasSearch) && (
        <div
          ref={toolbarRef}
          className="sticky top-0 z-20 bg-ods-bg py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]"
        >
          <Input
            placeholder="Search for Vulnerability"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full"
            startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
          />
        </div>
      )}

      <DataTable table={table}>
        {!isEmpty && (
          <DataTable.Header
            sort={sortState}
            onSortChange={handleSortChange}
            stickyHeader
            stickyHeaderOffset={stickyHeaderOffset}
          />
        )}
        <DataTable.Body
          rowClassName="mb-1"
          emptyState={{
            icon: <BracketSquareCheckIcon />,
            title: 'No vulnerabilities found',
            description: search.trim()
              ? `No results for "${search.trim()}".`
              : 'Detected vulnerabilities for this device will appear here.',
          }}
        />
      </DataTable>
    </div>
  );
}
