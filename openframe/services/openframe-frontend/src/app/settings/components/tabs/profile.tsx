'use client'

import React, { useEffect, useState } from 'react'
import { InfoRow, CardLoader, PageError, ListPageContainer } from '@flamingo/ui-kit/components/ui'
import { apiClient } from '@/src/lib/api-client'

type MeResponse = {
  authenticated: boolean
  user?: {
    id: string
    roles: string[]
    email: string
    displayName?: string
    tenantId?: string
  }
}

export function ProfileTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<MeResponse['user'] | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await apiClient.me<MeResponse>()
        if (!res.ok || !res.data?.authenticated || !res.data.user) {
          throw new Error(res.error || `Failed to load profile (${res.status})`)
        }
        if (active) setUser(res.data.user)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load profile')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (isLoading) {
    return <div className='p-6'><CardLoader items={1} /></div>
  }
  if (error) {
    return <div className='p-6'><PageError message={error} /></div>
  }

  return (
    <ListPageContainer title='Profile Details' background='default' padding='none' className='pt-6'>
      <div className='bg-ods-card border border-ods-border rounded-lg'>
        <div className='divide-y divide-ods-border'>
          <div className='p-4 sm:p-6'>
            <InfoRow label='Display Name' value={user?.displayName || '—'} />
          </div>
          <div className='p-4 sm:p-6'>
            <InfoRow label='Email' value={user?.email || '—'} />
          </div>
          <div className='p-4 sm:p-6'>
            <InfoRow label='Roles' value={(user?.roles || []).join(', ') || '—'} />
          </div>
        </div>
      </div>
    </ListPageContainer>
  )
}


