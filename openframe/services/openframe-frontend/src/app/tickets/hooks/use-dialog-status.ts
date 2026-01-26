'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'
import { DialogStatus } from '../types/dialog.types'

interface UpdateStatusResponse {
  success: boolean
  dialog?: {
    id: string
    status: DialogStatus
  }
  error?: string
}

export function useDialogStatus() {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)

  const updateDialogStatus = useCallback(async (dialogId: string, status: DialogStatus): Promise<boolean> => {
    if (isUpdating) return false
    
    setIsUpdating(true)
    
    try {
      const response = await apiClient.patch<UpdateStatusResponse>(
        `/chat/api/v1/dialogs/${dialogId}/status`,
        { status }
      )

      if (!response.ok) {
        throw new Error(response.error || `Failed to update dialog status`)
      }

      toast({
        title: 'Success',
        description: `Dialog ${status === 'ON_HOLD' ? 'put on hold' : status === 'RESOLVED' ? 'resolved' : 'status updated'} successfully`,
        variant: 'success',
        duration: 3000
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update dialog status'
      console.error('Failed to update dialog status:', error)
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      })

      return false
    } finally {
      setIsUpdating(false)
    }
  }, [isUpdating, toast])

  const putOnHold = useCallback(async (dialogId: string) => {
    return updateDialogStatus(dialogId, 'ON_HOLD')
  }, [updateDialogStatus])

  const resolve = useCallback(async (dialogId: string) => {
    return updateDialogStatus(dialogId, 'RESOLVED')
  }, [updateDialogStatus])

  const activate = useCallback(async (dialogId: string) => {
    return updateDialogStatus(dialogId, 'ACTIVE')
  }, [updateDialogStatus])

  return {
    updateDialogStatus,
    putOnHold,
    resolve,
    activate,
    isUpdating
  }
}