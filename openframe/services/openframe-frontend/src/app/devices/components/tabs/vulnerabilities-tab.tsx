'use client';

import type { SoftwareSource, TableColumn } from '@flamingo-stack/openframe-frontend-core';
import {
  Badge,
  CveLink,
  SoftwareInfo,
  SoftwareSourceBadge,
  StatusTag,
  Table,
} from '@flamingo-stack/openframe-frontend-core';
import React, { useCallback, useMemo } from 'react';
import { Device, Software, Vulnerability } from '../../types/device.types';

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
  const columns: TableColumn<VulnerabilityWithSoftware>[] = useMemo(
    () => [
      {
        key: 'cve',
        label: 'CVE ID',
        width: 'w-[15%]',
        sortable: true,
        renderCell: (item: VulnerabilityWithSoftware) => <CveLink cveId={item.cve} />,
      },
      {
        key: 'software_name',
        label: 'SOFTWARE',
        width: 'w-[30%]',
        sortable: true,
        renderCell: (item: VulnerabilityWithSoftware) => (
          <SoftwareInfo name={item.software_name} vendor={item.software_vendor} version={item.software_version} />
        ),
      },
      {
        key: 'software_source',
        label: 'SOURCE',
        width: 'w-[15%]',
        sortable: true,
        renderCell: (item: VulnerabilityWithSoftware) => (
          <SoftwareSourceBadge source={item.software_source as SoftwareSource} />
        ),
      },
      {
        key: 'severity',
        label: 'SEVERITY',
        width: 'w-[15%]',
        sortable: true,
        sortValue: (item: VulnerabilityWithSoftware) => {
          const severity = getSeverity(item.cve);
          return severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
        },
        renderCell: (item: VulnerabilityWithSoftware) => {
          const severity = getSeverity(item.cve);
          const variantMap = {
            critical: 'critical' as const,
            high: 'error' as const,
            medium: 'warning' as const,
            low: 'info' as const,
          };
          return <StatusTag label={severity.toUpperCase()} variant={variantMap[severity]} />;
        },
      },
      {
        key: 'created_at',
        label: 'DISCOVERED',
        width: 'w-[25%]',
        sortable: true,
        renderCell: (item: VulnerabilityWithSoftware) => (
          <div className="font-['DM_Sans'] font-medium text-ods-text-primary">{formatDate(item.created_at)}</div>
        ),
      },
    ],
    [formatDate, getSeverity],
  );

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
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
          Vulnerabilities ({vulnerabilities.length})
        </h3>

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

      <Table data={vulnerabilities} columns={columns} rowKey="unique_key" rowClassName="mb-1" />
    </div>
  );
}
