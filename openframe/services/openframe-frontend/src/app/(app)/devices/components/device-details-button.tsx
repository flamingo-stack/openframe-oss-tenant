'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core';
import { useRouter } from 'next/navigation';

interface DeviceDetailsButtonProps {
  deviceId?: string;
  machineId?: string;
  label?: string;
  variant?: 'primary' | 'outline' | 'secondary';
  className?: string;
  openInNewTab?: boolean;
}

export function DeviceDetailsButton({
  deviceId,
  machineId,
  label = 'Details',
  variant = 'outline',
  className,
  openInNewTab = false,
}: DeviceDetailsButtonProps) {
  const _router = useRouter();

  const id = machineId || deviceId;

  if (!id) {
    return null;
  }

  return (
    <Button variant={variant} href={`/devices/details/${id}`} openInNewTab={openInNewTab} className={className}>
      {label}
    </Button>
  );
}
