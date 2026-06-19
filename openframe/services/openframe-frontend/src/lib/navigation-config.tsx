import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  BookBookmarkIcon,
  BracketCurlyIcon,
  ChartDonutIcon,
  ClipboardListIcon,
  IdCardIcon,
  MonitorIcon,
  QuestionCircleIcon,
  RadarIcon,
  Settings02Icon,
  TagIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { NavigationSidebarItem } from '@flamingo-stack/openframe-frontend-core/types/navigation';
import type { UnreadCountsByCategory } from '@/app/components/notifications/unread-counts-hydrator';
import { NotificationCategory } from '@/generated/schema-enums';
import { isAuthOnlyMode, isSaasTenantMode } from './app-mode';
import { featureFlags } from './feature-flags';

const CATEGORY_BY_NAV_ID: Record<string, NotificationCategory> = {
  dashboard: NotificationCategory.DASHBOARD,
  organizations: NotificationCategory.CUSTOMERS,
  devices: NotificationCategory.DEVICES,
  scripts: NotificationCategory.SCRIPTS,
  monitoring: NotificationCategory.MONITORING,
  logs: NotificationCategory.LOGS,
  tickets: NotificationCategory.TICKETS,
  mingo: NotificationCategory.MINGO,
};

export const getNavigationItems = (
  pathname: string,
  unreadCounts?: UnreadCountsByCategory,
): NavigationSidebarItem[] => {
  if (isAuthOnlyMode()) {
    return [];
  }

  const baseItems: NavigationSidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <ChartDonutIcon size={24} />,
      path: '/dashboard',
      isActive: pathname.startsWith('/dashboard'),
    },
    {
      id: 'organizations',
      label: 'Customers',
      icon: <IdCardIcon size={24} />,
      path: '/customers',
      isActive: pathname.startsWith('/customers'),
    },
    {
      id: 'devices',
      label: 'Devices',
      icon: <MonitorIcon size={24} />,
      path: '/devices',
      isActive: pathname.startsWith('/devices'),
    },
    {
      id: 'scripts',
      label: 'Scripts',
      icon: <BracketCurlyIcon size={24} />,
      path: '/scripts',
      isActive: pathname.startsWith('/scripts'),
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: <RadarIcon size={24} />,
      path: '/monitoring',
      isActive: pathname.startsWith('/monitoring'),
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: <ClipboardListIcon size={24} />,
      path: '/logs-page',
      isActive: pathname.startsWith('/logs-page') || pathname.startsWith('/log-details'),
    },
  ];

  if (isSaasTenantMode()) {
    baseItems.push(
      {
        id: 'tickets',
        label: 'Tickets',
        icon: <TagIcon size={24} />,
        path: '/tickets',
        isActive: pathname.startsWith('/tickets'),
      },
      {
        id: 'mingo',
        label: 'Mingo',
        icon: <MingoIcon className="w-6 h-6" />,
        path: '/mingo',
        isActive: pathname.startsWith('/mingo'),
      },
    );
  }

  baseItems.push({
    id: 'knowledge-base',
    label: 'Knowledge Base',
    icon: <BookBookmarkIcon size={24} />,
    path: '/knowledge-base',
    section: 'secondary',
    isActive: pathname.startsWith('/knowledge-base'),
  });

  if (featureFlags.helpCenter.enabled()) {
    baseItems.push({
      id: 'help-center',
      label: 'Help Center',
      icon: <QuestionCircleIcon size={24} />,
      path: '/help-center',
      section: 'secondary',
      isActive: pathname.startsWith('/help-center'),
    });
  }

  baseItems.push({
    id: 'settings',
    label: 'Settings',
    icon: <Settings02Icon size={24} />,
    path: '/settings',
    section: 'secondary',
    isActive: pathname.startsWith('/settings'),
  });

  // TODO: re-enable sidebar unread count badges — flip this flag back to true.
  const showUnreadBadges: boolean = false;

  return baseItems.map(item => {
    if (!showUnreadBadges) return item;
    const category = CATEGORY_BY_NAV_ID[item.id];
    const unreadCount = category ? unreadCounts?.[category] : undefined;
    return unreadCount ? { ...item, unreadCount } : item;
  });
};
