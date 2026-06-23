'use client';

import {
  type ColumnDef,
  DataTable,
  type Row,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import type { AiQuickAction } from '../types/ai-settings';

interface AiSettingsQuickActionsProps {
  actions: AiQuickAction[];
}

/**
 * Read-only Quick Actions table (shown in `!isEditMode`). Single-column
 * `DataTable` mirroring the shared table pattern used across the app (e.g.
 * monitoring Policies): the column header doubles as the section title and the
 * row count renders in the header's right slot ("3 results").
 */
export function AiSettingsQuickActions({ actions }: AiSettingsQuickActionsProps) {
  const columns = useMemo<ColumnDef<AiQuickAction>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Quick Actions',
        cell: ({ row }: { row: Row<AiQuickAction> }) => (
          <div className="flex flex-col justify-center min-h-[60px]">
            <TruncateText>{row.original.name}</TruncateText>
            <TruncateText variant="h6" tone="secondary">
              {row.original.instructions}
            </TruncateText>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useDataTable<AiQuickAction>({
    data: actions,
    columns,
    getRowId: (row: AiQuickAction) => row.id,
    enableSorting: false,
  });

  return (
    <DataTable table={table}>
      <DataTable.Header rightSlot={<DataTable.RowCount />} />
      <DataTable.Body emptyMessage="No quick actions configured." rowClassName="mb-1" />
    </DataTable>
  );
}
