import { Button, Table } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { DeviceTabContentProps } from './device-selector.types';

export function DeviceTabContent({
  mode,
  devices,
  columns,
  loading,
  renderRowActions,
  onAddAll,
  onRemoveAll,
  selectedCount,
  disabled,
  infiniteScroll,
}: DeviceTabContentProps) {
  return (
    <>
      <div className="flex justify-end -mb-2">
        {mode === 'available' ? (
          <Button
            variant="link"
            onClick={onAddAll}
            disabled={disabled}
            className="font-medium text-[14px] text-[var(--open-colors-yellow,#ffc008)] hover:text-[var(--open-colors-yellow-hover,#e6ac00)]"
          >
            Add All Devices
          </Button>
        ) : selectedCount > 0 ? (
          <Button
            variant="link"
            onClick={onRemoveAll}
            disabled={disabled}
            className="font-medium text-[14px] text-[var(--ods-attention-red-error,#d32f2f)] hover:text-[var(--ods-attention-red-error-hover,#b71c1c)]"
          >
            Remove {selectedCount} Devices
          </Button>
        ) : null}
      </div>
      <Table
        data={devices}
        columns={columns}
        rowKey="id"
        loading={loading}
        skeletonRows={8}
        emptyMessage={mode === 'selected' ? 'No devices selected' : 'No devices found'}
        showFilters={false}
        renderRowActions={renderRowActions}
        infiniteScroll={infiniteScroll}
      />
    </>
  );
}
