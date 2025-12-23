'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'
import { Dialog } from '../types/dialog.types'

export function useArchiveResolved() {
  const { toast } = useToast()
  const [isArchiving, setIsArchiving] = useState(false)

  const archiveResolvedDialogs = useCallback(async (dialogs: Dialog[]): Promise<boolean> => {
    const resolvedDialogs = dialogs.filter(d => d.status === 'RESOLVED')
    
    if (resolvedDialogs.length === 0) {
      toast({
        title: 'No Resolved Dialogs',
        description: 'There are no resolved dialogs to archive',
        variant: 'info',
        duration: 3000
      })
      return false
    }

    setIsArchiving(true)
    
    try {
      const archivePromises = resolvedDialogs.map(dialog => 
        apiClient.patch(`/chat/api/v1/dialogs/${dialog.id}/status`, { status: 'ARCHIVED' })
      )

      const results = await Promise.allSettled(archivePromises)
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
      const failCount = results.length - successCount

      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `${successCount} dialog${successCount > 1 ? 's' : ''} archived successfully${failCount > 0 ? ` (${failCount} failed)` : ''}`,
          variant: 'success',
          duration: 4000
        })
      }

      if (failCount > 0 && successCount === 0) {
        toast({
          title: 'Error',
          description: `Failed to archive ${failCount} dialog${failCount > 1 ? 's' : ''}`,
          variant: 'destructive',
          duration: 5000
        })
        return false
      }

      return successCount > 0
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive resolved dialogs'
      console.error('Failed to archive resolved dialogs:', error)
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      })

      return false
    } finally {
      setIsArchiving(false)
    }
  }, [toast])

  return {
    archiveResolvedDialogs,
    isArchiving
  }
}