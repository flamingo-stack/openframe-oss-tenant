import { NavigationSidebarItem } from '@flamingo/ui-kit/types/navigation'
import { 
  DashboardIcon,
  DevicesIcon,
  SettingsIcon, 
  LogOutIcon,
  LogsIcon,
  ScriptIcon
} from '@flamingo/ui-kit/components/icons'
import { isAuthOnlyMode } from './app-mode'

export const getNavigationItems = (
  pathname: string,
  onLogout: () => void
): NavigationSidebarItem[] => {
  if (isAuthOnlyMode()) {
    return []
  }

  return [
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
      id: 'scripts',
      label: 'Scripts',
      icon: <ScriptIcon className="w-5 h-5" />,
      path: '/scripts',
      isActive: pathname === '/scripts/'
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
}