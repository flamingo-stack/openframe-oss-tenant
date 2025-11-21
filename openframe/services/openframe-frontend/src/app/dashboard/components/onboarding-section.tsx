'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  OnboardingWalkthrough,
  type OnboardingStepConfig,
  SSOConfigurationIcon,
  OrganizationsIcon,
  DevicesIcon,
  UsersGroupIcon,
  DocumentIcon
} from '@flamingo/ui-kit'
import { apiClient } from '@lib/api-client'
import { GET_ORGANIZATIONS_QUERY } from '../../organizations/queries/organizations-queries'
import { GET_DEVICE_FILTERS_QUERY } from '../../devices/queries/devices-queries'

/**
 * Dashboard onboarding section with direct API completion checks
 * Each check makes its own fresh API call
 */
export function OnboardingSection() {
  const router = useRouter()

  const onboardingSteps: OnboardingStepConfig[] = [
    {
      id: 'sso-configuration',
      title: 'SSO Configuration',
      description: 'Link Microsoft 365, Google Workspace, and other identity providers',
      actionIcon: (color = 'black') => <SSOConfigurationIcon color={color} className="w-6 h-6" />,
      actionText: 'Setup SSO',
      completedText: 'SSO Configurations',
      onAction: async () => {
        router.push('/settings?tab=sso-configuration')
      },
      checkComplete: async () => {
        const res = await apiClient.get<{ provider: string, displayName: string }[]>('api/sso/providers/available')
        console.log('✓ SSO Check:', res.data?.length || 0, 'providers')
        return res.ok && res.data ? res.data.length > 0 : false
      }
    },
    {
      id: 'organizations-setup',
      title: 'Organizations Setup',
      description: 'Create and configure your organizational structure',
      actionIcon: (color = 'black') => <OrganizationsIcon color={color} className="w-6 h-6" />,
      actionText: 'Add Organization',
      completedText: 'Manage Organizations',
      onAction: async () => {
        router.push('/organizations')
      },
      checkComplete: async () => {
        const res = await apiClient.post<any>('/api/graphql', {
          query: GET_ORGANIZATIONS_QUERY,
          variables: { search: '' }
        })
        const orgs = res.data?.data?.organizations?.organizations || []
        console.log('✓ Organizations Check:', orgs.length, 'organizations')
        return orgs.length > 0
      }
    },
    {
      id: 'device-management',
      title: 'Device Management',
      description: 'Connect and monitor your fleet of devices',
      actionIcon: (color = 'black') => <DevicesIcon color={color} className="w-6 h-6" />,
      actionText: 'Add Devices',
      completedText: 'Manage Devices',
      onAction: async () => {
        router.push('/devices')
      },
      checkComplete: async () => {
        const res = await apiClient.post<any>('/api/graphql', {
          query: GET_DEVICE_FILTERS_QUERY,
          variables: { filter: {} }
        })
        const count = res.data?.data?.deviceFilters?.filteredCount || 0
        console.log('✓ Devices Check:', count, 'devices')
        return count > 0
      }
    },
    {
      id: 'company-and-team',
      title: 'Company & Team',
      description: 'Invite team members and set up roles',
      actionIcon: (color = 'black') => <UsersGroupIcon color={color} className="w-6 h-6" />,
      actionText: 'Add Team Members',
      completedText: 'Manage Users',
      onAction: async () => {
        router.push('/settings?tab=company-and-users')
      },
      checkComplete: async () => {
        const res = await apiClient.get<{ items: any[], totalElements: number }>('api/users?page=0&size=5')
        console.log('✓ Users Check:', res.data?.totalElements || 0, 'users')
        return res.ok && res.data ? res.data.totalElements > 1 : false
      }
    },
    {
      id: 'knowledge-base',
      title: 'Knowledge Base',
      description: 'Access documentation and learning resources',
      actionIcon: (color = 'black') => <DocumentIcon color={color} className="w-6 h-6" />,
      actionText: 'Knowledge Base',
      completedText: 'Knowledge Base',
      onAction: async () => {
        window.open('https://www.flamingo.run/knowledge-base', '_blank', 'noopener,noreferrer')
      }
      // No checkComplete - will auto-mark as complete when clicked
    }
  ]

  return (
    <OnboardingWalkthrough
      steps={onboardingSteps}
      storageKey="openframe-dashboard-onboarding"
      spacing="space-y-4"
    />
  )
}
