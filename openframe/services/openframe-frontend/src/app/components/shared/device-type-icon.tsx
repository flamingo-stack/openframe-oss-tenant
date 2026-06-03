import {
  HardDrivesIcon,
  LaptopIcon,
  MobilePhoneIcon,
  MonitorIcon,
  TabletIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type React from 'react';

const DEFAULT_CLASS_NAME = 'w-6 h-6 text-ods-text-secondary';

/**
 * Returns the icon for a device type (desktop / laptop / server / mobile / tablet),
 * using the current icons-v2 set. Replaces the deprecated `getDeviceTypeIcon` from
 * the core library.
 *
 * Returns `undefined` for unknown / missing types so the caller can skip rendering.
 *
 * TODO: migrate remaining call sites that still use the deprecated
 * `getDeviceTypeIcon` from `@flamingo-stack/openframe-frontend-core`:
 *   - src/app/(app)/monitoring/policy/components/policy-devices-table.tsx
 *   - src/app/(app)/devices/components/devices-table-columns.tsx
 *   - src/app/components/shared/device-selector/device-selector.tsx
 */
export function renderDeviceTypeIcon(type?: string, className: string = DEFAULT_CLASS_NAME): React.ReactNode {
  switch (type?.toLowerCase()) {
    case 'desktop':
      return <MonitorIcon className={className} />;
    case 'laptop':
      return <LaptopIcon className={className} />;
    case 'server':
      return <HardDrivesIcon className={className} />;
    case 'mobile':
      return <MobilePhoneIcon className={className} />;
    case 'tablet':
      return <TabletIcon className={className} />;
    default:
      return undefined;
  }
}
