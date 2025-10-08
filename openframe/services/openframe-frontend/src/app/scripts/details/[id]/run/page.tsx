'use client'

import { AppLayout } from '../../../../components/app-layout'
import RunScriptView from '../../../components/run-script-view'
import { useParams } from 'next/navigation'

export default function RunScriptPage() {
  const params = useParams<{ id?: string }>()
  const id = typeof params?.id === 'string' ? params.id : ''
  return (
    <AppLayout>
      <RunScriptView scriptId={id} />
    </AppLayout>
  )
}


