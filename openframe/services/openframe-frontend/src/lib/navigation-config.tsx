import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  BracketCurlyIcon,
  ChartDonutIcon,
  ClipboardListIcon,
  IdCardIcon,
  MonitorIcon,
  RadarIcon,
  Settings02Icon,
  TagIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { NavigationSidebarItem } from '@flamingo-stack/openframe-frontend-core/types/navigation';
import { isAuthOnlyMode, isSaasTenantMode } from './app-mode';

export const getNavigationItems = (pathname: string): NavigationSidebarItem[] => {
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
      label: 'Organizations',
      icon: <IdCardIcon size={24} />,
      path: '/organizations',
      isActive: pathname.startsWith('/organizations'),
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
    id: 'settings',
    label: 'Settings',
    icon: <Settings02Icon size={24} />,
    path: '/settings',
    section: 'secondary',
    isActive: pathname.startsWith('/settings'),
  });

  return baseItems;
};
