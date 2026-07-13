import { DeviceCardSkeleton, DeviceCardSkeletonGrid } from '@flamingo-stack/openframe-frontend-core/components';
import { DeviceCard } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';
import type { Device } from '../types/device.types';
import { getDeviceName } from '../utils/device-name';
import { getDeviceOperatingSystem, getDeviceStatusConfig } from '../utils/device-status';

interface DevicesGridProps {
  devices: Device[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  sentinelRef?: React.RefObject<HTMLDivElement | null>;
  emptyMessage?: string;
}

export function DevicesGrid({
  devices,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
  emptyMessage = 'No devices found. Try adjusting your search or filters.',
}: DevicesGridProps) {
  const router = useRouter();

  const handleDeviceClick = (device: Device) => {
    const id = device.machineId || device.id;
    if (id) {
      router.push(routes.devices.details(id));
    }
  };

  return (
    <div className="space-y-4">
      {isLoading && devices.length === 0 ? (
        <DeviceCardSkeletonGrid count={12} />
      ) : devices.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-ods-card border border-ods-border rounded-[6px]">
          <p className="text-ods-text-secondary">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map(device => {
              const statusConfig = getDeviceStatusConfig(device.status);
              return (
                <DeviceCard
                  key={device.id || device.machineId}
                  device={{
                    id: device.id,
                    machineId: device.machineId,
                    name: getDeviceName(device),
                    organization: device.organization || device.machineId,
                    lastSeen: device.lastSeen,
                    operatingSystem: getDeviceOperatingSystem(device.osType),
                  }}
                  statusTag={
                    device.status
                      ? {
                          label: statusConfig.label,
                          variant: statusConfig.variant,
                        }
                      : undefined
                  }
                  onDeviceClick={() => handleDeviceClick(device)}
                  actions={{
                    moreButton: {
                      visible: false,
                    },
                  }}
                  className="h-full"
                />
              );
            })}
            {isFetchingNextPage && Array.from({ length: 4 }, (_, i) => <DeviceCardSkeleton key={`skeleton-${i}`} />)}
          </div>
          {hasNextPage && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}
        </>
      )}
    </div>
  );
}
