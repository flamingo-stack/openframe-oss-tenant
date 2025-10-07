import { NavigationSidebarItem } from '@flamingo/ui-kit/types/navigation'
import { 
  DashboardIcon,
  DevicesIcon,
  SettingsIcon, 
  LogsIcon,
  ScriptIcon,
  MingoIcon,
  PoliciesIcon
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
    // {
    //   id: 'policies-and-queries',
    //   label: 'Policies & Queries',
    //   icon: <PoliciesIcon className="w-5 h-5" />,
    //   path: '/policies-and-queries',
    //   isActive: pathname === '/policies-and-queries/'
    // },
    {
      id: 'logs',
      label: 'Logs',
      icon: <LogsIcon className="w-5 h-5" />,
      path: '/logs-page',
      isActive: pathname === '/logs-page/'
    },
    {
      id: 'mingo',
      label: 'Mingo AI',
      icon: <MingoIcon className="w-5 h-5" />,
      path: '/mingo',
      isActive: pathname === '/mingo/'
    },
    // Secondary section items
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon className="w-5 h-5" />,
      path: '/settings',
      isActive: pathname === '/settings/',
      section: 'secondary'
    }
  ]
}