import { NavigationSidebarItem } from '@flamingo/ui-kit/types/navigation'
import { 
  DashboardIcon,
  DevicesIcon,
  SettingsIcon, 
  LogOutIcon,
  LogsIcon
} from '@flamingo/ui-kit/components/icons'

export const getNavigationItems = (
  pathname: string,
  onLogout: () => void
): NavigationSidebarItem[] => [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon className="w-5 h-5" />,
    path: '/dashboard',
    isActive: pathname === '/dashboard/'
  },
  {
    id: 'devices',
    label: 'Devices',
    icon: <DevicesIcon className="w-5 h-5" />,
    path: '/devices',
    isActive: pathname === '/devices/'
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: <LogsIcon className="w-5 h-5" />,
    path: '/logs-page',
    isActive: pathname === '/logs-page/'
  },
  // Secondary section items
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon className="w-5 h-5" />,
    path: '/settings',
    isActive: pathname === '/settings/',
    section: 'secondary'
  },
  {
    id: 'logout',
    label: 'Logout',
    icon: <LogOutIcon className="w-5 h-5" />,
    onClick: onLogout,
    section: 'secondary'
  }
]