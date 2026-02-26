import { ContentLoadingContainer, DeviceCardSkeletonGrid } from '@flamingo-stack/openframe-frontend-core/components';
import { DeviceCard } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import type { Device } from '../types/device.types';
import { getDeviceOperatingSystem, getDeviceStatusConfig } from '../utils/device-status';

interface DevicesGridProps {
  devices: Device[];
  isLoading: boolean;
  filters: {
    statuses?: string[];
    deviceTypes?: string[];
    osTypes?: string[];
  };
}

export function DevicesGrid({ devices, isLoading, filters }: DevicesGridProps) {
  const router = useRouter();

  const handleDeviceClick = (device: Device) => {
    const id = device.machineId || device.id;
    if (id) {
      router.push(`/devices/details/${id}`);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      {filters.statuses?.length || filters.deviceTypes?.length || filters.osTypes?.length ? (
        <div className="flex flex-wrap gap-2">
          {filters.statuses?.map(status => (
            <span
              key={status}
              className="px-3 py-1 bg-ods-card border border-ods-border rounded-[6px] text-[14px] text-ods-text-primary"
            >
              Status: {status}
            </span>
          ))}
          {filters.deviceTypes?.map(type => (
            <span
              key={type}
              className="px-3 py-1 bg-ods-card border border-ods-border rounded-[6px] text-[14px] text-ods-text-primary"
            >
              Type: {type}
            </span>
          ))}
          {filters.osTypes?.map(os => (
            <span
              key={os}
              className="px-3 py-1 bg-ods-card border border-ods-border rounded-[6px] text-[14px] text-ods-text-primary"
            >
              OS: {os}
            </span>
          ))}
        </div>
      ) : null}

      <ContentLoadingContainer
        isLoading={isLoading}
        skeletonComponent={<DeviceCardSkeletonGrid count={12} />}
        minHeight="min-h-[400px] md:min-h-[900px]"
      >
        {devices.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-ods-card border border-ods-border rounded-[6px]">
            <p className="text-ods-text-secondary">No devices found. Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {devices.map(device => {
              const statusConfig = getDeviceStatusConfig(device.status);
              return (
                <DeviceCard
                  key={device.id || device.machineId}
                  device={{
                    id: device.id,
                    machineId: device.machineId,
                    name: device.displayName || device.hostname || device.description || '',
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
          </div>
        )}
      </ContentLoadingContainer>
    </div>
  );
}
