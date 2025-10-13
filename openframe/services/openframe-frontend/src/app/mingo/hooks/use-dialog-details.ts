'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@lib/api-client'
import { GET_DIALOG_QUERY } from '../queries/dialogs-queries'
import type { Dialog } from '../types/dialog.types'

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

interface DialogResponse {
  dialog: Dialog
}

export function useDialogDetails(dialogId: string) {
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDialog = useCallback(async () => {
    if (!dialogId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.post<GraphQLResponse<DialogResponse>>('/api/graphql', {
        query: GET_DIALOG_QUERY,
        variables: { id: dialogId }
      })
      if (!res.ok) {
        throw new Error(res.error || `Request failed with status ${res.status}`)
      }
      const d = res.data?.data?.dialog || null
      setDialog(d || null)
      return d
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch dialog'
      setError(msg)
      setDialog(null)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [dialogId])

  useEffect(() => {
    fetchDialog().catch(() => {})
  }, [fetchDialog])

  return { dialog, isLoading, error, refresh: fetchDialog }
}
