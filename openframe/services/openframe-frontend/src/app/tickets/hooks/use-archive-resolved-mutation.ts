'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'
import { Dialog } from '../types/dialog.types'
import { dialogsQueryKeys, invalidateAllDialogs } from '../utils/query-keys'

export function useArchiveResolvedMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dialogs: Dialog[]): Promise<{ successCount: number; failCount: number }> => {
      const resolvedDialogs = dialogs.filter(d => d.status === 'RESOLVED')
      
      if (resolvedDialogs.length === 0) {
        throw new Error('No resolved dialogs to archive')
      }

      const archivePromises = resolvedDialogs.map(dialog => 
        apiClient.patch(`/chat/api/v1/dialogs/${dialog.id}/status`, { status: 'ARCHIVED' })
      )

      const results = await Promise.allSettled(archivePromises)
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
      const failCount = results.length - successCount

      return { successCount, failCount }
    },

    onMutate: async (dialogs: Dialog[]) => {
      const resolvedDialogIds = dialogs
        .filter(d => d.status === 'RESOLVED')
        .map(d => d.id)

      if (resolvedDialogIds.length === 0) return

      await queryClient.cancelQueries({ queryKey: dialogsQueryKeys.lists() })

      const previousQueries = queryClient.getQueriesData({ queryKey: dialogsQueryKeys.lists() })

      queryClient.setQueriesData({ queryKey: dialogsQueryKeys.lists() }, (oldData: any) => {
        if (!oldData?.dialogs) return oldData

        return {
          ...oldData,
          dialogs: oldData.dialogs.filter((dialog: Dialog) => !resolvedDialogIds.includes(dialog.id))
        }
      })

      return { previousQueries }
    },

    onError: (error, dialogs, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, previousData]) => {
          queryClient.setQueryData(queryKey, previousData)
        })
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to archive resolved dialogs'
      console.error('Failed to archive resolved dialogs:', error)
      
      if (errorMessage === 'No resolved dialogs to archive') {
        toast({
          title: 'No Resolved Dialogs',
          description: 'There are no resolved dialogs to archive',
          variant: 'info',
          duration: 3000
        })
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000
        })
      }
    },

    onSuccess: ({ successCount, failCount }) => {
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
      }
    },

    onSettled: () => {
      invalidateAllDialogs(queryClient)
    }
  })
}