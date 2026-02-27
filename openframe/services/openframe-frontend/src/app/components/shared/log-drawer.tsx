'use client';

import {
  CardLoader,
  DeviceCard,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Tag,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import type React from 'react';
import { useEffect } from 'react';
import { DeviceDetailsButton } from '../../devices/components/device-details-button';
import { useDeviceDetails } from '../../devices/hooks/use-device-details';
import { getDeviceOperatingSystem, getDeviceStatusConfig } from '../../devices/utils/device-status';

export interface LogDrawerInfoField {
  label: string;
  value: string | React.ReactNode;
}

interface LogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  statusTag?: {
    label: string;
    variant?: 'success' | 'warning' | 'error' | 'grey' | 'critical';
  };
  timestamp?: string;
  infoFields?: LogDrawerInfoField[];
  /** Device ID — renders a DeviceCard pinned to the bottom */
  deviceId?: string;
  children?: React.ReactNode;
}

function DrawerDeviceCard({ deviceId }: { deviceId: string }) {
  const { deviceDetails, isLoading, fetchDeviceById } = useDeviceDetails();

  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId);
    }
  }, [deviceId, fetchDeviceById]);

  if (isLoading) {
    return <CardLoader items={2} containerClassName="p-0" />;
  }

  if (!deviceDetails) return null;

  return (
    <DeviceCard
      device={{
        id: deviceDetails.id,
        machineId: deviceDetails.machineId,
        name: deviceDetails.displayName || deviceDetails.hostname || deviceDetails.description || '',
        organization: deviceDetails.organization || deviceDetails.machineId,
        lastSeen: deviceDetails.lastSeen,
        operatingSystem: getDeviceOperatingSystem(deviceDetails.osType),
      }}
      statusTag={
        deviceDetails.status
          ? {
              label: getDeviceStatusConfig(deviceDetails.status).label,
              variant: getDeviceStatusConfig(deviceDetails.status).variant,
            }
          : undefined
      }
      actions={{
        moreButton: { visible: false },
        detailsButton: {
          visible: true,
          component: (
            <DeviceDetailsButton deviceId={deviceDetails.id} machineId={deviceDetails.machineId} className="shrink-0" />
          ),
        },
      }}
    />
  );
}

export function LogDrawer({
  isOpen,
  onClose,
  description,
  statusTag,
  timestamp,
  infoFields,
  deviceId,
}: LogDrawerProps) {
  const hasDevice = !!deviceId && deviceId !== 'null' && deviceId !== '';

  return (
    <Drawer
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DrawerContent side="right" className="max-w-[400px]">
        {/* Header */}
        <DrawerHeader>
          <DrawerTitle>Log Details</DrawerTitle>

          {description && <DrawerDescription>{description}</DrawerDescription>}

          {(statusTag || timestamp) && (
            <div className="flex items-center gap-2">
              {statusTag && <Tag label={statusTag.label} variant={statusTag.variant} />}
              {timestamp && (
                <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">
                  {timestamp}
                </span>
              )}
            </div>
          )}
        </DrawerHeader>

        {/* Body */}
        <DrawerBody>
          <div className="flex-1 space-y-4 overflow-y-auto min-h-0">
            {/* Info Card — vertical fields: Value on top, Label below */}
            {infoFields && infoFields.length > 0 && (
              <div className="p-4 bg-ods-card border border-ods-border rounded-[6px] flex flex-col gap-3">
                {infoFields.map(field => (
                  <div key={typeof field.label === 'string' ? field.label : ''} className="flex flex-col gap-0.5">
                    <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
                      {field.value || '—'}
                    </span>
                    <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
                      {field.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DeviceCard pinned to bottom */}
          {hasDevice && (
            <div className="mt-auto">
              <DrawerDeviceCard deviceId={deviceId} />
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
