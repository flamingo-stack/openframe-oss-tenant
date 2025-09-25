'use client'

import { AppLayout } from '../../../components/app-layout'
import { EditScriptPage } from '../../components/edit-script-page'
import { useParams } from 'next/navigation'

export default function EditScriptPageWrapper() {
  const params = useParams<{ id?: string }>()
  const rawId = params?.id
  const id = rawId === 'new' ? null : (typeof rawId === 'string' ? rawId : null)
  return (
    <AppLayout>
      <EditScriptPage scriptId={typeof id === 'string' ? id : null} />
    </AppLayout>
  )
}

