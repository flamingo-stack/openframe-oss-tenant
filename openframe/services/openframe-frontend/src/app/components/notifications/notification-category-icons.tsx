import type { Notification } from '@flamingo-stack/openframe-frontend-core';
import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  BracketCurlyIcon,
  ChartDonutIcon,
  ClipboardListIcon,
  IdCardIcon,
  MonitorIcon,
  PackageIcon,
  RadarIcon,
  TagIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ReactNode } from 'react';

/**
 * Backend `NotificationCategory` → icon, mirroring the app navigation mapping
 * (`src/lib/navigation-config.tsx`). GENERIC and unknown categories resolve to
 * undefined. Icons inherit the host's text color via `currentColor`, except the
 * Mingo mark which keeps its canonical brand colors (white + cyan).
 */
const iconByCategory: Record<string, ReactNode> = {
  DASHBOARD: <ChartDonutIcon size={16} />,
  CUSTOMERS: <IdCardIcon size={16} />,
  DEVICES: <MonitorIcon size={16} />,
  SCRIPTS: <BracketCurlyIcon size={16} />,
  MONITORING: <RadarIcon size={16} />,
  SOFTWARE: <PackageIcon size={16} />,
  LOGS: <ClipboardListIcon size={16} />,
  TICKETS: <TagIcon size={16} />,
  MINGO: (
    <MingoIcon
      className="size-4"
      eyesColor="var(--ods-flamingo-cyan-base)"
      cornerColor="var(--ods-flamingo-cyan-base)"
    />
  ),
};

export function getNotificationCategoryIcon(category: string | null | undefined): ReactNode | undefined {
  return category ? iconByCategory[category.toUpperCase()] : undefined;
}

/** Attach the category icon for tile rendering; explicit `icon`/`imageUrl` win. */
export function withCategoryIcon(notification: Notification): Notification {
  if (notification.icon || notification.imageUrl) return notification;
  const icon = getNotificationCategoryIcon(notification.category);
  return icon ? { ...notification, icon } : notification;
}
