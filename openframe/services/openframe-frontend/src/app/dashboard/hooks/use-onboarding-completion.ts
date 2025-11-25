'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useOrganizations } from '../../organizations/hooks/use-organizations'
import { useDevicesOverview } from './use-dashboard-stats'
import { useSsoConfig } from '../../settings/hooks/use-sso-config'
import { useUsers } from '../../settings/hooks/use-users'

/**
 * Hook to check onboarding step completion using existing data hooks
 * Eliminates duplicate API calls by leveraging hooks already used by dashboard
 *
 * Race condition mitigations:
 * - Uses refs to track fetch state and prevent duplicate calls
 * - Includes proper loading states for all data sources
 * - Uses useCallback for stable function references
 * - Memoizes completion status to prevent unnecessary re-renders
 */
export function useOnboardingCompletion() {
  // Use existing hooks to get data
  const { organizations, isLoading: orgsLoading, fetchOrganizations } = useOrganizations({})
  const { total: deviceCount, isLoading: devicesLoading } = useDevicesOverview()
  const { totalElements, isLoading: usersLoading, fetchUsers } = useUsers()
  const { fetchAvailableProviders, fetchProviderConfig } = useSsoConfig()

  const [ssoProvidersCount, setSsoProvidersCount] = useState(0)
  const [ssoLoading, setSsoLoading] = useState(true) // Start as true to indicate initial load

  // Refs to prevent duplicate fetches and track mount state
  const ssoFetchedRef = useRef(false)
  const usersFetchedRef = useRef(false)
  const orgsFetchedRef = useRef(false)
  const isMountedRef = useRef(true)

  // Stable callback for SSO fetch
  const fetchSsoProviders = useCallback(async () => {
    if (ssoFetchedRef.current) return
    ssoFetchedRef.current = true

    setSsoLoading(true)
    try {
      const providers = await fetchAvailableProviders()

      if (!isMountedRef.current) return

      // Fetch config for each provider to check enabled status
      const configs = await Promise.all(
        providers.map(p => fetchProviderConfig(p.provider))
      )

      if (!isMountedRef.current) return

      // Count only providers that are enabled
      const activeCount = configs.filter(cfg => cfg?.enabled === true).length
      setSsoProvidersCount(activeCount)
      console.log('✓ SSO providers loaded:', providers.length, 'active:', activeCount)
    } catch (err) {
      console.error('SSO providers fetch failed:', err)
      if (isMountedRef.current) {
        setSsoProvidersCount(0)
      }
    } finally {
      if (isMountedRef.current) {
        setSsoLoading(false)
      }
    }
  }, [fetchAvailableProviders, fetchProviderConfig])

  // Stable callback for users fetch
  const fetchUsersOnce = useCallback(async () => {
    if (usersFetchedRef.current) return
    usersFetchedRef.current = true

    try {
      await fetchUsers(0, 10)
    } catch (err) {
      console.error('Users fetch failed:', err)
    }
  }, [fetchUsers])

  // Stable callback for organizations fetch
  const fetchOrgsOnce = useCallback(async () => {
    if (orgsFetchedRef.current) return
    orgsFetchedRef.current = true

    try {
      await fetchOrganizations('', {})
    } catch (err) {
      console.error('Organizations fetch failed:', err)
    }
  }, [fetchOrganizations])

  // Fetch SSO providers once on mount
  useEffect(() => {
    fetchSsoProviders()
  }, [fetchSsoProviders])

  // Fetch users once on mount
  useEffect(() => {
    fetchUsersOnce()
  }, [fetchUsersOnce])

  // Fetch organizations once on mount
  useEffect(() => {
    fetchOrgsOnce()
  }, [fetchOrgsOnce])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Combined loading state - includes all data sources
  const isLoading = orgsLoading || devicesLoading || usersLoading || ssoLoading

  // Memoize completion status to prevent unnecessary re-renders and recalculations
  const completionStatus = useMemo(() => ({
    'sso-configuration': ssoProvidersCount > 0,
    'organizations-setup': organizations.length > 1,
    'device-management': deviceCount > 0,
    'company-and-team': totalElements > 1
  }), [ssoProvidersCount, organizations.length, deviceCount, totalElements])

  // Log completion status only when loading completes
  useEffect(() => {
    if (!isLoading) {
      console.log('📊 Onboarding completion status:', completionStatus)
      console.log('📊 Raw values - orgs:', organizations.length, 'users:', totalElements, 'devices:', deviceCount, 'sso:', ssoProvidersCount)
    }
  }, [isLoading, completionStatus, organizations.length, totalElements, deviceCount, ssoProvidersCount])

  return {
    completionStatus,
    isLoading
  }
}
