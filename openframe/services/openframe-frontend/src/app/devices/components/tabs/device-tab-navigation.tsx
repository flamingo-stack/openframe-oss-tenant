'use client'

import React from 'react'
import { Button } from '@flamingo/ui-kit'
import { 
  Cpu, 
  Network, 
  Shield, 
  FileCheck, 
  Bot, 
  Users, 
  Package, 
  AlertTriangle, 
  FileText 
} from 'lucide-react'
import { HardwareTab } from './hardware-tab'
import { NetworkTab } from './network-tab'
import { SecurityTab } from './security-tab'
import { ComplianceTab } from './compliance-tab'
import { AgentsTab } from './agents-tab'
import { UsersTab } from './users-tab'
import { SoftwareTab } from './software-tab'
import { VulnerabilitiesTab } from './vulnerabilities-tab'
import { LogsTab } from './logs-tab'

export interface DeviceTab {
  id: string
  label: string
  icon: React.ReactNode
  hasAlert?: boolean
  alertType?: 'warning' | 'error'
  component: React.ComponentType<{ device: any }>
}

interface DeviceTabNavigationProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

const DEVICE_TABS: DeviceTab[] = [
  { 
    id: 'hardware', 
    label: 'Hardware', 
    icon: <Cpu className="h-6 w-6" />,
    component: HardwareTab
  },
  { 
    id: 'network', 
    label: 'Network', 
    icon: <Network className="h-6 w-6" />,
    component: NetworkTab
  },
  { 
    id: 'security', 
    label: 'Security', 
    icon: <Shield className="h-6 w-6" />,
    hasAlert: false,
    alertType: 'error',
    component: SecurityTab
  },
  { 
    id: 'compliance', 
    label: 'Compliance', 
    icon: <FileCheck className="h-6 w-6" />,
    component: ComplianceTab
  },
  { 
    id: 'agents', 
    label: 'Agents', 
    icon: <Bot className="h-6 w-6" />,
    hasAlert: false,
    alertType: 'warning',
    component: AgentsTab
  },
  { 
    id: 'users', 
    label: 'Users', 
    icon: <Users className="h-6 w-6" />,
    component: UsersTab
  },
  { 
    id: 'software', 
    label: 'Software', 
    icon: <Package className="h-6 w-6" />,
    hasAlert: false,
    alertType: 'warning',
    component: SoftwareTab
  },
  { 
    id: 'vulnerabilities', 
    label: 'Vulnerabilities', 
    icon: <AlertTriangle className="h-6 w-6" />,
    hasAlert: false,
    alertType: 'error',
    component: VulnerabilitiesTab
  },
  { 
    id: 'logs', 
    label: 'Logs', 
    icon: <FileText className="h-6 w-6" />,
    component: LogsTab
  }
]

export const getDeviceTabs = (): DeviceTab[] => DEVICE_TABS

export const getDeviceTab = (tabId: string): DeviceTab | undefined => 
  DEVICE_TABS.find(tab => tab.id === tabId)

export const getTabComponent = (tabId: string): React.ComponentType<{ device: any }> | null => {
  const tab = getDeviceTab(tabId)
  return tab?.component || null
}

export function DeviceTabNavigation({ activeTab, onTabChange }: DeviceTabNavigationProps) {
  return (
    <div className="bg-ods-bg relative w-full h-14 border-b border-ods-border">
      <div className="flex gap-1 items-center justify-start h-full overflow-x-auto">
        {DEVICE_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          
          return (
            <Button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              variant="ghost"
              leftIcon={<div className={`${isActive ? 'text-ods-text-primary' : 'text-ods-text-secondary'} transition-colors`}>{tab.icon}</div>}
              className={`
                flex gap-2 items-center justify-center p-4 relative shrink-0 h-14
                transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-b from-[rgba(255,192,8,0)] to-[rgba(255,192,8,0.1)]'
                  : 'hover:bg-ods-card/50'
                }
              `}
            >
              {/* Icon with alert indicator */}
              <div className="relative">
                {tab.hasAlert && (
                  <div className={`
                    absolute -top-1 -right-1 w-2 h-2 rounded-full
                    ${tab.alertType === 'error' ? 'bg-error' : 'bg-ods-accent'}
                  `} />
                )}
              </div>
              
              {/* Tab label */}
              <span className={`
                font-['DM_Sans'] font-medium text-[18px] leading-[24px] whitespace-nowrap
                ${isActive ? 'text-ods-text-primary' : 'text-ods-text-secondary'} transition-colors
              `}>
                {tab.label}
              </span>
              
              {/* Active tab indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-ods-accent" />
              )}
            </Button>
          )
        })}
        
        {/* Gradient overlay */}
        <div className="absolute right-0 top-0 w-10 h-14 bg-gradient-to-r from-transparent to-bg-primary pointer-events-none" />
      </div>
    </div>
  )
}
