'use client';

import { Tag } from '@flamingo-stack/openframe-frontend-core';
import {
  CodeIcon,
  GridIcon,
  PackageAltIcon,
  PackageIcon,
  Puzzle01Icon,
  WebDesignIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  type ColumnDef,
  DataTable,
  type Row,
  SearchInput,
  type SortingState,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { type ComponentType, useMemo, useState } from 'react';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import type { Device, Software } from '../../types/device.types';
import { TabEmptyState } from './tab-empty-state';

interface SoftwareTabProps {
  device: Device | null;
}

const EMPTY_SOFTWARE: Software[] = [];
const EMPTY_COLUMN_FILTERS: never[] = [];

/** Software source → icons-v2 glyph + readable label for the SOURCE column. */
const SOURCE_ICON: Record<string, { Icon: ComponentType<{ className?: string }>; label: string }> = {
  apps: { Icon: GridIcon, label: 'Application' },
  chrome_extensions: { Icon: Puzzle01Icon, label: 'Chrome Extension' },
  vscode_extensions: { Icon: CodeIcon, label: 'VS Code Extension' },
  homebrew_packages: { Icon: PackageIcon, label: 'Homebrew Package' },
  python_packages: { Icon: PackageAltIcon, label: 'Python Package' },
};

function getSourceIcon(source: string): { Icon: ComponentType<{ className?: string }>; label: string } {
  return SOURCE_ICON[source] ?? { Icon: PackageIcon, label: source };
}

function formatLastUsed(dateString?: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.getTime() > 0 ? formatRelativeTime(date) : '—';
}

export function SoftwareTab({ device }: SoftwareTabProps) {
  const allSoftware = device?.software || EMPTY_SOFTWARE;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

  const software = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return allSoftware;
    return allSoftware.filter(
      item => item.name.toLowerCase().includes(query) || (item.vendor ?? '').toLowerCase().includes(query),
    );
  }, [allSoftware, debouncedSearch]);

  const columns = useMemo<ColumnDef<Software>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'SOFTWARE',
        cell: ({ row }: { row: Row<Software> }) => (
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-h4 text-ods-text-primary truncate" title={row.original.name}>
              {row.original.name}
            </span>
            {row.original.version && (
              <span className="text-h6 text-ods-text-secondary truncate" title={row.original.version}>
                {row.original.version}
              </span>
            )}
          </div>
        ),
        enableSorting: true,
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: 'source',
        header: 'SOURCE',
        cell: ({ row }: { row: Row<Software> }) => {
          const { Icon, label } = getSourceIcon(row.original.source);
          return (
            <span className="inline-flex items-center gap-[var(--spacing-system-xs)] text-ods-text-secondary min-w-0">
              <Icon className="w-4 h-4 md:w-6 md:h-6 shrink-0" />
              <span className="text-h4 truncate" title={label}>
                {label}
              </span>
            </span>
          );
        },
        enableSorting: true,
        meta: { width: 'w-[180px] shrink-0', hideAt: 'lg' },
      },
      {
        id: 'vulnerabilities',
        header: 'VULNERABILITIES',
        accessorFn: (row: Software) => row.vulnerabilities.length,
        cell: ({ row }: { row: Row<Software> }) => {
          const vulnCount = row.original.vulnerabilities.length;
          if (vulnCount === 0) {
            return <Tag label="NO ISSUES" variant="success" className="w-fit" />;
          }
          return (
            <Tag label={`${vulnCount} ${vulnCount === 1 ? 'ISSUE' : 'ISSUES'}`} variant="error" className="w-fit" />
          );
        },
        enableSorting: true,
        sortingFn: (rowA: Row<Software>, rowB: Row<Software>) => {
          const a = rowA.original.vulnerabilities.length;
          const b = rowB.original.vulnerabilities.length;
          if (a === b) return 0;
          return a > b ? 1 : -1;
        },
        meta: { width: 'w-[160px] shrink-0' },
      },
      {
        id: 'file_path',
        header: 'FILE PATH',
        accessorFn: (row: Software) => row.installed_paths?.[0] ?? '',
        cell: ({ row }: { row: Row<Software> }) => {
          const path = row.original.installed_paths?.[0];
          return path ? (
            <TruncateText>{path}</TruncateText>
          ) : (
            <span className="text-h4 text-ods-text-secondary">—</span>
          );
        },
        enableSorting: false,
        meta: { width: 'w-[220px] shrink-0', hideAt: 'lg' },
      },
      {
        accessorKey: 'last_opened_at',
        header: 'LAST USED',
        cell: ({ row }: { row: Row<Software> }) => (
          <div className="font-['DM_Sans'] font-medium text-ods-text-primary">
            {formatLastUsed(row.original.last_opened_at)}
          </div>
        ),
        enableSorting: true,
        meta: { width: 'w-[140px] shrink-0', hideAt: 'md' },
      },
    ],
    [],
  );

  const table = useDataTable<Software>({
    data: software,
    columns,
    getRowId: (row: Software) => String(row.id),
    clientSideSorting: true,
    state: { sorting, columnFilters: EMPTY_COLUMN_FILTERS },
    onSortingChange: setSorting,
  });

  if (!device) {
    return (
      <TabEmptyState
        icon={<WebDesignIcon />}
        title="No software found"
        description="Installed software for this device will appear here."
      />
    );
  }

  if (allSoftware.length === 0) {
    return (
      <TabEmptyState
        icon={<WebDesignIcon />}
        title="No software found"
        description="Installed software for this device will appear here."
      />
    );
  }

  // Empty table → show only the centered empty state: hide the column header always, and
  // hide the search too (unless a search is active, so the user can still clear it).
  const hasSearch = debouncedSearch.trim().length > 0;
  const isEmpty = software.length === 0;

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]" style={containerStyle}>
      {(!isEmpty || hasSearch) && (
        <div
          ref={toolbarRef}
          className="sticky top-0 z-20 bg-ods-bg py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]"
        >
          <SearchInput value={search} onChange={setSearch} placeholder="Search for Software" />
        </div>
      )}

      <DataTable table={table}>
        {!isEmpty && <DataTable.Header stickyHeader stickyHeaderOffset={stickyHeaderOffset} />}
        <DataTable.Body
          rowClassName="mb-1"
          emptyState={{
            icon: <WebDesignIcon />,
            title: 'No software found',
            description: debouncedSearch
              ? `No results for "${debouncedSearch}".`
              : 'Installed software for this device will appear here.',
          }}
        />
      </DataTable>
    </div>
  );
}
