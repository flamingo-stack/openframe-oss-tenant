'use client'

import { AppLayout } from '../../../components/app-layout'
import { ScriptDetailsView } from '../../components/script-details-view'
import { useParams } from 'next/navigation'

export default function ScriptDetailsPage() {
  const params = useParams<{ id?: string }>()
  const id = typeof params?.id === 'string' ? params.id : ''
  return (
    <AppLayout>
      <ScriptDetailsView scriptId={id} />
    </AppLayout>
  )
}
