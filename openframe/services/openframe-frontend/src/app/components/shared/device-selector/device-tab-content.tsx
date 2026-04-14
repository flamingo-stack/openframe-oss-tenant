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
  singleSelect,
}: DeviceTabContentProps) {
  return (
    <>
      {!singleSelect && (
        <div className="flex justify-end -mb-2">
          {mode === 'available' ? (
            <Button
              variant="link"
              onClick={onAddAll}
              disabled={disabled}
              className="text-heading-4 font-medium text-ods-accent hover:text-ods-accent-hover"
            >
              Add All Devices
            </Button>
          ) : selectedCount > 0 ? (
            <Button
              variant="link"
              onClick={onRemoveAll}
              disabled={disabled}
              className="text-heading-4 font-medium text-ods-error hover:text-ods-error-hover"
            >
              Remove {selectedCount} Devices
            </Button>
          ) : null}
        </div>
      )}
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
