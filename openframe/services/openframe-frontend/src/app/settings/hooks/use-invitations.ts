'use client'

import { useCallback } from 'react'
import { apiClient } from '../../../lib/api-client'

export function useInvitations() {
  const inviteUsers = useCallback(async (emails: string[]) => {
    const trimmed = emails
      .map((e) => e.trim())
      .filter((e) => e.length > 0)

    if (trimmed.length === 0) return

    // Backend accepts a single email per request; send concurrently
    const results = await Promise.all(
      trimmed.map(async (email) => ({ email, res: await apiClient.post('api/invitations', { email }) }))
    )

    const errors = results.filter(r => !r.res.ok).map(r => r.email)

    if (errors.length) {
      throw new Error(`Failed to invite: ${errors.join(', ')}`)
    }
  }, [])

  return { inviteUsers }
}


