import { NavigationSidebarItem } from '@flamingo-stack/openframe-frontend-core/types/navigation'
import { 
  DashboardIcon,
  DevicesIcon,
  SettingsIcon, 
  LogsIcon,
  ScriptIcon,
  MingoIcon,
  PoliciesIcon,
  OrganizationsIcon
} from '@flamingo-stack/openframe-frontend-core/components/icons'
import { isAuthOnlyMode, isSaasTenantMode } from './app-mode'

export const getNavigationItems = (
  pathname: string,
  onLogout: () => void
): NavigationSidebarItem[] => {
  if (isAuthOnlyMode()) {
    return []
  }

  const baseItems: NavigationSidebarItem[] = [
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
    }
  ]

  if (isSaasTenantMode()) {
    baseItems.push({
      id: 'mingo',
      label: 'Mingo AI',
      icon: <MingoIcon className="w-5 h-5" />,
      path: '/mingo',
      isActive: pathname === '/mingo/'
    })
  }

  baseItems.push(
    {
      id: 'organizations',
      label: 'Organizations',
      icon: <OrganizationsIcon className="w-6 h-6" />,
      path: '/organizations',
      section: 'secondary',
      isActive: pathname === '/organizations/'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon className="w-5 h-5" />,
      path: '/settings',
      section: 'secondary',
      isActive: pathname === '/settings/'
    }
  )

  return baseItems
}