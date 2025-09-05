'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '../components/app-layout'
import { LogDetailsView } from './components/log-details-view'

export default function LogDetailsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [logId, setLogId] = useState<string | null>(null)
  const [ingestDay, setIngestDay] = useState<string | null>(null)
  const [toolType, setToolType] = useState<string | null>(null)
  const [eventType, setEventType] = useState<string | null>(null)
  const [timestamp, setTimestamp] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('id')
    const day = searchParams.get('ingestDay')
    const type = searchParams.get('toolType')
    const event = searchParams.get('eventType')
    const time = searchParams.get('timestamp')
    
    if (id && day && type && event && time) {
      setLogId(id)
      setIngestDay(day)
      setToolType(type)
      setEventType(event)
      setTimestamp(time)
    } else {
      // Redirect to logs page if required parameters are missing
      router.replace('/logs-page')
    }
  }, [searchParams, router])

  if (!logId || !ingestDay || !toolType || !eventType || !timestamp) {
    return null // Will redirect in useEffect
  }

  return (
    <AppLayout>
      <LogDetailsView logId={logId} ingestDay={ingestDay} toolType={toolType} eventType={eventType} timestamp={timestamp} />
    </AppLayout>
  )
}