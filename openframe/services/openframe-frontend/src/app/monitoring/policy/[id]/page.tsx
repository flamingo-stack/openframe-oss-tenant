'use client'

import { AppLayout } from '../../../components/app-layout'
import { PolicyDetailsView } from '../components/policy-details-view'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PolicyPageWrapper() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const rawId = params?.id

  useEffect(() => {
    if (rawId === 'new') {
      router.replace('/monitoring/policy/edit/new')
    }
  }, [rawId, router])

  if (rawId === 'new') {
    return null
  }

  return (
    <AppLayout>
      <PolicyDetailsView policyId={rawId || ''} />
    </AppLayout>
  )
}
