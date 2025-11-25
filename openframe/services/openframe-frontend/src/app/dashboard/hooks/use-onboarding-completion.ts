'use client'

import { useState, useEffect } from 'react'
import { useOrganizations } from '../../organizations/hooks/use-organizations'
import { useDevices } from '../../devices/hooks/use-devices'
import { useSsoConfig } from '../../settings/hooks/use-sso-config'
import { useUsers } from '../../settings/hooks/use-users'

/**
 * Hook to check onboarding step completion using existing data hooks
 * Eliminates duplicate API calls by leveraging hooks already used by dashboard
 */
export function useOnboardingCompletion() {
  // Use existing hooks to get data
  const { organizations, isLoading: orgsLoading } = useOrganizations({})
  const { filteredCount, isLoading: devicesLoading } = useDevices({})
  const { totalElements, isLoading: usersLoading, fetchUsers } = useUsers()
  const { fetchAvailableProviders, fetchProviderConfig } = useSsoConfig()

  const [ssoProvidersCount, setSsoProvidersCount] = useState(0)
  const [ssoLoading, setSsoLoading] = useState(false)

  // Fetch SSO providers once on mount and check which are active
  useEffect(() => {
    setSsoLoading(true)
    fetchAvailableProviders()
      .then(async (providers) => {
        // Fetch config for each provider to check enabled status
        const configs = await Promise.all(
          providers.map(p => fetchProviderConfig(p.provider))
        )
        // Count only providers that are enabled
        const activeCount = configs.filter(cfg => cfg?.enabled === true).length
        setSsoProvidersCount(activeCount)
        console.log('✓ SSO providers loaded:', providers.length, 'active:', activeCount)
      })
      .catch(err => {
        console.error('SSO providers fetch failed:', err)
        setSsoProvidersCount(0)
      })
      .finally(() => setSsoLoading(false))
  }, [])

  // Fetch users once on mount
  useEffect(() => {
    fetchUsers(0, 10).catch(err => {
      console.error('Users fetch failed:', err)
    })
  }, [])

  // Combined loading state
  const isLoading = orgsLoading || devicesLoading || usersLoading || ssoLoading

  // Completion status for each step
  const completionStatus = {
    'sso-configuration': ssoProvidersCount > 0,
    'organizations-setup': organizations.length > 1,
    'device-management': filteredCount > 0,
    'company-and-team': totalElements > 1
  }

  // Log completion status
  useEffect(() => {
    if (!isLoading) {
      console.log('📊 Onboarding completion status:', completionStatus)
    }
  }, [isLoading, ssoProvidersCount, organizations.length, filteredCount, totalElements])

  return {
    completionStatus,
    isLoading
  }
}
