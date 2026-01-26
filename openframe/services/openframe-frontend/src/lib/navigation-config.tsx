import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons'
import {
  BracketCurlyIcon,
  ChartDonutIcon,
  ClipboardListIcon,
  IdCardIcon,
  MonitorIcon,
  Settings02Icon
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import { NavigationSidebarItem } from '@flamingo-stack/openframe-frontend-core/types/navigation'
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
      icon: <ChartDonutIcon size={24} />,
      path: '/dashboard',
      isActive: pathname === '/dashboard/'
    },
    {
      id: 'organizations',
      label: 'Organizations',
      icon: <IdCardIcon size={24} />,
      path: '/organizations',
      isActive: pathname === '/organizations/'
    },
    {
      id: 'devices',
      label: 'Devices',
      icon: <MonitorIcon size={24} />,
      path: '/devices',
      isActive: pathname === '/devices/'
    },
    {
      id: 'scripts',
      label: 'Scripts',
      icon: <BracketCurlyIcon size={24} />,
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
      icon: <ClipboardListIcon size={24} />,
      path: '/logs-page',
      isActive: pathname === '/logs-page/'
    }
  ]

  if (isSaasTenantMode()) {
    baseItems.push({
      id: 'mingo',
      label: 'Mingo AI',
      icon: <MingoIcon className="w-6 h-6" />,
      path: '/mingo',
      isActive: pathname === '/mingo/'
    })
  }

  baseItems.push(
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings02Icon size={24} />,
      path: '/settings',
      section: 'secondary',
      isActive: pathname === '/settings/'
    }
  )

  return baseItems
}