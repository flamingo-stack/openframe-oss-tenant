'use client';

import type { SoftwareSource } from '@flamingo-stack/openframe-frontend-core';
import { Badge, CveLink, SoftwareInfo, SoftwareSourceBadge, Tag } from '@flamingo-stack/openframe-frontend-core';
import {
  type ColumnDef,
  DataTable,
  type Row,
  type SortingState,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import React, { useCallback, useMemo, useState } from 'react';
import type { Device, Software, Vulnerability } from '../../types/device.types';

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

export function VulnerabilitiesTab({ device }: VulnerabilitiesTabProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // Flatten all vulnerabilities from all software with context
  const vulnerabilities = useMemo(() => {
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

  // Format date for display
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Get severity from CVE (simple heuristic based on year and CVE format)
  const getSeverity = useCallback((_cve: string): 'critical' | 'high' | 'medium' | 'low' => {
    // This is a simplified heuristic - in production you'd fetch CVSS scores
    // For now, we'll use a simple rule: newer CVEs are more severe
    const year = parseInt(_cve.match(/CVE-(\d{4})/)?.[1] || '0');
    const currentYear = new Date().getFullYear();

    if (currentYear - year === 0) return 'critical';
    if (currentYear - year <= 1) return 'high';
    if (currentYear - year <= 3) return 'medium';
    return 'low';
  }, []);

  // Define table columns
  const columns = useMemo<ColumnDef<VulnerabilityWithSoftware>[]>(
    () => [
      {
        accessorKey: 'cve',
        header: 'CVE ID',
        cell: ({ row }: { row: Row<VulnerabilityWithSoftware> }) => <CveLink cveId={row.original.cve} />,
        enableSorting: true,
        meta: { width: 'w-[15%]' },
      },
      {
        accessorKey: 'software_name',
        header: 'SOFTWARE',
        cell: ({ row }: { row: Row<VulnerabilityWithSoftware> }) => (
          <SoftwareInfo
            name={row.original.software_name}
            vendor={row.original.software_vendor}
            version={row.original.software_version}
          />
        ),
        enableSorting: true,
        meta: { width: 'w-[30%]' },
      },
      {
        accessorKey: 'software_source',
        header: 'SOURCE',
        cell: ({ row }: { row: Row<VulnerabilityWithSoftware> }) => (
          <SoftwareSourceBadge source={row.original.software_source as SoftwareSource} />
        ),
        enableSorting: true,
        meta: { width: 'w-[15%]' },
      },
      {
        id: 'severity',
        header: 'SEVERITY',
        accessorFn: (row: VulnerabilityWithSoftware) => {
          const severity = getSeverity(row.cve);
          return severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
        },
        cell: ({ row }: { row: Row<VulnerabilityWithSoftware> }) => {
          const severity = getSeverity(row.original.cve);
          const variantMap = {
            critical: 'critical' as const,
            high: 'error' as const,
            medium: 'warning' as const,
            low: 'grey' as const,
          };
          return <Tag label={severity.toUpperCase()} variant={variantMap[severity]} />;
        },
        enableSorting: true,
        sortingFn: (rowA: Row<VulnerabilityWithSoftware>, rowB: Row<VulnerabilityWithSoftware>) => {
          const rank = (item: VulnerabilityWithSoftware) => {
            const severity = getSeverity(item.cve);
            return severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
          };
          const a = rank(rowA.original);
          const b = rank(rowB.original);
          if (a === b) return 0;
          return a > b ? 1 : -1;
        },
        meta: { width: 'w-[15%]' },
      },
      {
        accessorKey: 'created_at',
        header: 'DISCOVERED',
        cell: ({ row }: { row: Row<VulnerabilityWithSoftware> }) => (
          <div className="font-['DM_Sans'] font-medium text-ods-text-primary">
            {formatDate(row.original.created_at)}
          </div>
        ),
        enableSorting: true,
        meta: { width: 'w-[25%]' },
      },
    ],
    [formatDate, getSeverity],
  );

  const table = useDataTable<VulnerabilityWithSoftware>({
    data: vulnerabilities,
    columns,
    getRowId: (row: VulnerabilityWithSoftware) => row.unique_key,
    clientSideSorting: true,
    state: { sorting, columnFilters: [] },
    onSortingChange: setSorting,
  });

  // Count by severity - must be called before early returns
  const severityCounts = useMemo(() => {
    return vulnerabilities.reduce(
      (acc, vuln) => {
        const severity = getSeverity(vuln.cve);
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [vulnerabilities, getSeverity]);

  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No device data available</div>
      </div>
    );
  }

  if (vulnerabilities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Badge variant="success" className="text-lg px-4 py-2">
            No Vulnerabilities Found
          </Badge>
          <div className="text-ods-text-secondary">All installed software is up to date and secure</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-4">
        <h3 className="text-h5 text-ods-text-secondary">Vulnerabilities ({vulnerabilities.length})</h3>

        {severityCounts.critical > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="font-['DM_Sans'] font-bold text-[14px] uppercase"
              style={{ color: 'var(--ods-attention-red-error)' }}
            >
              CRITICAL
            </span>
            <span className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-primary">
              {severityCounts.critical}
            </span>
          </div>
        )}
        {severityCounts.high > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="font-['DM_Sans'] font-bold text-[14px] uppercase"
              style={{ color: 'var(--ods-attention-red-error)' }}
            >
              HIGH
            </span>
            <span className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-primary">
              {severityCounts.high}
            </span>
          </div>
        )}
        {severityCounts.medium > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="font-['DM_Sans'] font-bold text-[14px] uppercase"
              style={{ color: 'var(--color-warning)' }}
            >
              MEDIUM
            </span>
            <span className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-primary">
              {severityCounts.medium}
            </span>
          </div>
        )}
        {severityCounts.low > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-['DM_Sans'] font-bold text-[14px] uppercase text-ods-text-secondary">LOW</span>
            <span className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-primary">{severityCounts.low}</span>
          </div>
        )}
      </div>

      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body rowClassName="mb-1" />
      </DataTable>
    </div>
  );
}
