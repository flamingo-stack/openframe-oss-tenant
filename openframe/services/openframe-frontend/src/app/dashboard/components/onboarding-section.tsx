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
import { useOnboardingCompletion } from '../hooks/use-onboarding-completion'

/**
 * Dashboard onboarding section using existing hooks for completion detection
 * Eliminates duplicate API calls by leveraging dashboard hooks
 */
export function OnboardingSection() {
  const router = useRouter()
  const { completionStatus, isLoading } = useOnboardingCompletion()

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
      // No checkComplete - auto-completes when clicked
    }
  ]

  return (
    <OnboardingWalkthrough
      steps={onboardingSteps}
      storageKey="openframe-dashboard-onboarding"
      spacing="space-y-4"
      completionStatus={completionStatus}
      isLoadingCompletion={isLoading}
    />
  )
}
